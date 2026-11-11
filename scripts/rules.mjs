/** 纯函数规则层：配置归一化 + 红线 + 七维打分 + 冷却选择。
 *  零依赖、只用到 JS 内置对象，Node 与浏览器共用同一份源码
 *  （设置页会在构建时把本文件内联进去，保证预览与线上打分口径完全一致）。 */

const DAY = 86_400_000;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d, lo, hi) => clamp(Number.isFinite(Number(v)) ? Number(v) : d, lo, hi);
const bool = (v, d) => (typeof v === "boolean" ? v : d);
const str = (v, d) => (typeof v === "string" && v.trim() ? v : d);

/** 内置兜底默认：radar.config.json 缺失或字段损坏时用，正常情况以仓库配置为准 */
export const DEFAULT_CONFIG = {
  version: 1,
  collect: {
    maxCandidates: 80,
    maxReadmes: 24,
    queries: [
      "created:>={d30} stars:>=50",
      "pushed:>={d7} stars:>=1000",
      "created:>={d180} stars:>=500",
    ],
  },
  filter: { minScore: 60, maxPicks: 8, minStars: 50, maxPushedDays: 365, blockLists: true, blockRisk: true },
  cooldown: { projectDays: 7, directionDays: 14 },
  grades: { S: 90, A: 80, B: 65 },
  weights: { license: 25, language: 20, cjk: 15, demand: 20, size: 10, freshness: 10 },
  handoff: { min: -12, max: 8, heavy: -12, infra: -6, bigOrg: -8, vertical: 8, bigOrgStars: 20000 },
  thresholds: {
    cjkDesc: 0.15, cjkReadme: 0.08, issueHigh: 0.02, issueMid: 0.005,
    sizeSmallKb: 5120, sizeMidKb: 20480, sizeLargeKb: 102400,
    newDays: 30, midDays: 90, oldDays: 180,
  },
  keywords: {
    listName: "(^|[-_])(awesome|list|collection|resources|cheatsheet|roadmap|interview|notes)([-_]|$)",
    listDesc: "(curated (list|collection)|a list of|awesome list|清单|合集|大全|资料汇总|资源导航|速查表)",
    risk: "(jailbreak|bypass|crack(ed|ing)?|keygen|piracy|unban|spoof|anti.?detect|破解|绕过|破甲|越狱|脱壳|激活码|外挂)",
    heavy: "(gpu|cuda|multi.?gpu|8\\s*x\\s*a100|cluster|distributed inference|tensor.?parallel|显卡|集群|分布式推理|vllm)",
    infra: "(framework|compiler|\\bsdk\\b|toolkit|runtime|infrastructure|框架|编译器|开发工具包|底层库)",
    vertical: "(命理|紫微|八字|风水|塔罗|占星|seo|电商|跨境|财务|报税|医疗|法律|教育|客服|营销|招聘|房产|剪辑|翻译)",
  },
  directions: [
    { name: "玄学命理", pattern: "命理|紫微|八字|风水|塔罗|占星" },
    { name: "SEO 流量", pattern: "seo|搜索优化" },
    { name: "电商", pattern: "电商|跨境|shopify|独立站" },
    { name: "财务", pattern: "财务|记账|报税|invoice" },
    { name: "医疗健康", pattern: "医疗|健康|病历" },
    { name: "教育", pattern: "教育|教学|题库" },
    { name: "内容创作", pattern: "剪辑|视频|设计" },
  ],
  fallbackDirection: "通用工具",
};

/** 深合并 + 类型/范围钳制。用户从设置页导出的 JSON 一定先过这一层，
 *  非法正则、负数权重、超长数组都不会让定时任务崩掉。 */
export function normalizeConfig(raw) {
  const d = DEFAULT_CONFIG;
  const r = raw && typeof raw === "object" ? raw : {};
  const c = r.collect || {}, f = r.filter || {}, cd = r.cooldown || {}, g = r.grades || {};
  const w = r.weights || {}, h = r.handoff || {}, t = r.thresholds || {}, k = r.keywords || {};
  const weights = {
    license: num(w.license, d.weights.license, 0, 100),
    language: num(w.language, d.weights.language, 0, 100),
    cjk: num(w.cjk, d.weights.cjk, 0, 100),
    demand: num(w.demand, d.weights.demand, 0, 100),
    size: num(w.size, d.weights.size, 0, 100),
    freshness: num(w.freshness, d.weights.freshness, 0, 100),
  };
  if (Object.values(weights).reduce((a, b) => a + b, 0) <= 0) Object.assign(weights, d.weights);
  const queries = (Array.isArray(c.queries) ? c.queries : [])
    .filter((q) => typeof q === "string" && q.trim()).slice(0, 8).map((q) => q.trim());
  const directions = (Array.isArray(r.directions) ? r.directions : [])
    .filter((x) => x && typeof x.name === "string" && typeof x.pattern === "string" && x.name.trim())
    .slice(0, 30).map((x) => ({ name: x.name.trim(), pattern: x.pattern }));

  return {
    version: 1,
    collect: {
      maxCandidates: num(c.maxCandidates, d.collect.maxCandidates, 1, 500),
      maxReadmes: num(c.maxReadmes, d.collect.maxReadmes, 0, 100),
      queries: queries.length ? queries : d.collect.queries.slice(),
    },
    filter: {
      minScore: num(f.minScore, d.filter.minScore, 0, 100),
      maxPicks: num(f.maxPicks, d.filter.maxPicks, 1, 50),
      minStars: num(f.minStars, d.filter.minStars, 0, 100000),
      maxPushedDays: num(f.maxPushedDays, d.filter.maxPushedDays, 1, 3650),
      blockLists: bool(f.blockLists, d.filter.blockLists),
      blockRisk: bool(f.blockRisk, d.filter.blockRisk),
    },
    cooldown: {
      projectDays: num(cd.projectDays, d.cooldown.projectDays, 0, 365),
      directionDays: num(cd.directionDays, d.cooldown.directionDays, 0, 365),
    },
    grades: {
      S: num(g.S, d.grades.S, 0, 100),
      A: num(g.A, d.grades.A, 0, 100),
      B: num(g.B, d.grades.B, 0, 100),
    },
    weights,
    handoff: {
      min: num(h.min, d.handoff.min, -100, 0),
      max: num(h.max, d.handoff.max, 0, 100),
      heavy: num(h.heavy, d.handoff.heavy, -100, 0),
      infra: num(h.infra, d.handoff.infra, -100, 0),
      bigOrg: num(h.bigOrg, d.handoff.bigOrg, -100, 0),
      vertical: num(h.vertical, d.handoff.vertical, 0, 100),
      bigOrgStars: num(h.bigOrgStars, d.handoff.bigOrgStars, 0, 10000000),
    },
    thresholds: {
      cjkDesc: num(t.cjkDesc, d.thresholds.cjkDesc, 0, 1),
      cjkReadme: num(t.cjkReadme, d.thresholds.cjkReadme, 0, 1),
      issueHigh: num(t.issueHigh, d.thresholds.issueHigh, 0, 1),
      issueMid: num(t.issueMid, d.thresholds.issueMid, 0, 1),
      sizeSmallKb: num(t.sizeSmallKb, d.thresholds.sizeSmallKb, 1, 10000000),
      sizeMidKb: num(t.sizeMidKb, d.thresholds.sizeMidKb, 1, 10000000),
      sizeLargeKb: num(t.sizeLargeKb, d.thresholds.sizeLargeKb, 1, 10000000),
      newDays: num(t.newDays, d.thresholds.newDays, 1, 3650),
      midDays: num(t.midDays, d.thresholds.midDays, 1, 3650),
      oldDays: num(t.oldDays, d.thresholds.oldDays, 1, 3650),
    },
    keywords: {
      listName: str(k.listName, d.keywords.listName),
      listDesc: str(k.listDesc, d.keywords.listDesc),
      risk: str(k.risk, d.keywords.risk),
      heavy: str(k.heavy, d.keywords.heavy),
      infra: str(k.infra, d.keywords.infra),
      vertical: str(k.vertical, d.keywords.vertical),
    },
    directions: directions.length ? directions : d.directions.map((x) => ({ ...x })),
    fallbackDirection: str(r.fallbackDirection, d.fallbackDirection),
  };
}

export function cjkRatio(text) {
  const chars = String(text ?? "").replace(/\s/g, "");
  if (!chars.length) return 0;
  const hits = chars.match(/[\u4e00-\u9fff]/g);
  return (hits ? hits.length : 0) / chars.length;
}

/** 把查询里的 {dN} 占位符展开成 YYYY-MM-DD（N 天前） */
export function expandQueries(queries, now) {
  const iso = (d) => d.toISOString().slice(0, 10);
  return queries.map((q) => q.replace(/\{d(\d+)\}/g, (_, n) =>
    iso(new Date(now.getTime() - Number(n) * DAY))));
}

function safeRe(src, fallback) {
  try { return new RegExp(src, "i"); }
  catch { try { return new RegExp(fallback, "i"); } catch { return /(?!)/; } }
}

const DIM_MAX = { license: 25, language: 20, cjk: 15, demand: 20, size: 10, freshness: 10 };
const DIM_LABEL = {
  license: "许可证", language: "上手成本", cjk: "中文友好",
  demand: "需求真实", size: "交付轻重", freshness: "时效红利",
};

function licenseScore(id) {
  const s = String(id || "NONE").toUpperCase();
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

/** 用一份配置编译出整套规则函数。设置页每次改参数都会重新编译一份做实时预览。 */
export function createRules(rawCfg) {
  const cfg = normalizeConfig(rawCfg);
  const K = cfg.keywords, D = DEFAULT_CONFIG.keywords;
  const re = {
    listName: safeRe(K.listName, D.listName),
    listDesc: safeRe(K.listDesc, D.listDesc),
    risk: safeRe(K.risk, D.risk),
    heavy: safeRe(K.heavy, D.heavy),
    infra: safeRe(K.infra, D.infra),
    vertical: safeRe(K.vertical, D.vertical),
  };
  const dirs = cfg.directions.map((d) => ({ name: d.name, re: safeRe(d.pattern, "(?!)") }));
  const W = cfg.weights;
  const totalWeight = Object.values(W).reduce((a, b) => a + b, 0);

  const detectDirection = (text) => {
    for (const d of dirs) if (d.re.test(text)) return d.name;
    return cfg.fallbackDirection;
  };

  const hardFilter = (r, now) => {
    const pushed = Date.parse(r.pushedAt);
    if (pushed && now.getTime() - pushed > cfg.filter.maxPushedDays * DAY) {
      return `超过 ${cfg.filter.maxPushedDays} 天未提交`;
    }
    if (r.stars < cfg.filter.minStars) return `星数不足 ${cfg.filter.minStars}`;
    const text = `${r.name} ${r.description}`;
    if (cfg.filter.blockLists && (re.listName.test(r.name) || re.listDesc.test(text))) {
      return "纯清单 / 合集型仓库";
    }
    if (cfg.filter.blockRisk && re.risk.test(`${text} ${(r.topics || []).join(" ")} ${r.readmeHead || ""}`)) {
      return "合规红线：破解 / 绕过类";
    }
    return null;
  };

  const scoreRepo = (r, now) => {
    const T = cfg.thresholds, H = cfg.handoff;
    const desc = r.description || "", readme = r.readmeHead || "", topics = r.topics || [];
    const ratios = {
      license: licenseScore(r.license) / DIM_MAX.license,
      language: langScore(r.language) / DIM_MAX.language,
      cjk: Math.min(1, (
        (cjkRatio(desc) > T.cjkDesc ? 8 : 0) +
        (cjkRatio(readme) > T.cjkReadme ? 7 : 0) +
        (topics.some((t) => cjkRatio(t) > 0) ? 3 : 0)
      ) / 15),
      demand: (() => {
        const ratio = r.stars > 0 ? (r.openIssues || 0) / r.stars : 0;
        return (ratio >= T.issueHigh ? 20 : ratio >= T.issueMid ? 16 : 6) / DIM_MAX.demand;
      })(),
      size: (() => {
        const kb = r.sizeKb || 0;
        return (kb <= T.sizeSmallKb ? 10 : kb <= T.sizeMidKb ? 7 : kb <= T.sizeLargeKb ? 4 : 2) / DIM_MAX.size;
      })(),
      freshness: (() => {
        const age = (now.getTime() - Date.parse(r.createdAt)) / DAY;
        return (age <= T.newDays ? 10 : age <= T.midDays ? 6 : age <= T.oldDays ? 2 : 1) / DIM_MAX.freshness;
      })(),
    };

    const bd = {};
    let raw = 0;
    for (const [key, weight] of Object.entries(W)) {
      const got = ratios[key] * weight;
      bd[DIM_LABEL[key]] = Math.round(got);
      raw += got;
    }
    // 权重按总和归一化：改动权重只改变各维度重要性，minScore 始终是百分制
    let score = Math.round((raw / totalWeight) * 100);

    const text = `${r.name} ${desc} ${topics.join(" ")} ${readme}`;
    let handoff = 0;
    if (re.heavy.test(text)) handoff += H.heavy;
    if (re.infra.test(text)) handoff += H.infra;
    if (r.stars > H.bigOrgStars && r.isOrg) handoff += H.bigOrg;
    if (re.vertical.test(text)) handoff += H.vertical;
    handoff = clamp(handoff, H.min, H.max);
    bd["可接手度"] = handoff;
    score = clamp(Math.round(score + handoff), 0, 100);

    const grade = score >= cfg.grades.S ? "S" : score >= cfg.grades.A ? "A" : score >= cfg.grades.B ? "B" : "C";
    return { ...r, score, grade, breakdown: bd, direction: detectDirection(text) };
  };

  const select = (pool, ledger, now) => {
    const minScore = cfg.filter.minScore, max = cfg.filter.maxPicks;
    const rejected = [];
    const eligible = pool.filter((r) => {
      if (r.score < minScore) {
        rejected.push({ name: r.fullName, url: r.url, reason: `分数 ${r.score} 未达 ${minScore} 线` });
        return false;
      }
      return true;
    });
    const inCooldown = (r) => {
      const hit = ledger[r.fullName];
      if (hit && now.getTime() - Date.parse(hit.date) < cfg.cooldown.projectDays * DAY) return true;
      if (r.direction !== cfg.fallbackDirection) {
        return Object.values(ledger).some((v) => v.direction === r.direction
          && now.getTime() - Date.parse(v.date) < cfg.cooldown.directionDays * DAY);
      }
      return false;
    };
    const picks = eligible.filter((r) => !inCooldown(r)).slice(0, max);
    const revisit = new Set();
    const chosen = new Set(picks.map((p) => p.fullName));
    if (picks.length < max) {
      for (const r of eligible) {
        if (picks.length >= max) break;
        if (chosen.has(r.fullName)) continue;
        const hit = ledger[r.fullName];
        if (hit && now.getTime() - Date.parse(hit.date) < cfg.cooldown.projectDays * DAY) continue;
        picks.push(r);
        chosen.add(r.fullName);
        revisit.add(r.fullName);
      }
    }
    for (const r of eligible) {
      if (!chosen.has(r.fullName)) rejected.push({ name: r.fullName, url: r.url, reason: "名额 / 冷却限制" });
    }
    return { picks, rejected, revisit };
  };

  return { cfg, hardFilter, scoreRepo, select, detectDirection, totalWeight };
}
