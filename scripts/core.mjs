/** GitHub 数据采集。所有筛选/打分规则已迁到 rules.mjs（Node 与设置页共用）。
 *  零依赖，Node 22 原生 fetch。 */
import { expandQueries } from "./rules.mjs";

const GH_HEADERS = (token, accept) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  Accept: accept,
  "User-Agent": "git-radar-actions/1.0",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function gh(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: GH_HEADERS(token, "application/vnd.github+json"),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function normalize(it) {
  const fullName = it.full_name ?? "";
  const [owner = "", name = ""] = fullName.split("/");
  return {
    fullName, owner, name,
    url: it.html_url ?? `https://github.com/${fullName}`,
    description: it.description ?? "",
    stars: it.stargazers_count ?? 0,
    todayStars: null,
    language: it.language ?? "Unknown",
    license: it.license?.spdx_id ?? "NONE",
    openIssues: it.open_issues_count ?? 0,
    sizeKb: it.size ?? 0,
    createdAt: it.created_at ?? "",
    pushedAt: it.pushed_at ?? "",
    topics: Array.isArray(it.topics) ? it.topics : [],
    isOrg: it.owner?.type === "Organization",
    defaultBranch: it.default_branch ?? "main",
    readmeHead: "",
  };
}

/** GitHub 没有官方 Trending API：多条 Search 查询并集去重，查询串来自 radar.config.json */
export async function collectCandidates(token, now, queries) {
  const qs = expandQueries(queries, now);
  const batches = await Promise.all(
    qs.map(async (q) => {
      try {
        const data = await gh(
          `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=50`,
          token,
        );
        return data.items ?? [];
      } catch (e) {
        console.warn("search 失败:", q, String(e));
        return [];
      }
    }),
  );
  const map = new Map();
  for (const items of batches) for (const it of items) if (it?.full_name) map.set(it.full_name, it);
  return [...map.values()].map(normalize);
}

/** 只给粗排头部抓 README，省 GitHub 配额 */
export async function attachReadmes(repos, token, concurrency = 6) {
  let cursor = 0;
  const worker = async () => {
    while (cursor < repos.length) {
      const r = repos[cursor++];
      try {
        const res = await fetch(`https://api.github.com/repos/${r.fullName}/readme`, {
          headers: GH_HEADERS(token, "application/vnd.github.raw+json"),
        });
        if (res.ok) r.readmeHead = (await res.text()).slice(0, 2000);
      } catch (e) {
        console.warn("README 失败:", r.fullName, String(e));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, repos.length) }, worker));
}

/** 跨天星数快照差分算「今日涨星」——第一天没有基准，显示为空 */
export function withStarDelta(repos, snapshot) {
  for (const r of repos) {
    const prev = snapshot[r.fullName];
    r.todayStars = typeof prev === "number" ? r.stars - prev : null;
  }
}
