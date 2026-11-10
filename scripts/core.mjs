/** 数据采集 + 六维打分 + 四条红线 + 冷却账本。
 *  零依赖，Node 22 原生 fetch。与 cloudflare-git-radar/ 的评分口径保持一致。 */

const DAY = 86_400_000;
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (now, n) => iso(new Date(now.getTime() - n * DAY));

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

/** GitHub 没有官方 Trending API：三条 Search 查询并集去重，近似「涨星最快 + 近 30 天新冒头」 */
export async function collectCandidates(token, now) {
  const queries = [
    `created:>=${daysAgo(now, 30)} stars:>=50`,
    `pushed:>=${daysAgo(now, 7)} stars:>=1000`,
    `created:>=${daysAgo(now, 180)} stars:>=500`,
  ];
  const batches = await Promise.all(
    queries.map(async (q) => {
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

const CJK = /[\u4e00-\u9fff]/g;
export function cjkRatio(text) {
  const chars = (text ?? "").replace(/\s/g, "");
  if (!chars.length) return 0;
  const hits = chars.match(CJK);
  return (hits ? hits.length : 0) / chars.length;
}

const LIST_NAME = /(^|[-_])(awesome|list|collection|resources|cheatsheet|roadmap|interview|notes)([-_]|$)/i;
const LIST_DESC = /(curated (list|collection)|a list of|awesome list|清单|合集|大全|资料汇总|资源导航|速查表)/i;
const RISK = /(jailbreak|bypass|crack(ed|ing)?|keygen|piracy|unban|spoof|anti.?detect|破解|绕过|破甲|越狱|脱壳|激活码|外挂)/i;
const HEAVY = /(gpu|cuda|multi.?gpu|8\s*x\s*a100|cluster|distributed inference|tensor.?parallel|显卡|集群|分布式推理|vllm)/i;
const INFRA = /(framework|compiler|\bsdk\b|toolkit|runtime|infrastructure|框架|编译器|开发工具包|底层库)/i;
const VERTICAL = /(命理|紫微|八字|风水|塔罗|占星|seo|电商|跨境|财务|报税|医疗|法律|教育|客服|营销|招聘|房产|剪辑|翻译)/i;

const DIRECTIONS = [
  [/命理|紫微|八字|风水|塔罗|占星/, "玄学命理"],
  [/seo|搜索优化/, "SEO 流量"],
  [/电商|跨境|shopify|独立站/, "电商"],
  [/财务|记账|报税|invoice/, "财务"],
  [/医疗|健康|病历/, "医疗健康"],
  [/教育|教学|题库/, "教育"],
  [/剪辑|视频|设计/, "内容创作"],
];

function detectDirection(text) {
  for (const [re, name] of DIRECTIONS) if (re.test(text)) return name;
  return "通用工具";
}

export function hardFilter(r, now) {
  const pushed = Date.parse(r.pushedAt);
  if (pushed && now.getTime() - pushed > 365 * DAY) return "一年以上未提交";
  if (r.stars < 50) return "星数不足 50";
  const text = `${r.name} ${r.description}`;
  if (LIST_NAME.test(r.name) || LIST_DESC.test(text)) return "纯清单 / 合集型仓库";
  if (RISK.test(`${text} ${r.topics.join(" ")} ${r.readmeHead}`)) return "合规红线：破解 / 绕过类";
  return null;
}

function licenseScore(id) {
  const s = (id || "NONE").toUpperCase();
  if (/^(MIT|APACHE-2\.0|BSD-[23]-CLAUSE|ISC|UNLICENSE|0BSD|ZLIB|CC0-1\.0)$/.test(s)) return 25;
  if (/^(MPL-2\.0|LGPL|EPL|EUPL|CDDL)/.test(s)) return 12;
  if (/^AGPL/.test(s)) return 0;
  if (/^GPL/.test(s)) return 5;
  if (s === "NONE" || s === "NOASSERTION") return 3;
  return 8;
}

function langScore(l) {
  const table = {
    Python: 20, JavaScript: 20, TypeScript: 20,
    Go: 16, Java: 16, "C#": 16, PHP: 16, Ruby: 16, Swift: 16, Kotlin: 16,
    Rust: 12, "C++": 10, C: 10,
  };
  return table[l] ?? 8;
}

export function scoreRepo(r, now) {
  const bd = {};
  bd["许可证"] = licenseScore(r.license);
  bd["上手成本"] = langScore(r.language);
  // 原文三项 8+7+3=18 会超过该维度 15 分上限，钳到 15
  bd["中文友好"] = Math.min(
    15,
    (cjkRatio(r.description) > 0.15 ? 8 : 0) +
      (cjkRatio(r.readmeHead) > 0.08 ? 7 : 0) +
      (r.topics.some((t) => cjkRatio(t) > 0) ? 3 : 0),
  );
  const ratio = r.stars > 0 ? r.openIssues / r.stars : 0;
  bd["需求真实"] = ratio >= 0.02 ? 20 : ratio >= 0.005 ? 16 : 6;
  bd["交付轻重"] = r.sizeKb <= 5120 ? 10 : r.sizeKb <= 20480 ? 7 : r.sizeKb <= 102400 ? 4 : 2;
  const ageDays = (now.getTime() - Date.parse(r.createdAt)) / DAY;
  bd["时效红利"] = ageDays <= 30 ? 10 : ageDays <= 90 ? 6 : ageDays <= 180 ? 2 : 1;

  const text = `${r.name} ${r.description} ${r.topics.join(" ")} ${r.readmeHead}`;
  let handoff = 0;
  if (HEAVY.test(text)) handoff -= 12;
  if (INFRA.test(text)) handoff -= 6;
  if (r.stars > 20000 && r.isOrg) handoff -= 8;
  if (VERTICAL.test(text)) handoff += 8;
  bd["可接手度"] = Math.max(-12, Math.min(8, handoff));

  const score = Math.max(0, Math.min(100, Math.round(Object.values(bd).reduce((a, b) => a + b, 0))));
  const grade = score >= 90 ? "S" : score >= 80 ? "A" : score >= 65 ? "B" : "C";
  return { ...r, score, grade, breakdown: bd, direction: detectDirection(text) };
}

function cooldown(ledger, r, now) {
  const hit = ledger[r.fullName];
  if (hit && now.getTime() - Date.parse(hit.date) < 7 * DAY) return true;
  if (r.direction !== "通用工具") {
    return Object.values(ledger).some(
      (v) => v.direction === r.direction && now.getTime() - Date.parse(v.date) < 14 * DAY,
    );
  }
  return false;
}

/** 项目 7 天冷却、垂类方向 14 天冷却；不够 8 个时放宽方向冷却并标「回看」 */
export function select(pool, ledger, now, max, minScore) {
  const rejected = [];
  const eligible = pool.filter((r) => {
    if (r.score < minScore) {
      rejected.push({ name: r.fullName, url: r.url, reason: `分数 ${r.score} 未达 ${minScore} 线` });
      return false;
    }
    return true;
  });
  const picks = eligible.filter((r) => !cooldown(ledger, r, now)).slice(0, max);
  const revisit = new Set();
  const chosen = new Set(picks.map((p) => p.fullName));
  if (picks.length < max) {
    for (const r of eligible) {
      if (picks.length >= max) break;
      if (chosen.has(r.fullName)) continue;
      const hit = ledger[r.fullName];
      if (hit && now.getTime() - Date.parse(hit.date) < 7 * DAY) continue;
      picks.push(r);
      chosen.add(r.fullName);
      revisit.add(r.fullName);
    }
  }
  for (const r of eligible) {
    if (!chosen.has(r.fullName)) rejected.push({ name: r.fullName, url: r.url, reason: "名额 / 冷却限制" });
  }
  return { picks, rejected, revisit };
}
