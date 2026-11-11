/** 历史数据持久层：把 site/data/ 全量同步到独立的 radar-data 分支。
 *
 *  为什么这样做：原来 workflow 每天把日报 commit 回 main，导致
 *    ① 本地仓库总是落后，push 前必须 fetch && rebase；
 *    ② 手动重跑 / push 自动触发都会再往 main 加一条 bot commit；
 *    ③ git log 被机器提交刷屏。
 *  现在 main 只放代码，历史数据放在 radar-data 分支（一个与 main 无关的
 *  orphan 分支）。main 永远干净，数据仍然由 Git 永久留存。
 *
 *  零 npm 依赖；只用 github.token + Git Data API，不切分支、不 clone、不 force push。
 *
 *  用法（在 Actions 里由 daily.yml 调用，需要 GITHUB_TOKEN 与 contents: write）：
 *    node scripts/store.mjs pull    # 运行前：把分支上的数据恢复到 site/data
 *    node scripts/store.mjs push    # 运行后：把 site/data 全量写回分支（一次 commit）
 *
 *  可选环境变量：
 *    RADAR_DATA_BRANCH   分支名，默认 radar-data
 *    RADAR_REPO / GITHUB_REPOSITORY   owner/repo，Actions 里自动有
 *    GITHUB_TOKEN        github.token
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "site", "data");
const PREFIX = "site/data/";
const HASH_FILE = ".radar-state-hash"; // 本地标记，不会被上传（只同步 *.json）
const BRANCH = process.env.RADAR_DATA_BRANCH || "radar-data";
const REPO = process.env.RADAR_REPO || process.env.GITHUB_REPOSITORY || "";
const TOKEN = process.env.GITHUB_TOKEN || process.env.RADAR_STORE_TOKEN || "";
const API = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const JSON_FILE = /^[A-Za-z0-9._-]+\.json$/;

function die(msg) {
  throw new Error(`[store] ${msg}`);
}

async function gh(method, urlPath, body, { allow404 = false } = {}) {
  if (!REPO) die("缺少 RADAR_REPO / GITHUB_REPOSITORY，无法定位仓库");
  if (!TOKEN) die("缺少 GITHUB_TOKEN，请在 workflow 里注入 github.token");
  const url = `${API}/repos/${REPO}${urlPath}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (allow404 && res.status === 404) return null;
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 240);
    die(`${method} ${urlPath} 失败 HTTP ${res.status} ${detail}`);
  }
  return res.status === 204 ? null : res.json();
}

/** 当前数据分支的 ref sha；分支不存在返回 null */
async function currentRef() {
  const ref = await gh("GET", `/git/ref/heads/${BRANCH}`, null, { allow404: true });
  return ref?.object?.sha || null;
}

async function dataFiles() {
  const names = (await fs.readdir(DATA).catch(() => []))
    .filter((f) => JSON_FILE.test(f)).sort();
  const out = [];
  for (const name of names) {
    const content = await fs.readFile(path.join(DATA, name), "utf8");
    out.push({ name, content });
  }
  return out;
}

const digest = (files) => crypto.createHash("sha256")
  .update(files.map((f) => `${f.name}\0${f.content}\n`).join(""))
  .digest("hex");

/** 运行前恢复：把 radar-data 分支里的 site/data/*.json 写到本地。
 *  本地已有但分支上没有的文件保留（首次迁移时，main 里的历史文件就是种子）。 */
async function pull() {
  const sha = await currentRef();
  if (!sha) {
    console.log(`[store] 分支 ${BRANCH} 尚不存在，使用仓库内已有的 site/data 作为种子`);
    return;
  }
  const head = await gh("GET", `/git/commits/${sha}`);
  const tree = await gh("GET", `/git/trees/${head.tree.sha}?recursive=1`);
  if (tree.truncated) console.warn("[store] 目录树被截断，可能漏掉部分历史文件");
  const blobs = (tree.tree || []).filter((e) =>
    e.type === "blob" && e.path.startsWith(PREFIX) && JSON_FILE.test(e.path.slice(PREFIX.length)) &&
    !e.path.slice(PREFIX.length).includes("/"));
  await fs.mkdir(DATA, { recursive: true });
  for (const b of blobs) {
    const blob = await gh("GET", `/git/blobs/${b.sha}`);
    const content = Buffer.from(blob.content || "", blob.encoding === "base64" ? "base64" : "utf8").toString("utf8");
    await fs.writeFile(path.join(DATA, b.path.slice(PREFIX.length)), content);
  }
  const hash = digest(await dataFiles());
  await fs.writeFile(path.join(DATA, HASH_FILE), hash);
  console.log(`[store] 已从 ${BRANCH} 恢复 ${blobs.length} 个数据文件`);
}

/** 运行后回写：一次 Git Data API commit 写入全部数据文件（不碰 main）。 */
async function push() {
  const files = await dataFiles();
  if (!files.length) die("site/data 里没有 json 文件，拒绝写入空数据");
  const hash = digest(files);
  const oldHash = await fs.readFile(path.join(DATA, HASH_FILE), "utf8").catch(() => "");
  if (oldHash === hash) {
    console.log(`[store] 数据未变化，跳过 ${BRANCH} 回写`);
    return;
  }

  const parent = await currentRef();
  let baseTree;
  if (parent) {
    const commit = await gh("GET", `/git/commits/${parent}`);
    baseTree = commit.tree.sha;
  }
  const tree = await gh("POST", "/git/trees", {
    ...(baseTree ? { base_tree: baseTree } : {}),
    tree: files.map((f) => ({
      path: `${PREFIX}${f.name}`, mode: "100644", type: "blob", content: f.content,
    })),
  });
  const commit = await gh("POST", "/git/commits", {
    message: `data: 雷达状态 ${new Date().toISOString().slice(0, 10)}`,
    tree: tree.sha,
    parents: parent ? [parent] : [],
  });
  if (parent) {
    await gh("PATCH", `/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
  } else {
    await gh("POST", "/git/refs", { ref: `refs/heads/${BRANCH}`, sha: commit.sha });
  }
  console.log(`[store] 已写入 ${BRANCH}：${files.length} 个文件，commit ${String(commit.sha).slice(0, 7)}（main 未改动）`);
}

const cmd = process.argv[2];
if (cmd === "pull") await pull();
else if (cmd === "push") await push();
else die("用法：node scripts/store.mjs pull | push");
