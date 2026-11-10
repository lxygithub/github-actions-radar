/** 每日主流程：采集 → 红线 → 六维打分 → 冷却 → Cloudflare 免费 AI 补文案
 *  → 写日报 HTML/JSON → 重建历史归档页 → 更新账本与星数快照。
 *  零 npm 依赖：node scripts/run.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectCandidates, attachReadmes, withStarDelta, hardFilter, scoreRepo, select,
} from "./core.mjs";
import { enrich, DEFAULT_FREE_MODEL } from "./cf-ai.mjs";
import { renderReport, renderArchive } from "./render.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const DATA = path.join(SITE, "data");
const REPORTS = path.join(SITE, "reports");
const DATE_FILE = /^\d{4}-\d{2}-\d{2}\.json$/;
const MAX_READMES = 24;

async function readJSON(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch { return fallback; }
}

async function main() {
  const now = new Date();
  const date = process.env.RADAR_DATE || now.toISOString().slice(0, 10);
  const maxPicks = Number(process.env.MAX_PICKS || 8) || 8;
  const minScore = Number(process.env.MIN_SCORE || 60) || 60;
  const ghToken = process.env.RADAR_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";

  await fs.mkdir(DATA, { recursive: true });
  await fs.mkdir(REPORTS, { recursive: true });

  // 历史报告全部来自仓库里的 site/data/*.json —— Git 就是选品库的持久层
  const files = (await fs.readdir(DATA).catch(() => []))
    .filter((f) => DATE_FILE.test(f)).sort().reverse();
  const history = [];
  for (const f of files) {
    const d = await readJSON(path.join(DATA, f), null);
    if (d?.date) history.push(d);
  }
  const ledger = await readJSON(path.join(DATA, "ledger.json"), {});
  const stars = await readJSON(path.join(DATA, "stars.json"), {});

  console.log(`[${date}] 历史报告 ${history.length} 份 | GitHub token: ${ghToken ? "已配置" : "匿名 60 次/小时"}`);
  const all = await collectCandidates(ghToken, now);
  const repos = all.slice(0, 80);
  withStarDelta(repos, stars);

  const rejected = [];
  const survived = [];
  for (const r of repos) {
    const why = hardFilter(r, now);
    if (why) rejected.push({ name: r.fullName, url: r.url, reason: why });
    else survived.push(r);
  }

  const rough = survived.map((r) => scoreRepo(r, now)).sort((a, b) => b.score - a.score);
  const head = rough.slice(0, MAX_READMES).map((s) => ({ ...s }));
  await attachReadmes(head, ghToken);
  const readmeMap = new Map(head.map((h) => [h.fullName, h.readmeHead]));

  const pool = [];
  for (const r of survived) {
    const withReadme = { ...r, readmeHead: readmeMap.get(r.fullName) ?? "" };
    const why = hardFilter(withReadme, now);
    if (why) rejected.push({ name: r.fullName, url: r.url, reason: why });
    else pool.push(scoreRepo(withReadme, now));
  }
  pool.sort((a, b) => b.score - a.score);

  const { picks, rejected: softRejected, revisit } = select(pool, ledger, now, maxPicks, minScore);
  rejected.push(...softRejected);

  // 只调 Cloudflare Workers AI 免费模型；缺凭据或调用失败时自动降级模板文案
  const ai = await enrich(picks);
  console.log(`[${date}] AI: ${ai.aiUsed ? `已用 ${ai.model}` : `降级模板（${ai.error || "无项目"}）`}`);

  const report = {
    date,
    generatedAt: now.toISOString(),
    scanned: repos.length,
    rejected,
    picks: picks.map((p, i) => ({ ...p, landing: ai.landings[i], revisit: revisit.has(p.fullName) })),
    aiUsed: ai.aiUsed,
    aiModel: ai.model || DEFAULT_FREE_MODEL,
    aiError: ai.error || null,
  };

  await fs.writeFile(path.join(DATA, `${date}.json`), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(REPORTS, `${date}.html`), renderReport(report));
  const nextHistory = [report, ...history.filter((d) => d.date !== date)]
    .sort((a, b) => b.date.localeCompare(a.date));
  await fs.writeFile(path.join(SITE, "index.html"), renderArchive(nextHistory));

  for (const p of report.picks) {
    if (!p.revisit) ledger[p.fullName] = { date, direction: p.direction };
  }
  await fs.writeFile(path.join(DATA, "ledger.json"), JSON.stringify(ledger, null, 2));
  await fs.writeFile(
    path.join(DATA, "stars.json"),
    JSON.stringify(Object.fromEntries(repos.map((r) => [r.fullName, r.stars])), null, 2),
  );

  console.log(`[${date}] 完成：扫 ${report.scanned} / 排 ${rejected.length} / 留 ${report.picks.length}；归档共 ${nextHistory.length} 天`);
}

main().catch((e) => {
  console.error("雷达运行失败:", e);
  process.exit(1);
});
