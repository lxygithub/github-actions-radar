/** 本地生成一份「示例预览」到 preview/，用来检查历史归档页的效果。
 *  与真实数据无关：workflow 只发布 site/，不会碰 preview/。
 *  用法：node scripts/preview.mjs，然后双击 preview/index.html
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderReport, renderArchive, renderSettings } from "./render.mjs";
import { normalizeConfig } from "./rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "preview");

const TEMPLATES = [
  {
    fullName: "night-owl/ziwei-engine", owner: "night-owl", name: "ziwei-engine",
    language: "TypeScript", license: "MIT", direction: "玄学命理", score: 93, grade: "S",
    intro: "紫微斗数排盘引擎，提供完整的命盘算法与古籍格局知识库，可输出十四主星与四化盘面。",
    what: "包一层网页界面，输个生日点两下，盘面自己出来", who: "做命理内容的人：有流量，但缺好用的工具",
    how: "做成带界面的成品，按份卖，附中文说明", risk: "古籍知识库授权需单独核实",
  },
  {
    fullName: "solo-dev/seo-kit-cn", owner: "solo-dev", name: "seo-kit-cn",
    language: "Python", license: "Apache-2.0", direction: "SEO 流量", score: 86, grade: "A",
    intro: "一套英文 SEO 审计指令与脚本，用于站点体检、关键词拓展和竞品页面差距分析。",
    what: "把英文指令翻成中文版，再补一份行业词表", who: "中小电商站点运营，买不起 SaaS 订阅",
    how: "中文指令包 + 部署文档，按站点授权", risk: "依赖第三方搜索接口，稳定性不定",
  },
  {
    fullName: "tiny-tools/local-llm-ui", owner: "tiny-tools", name: "local-llm-ui",
    language: "JavaScript", license: "GPL-3.0", direction: "通用工具", score: 72, grade: "B",
    intro: "给本地大模型用的极简网页界面，支持多模型切换、会话保存与提示词模板。",
    what: "界面中文化，预置几个常见场景", who: "想有自己工具、又不会配置环境的人",
    how: "收部署费，远程帮客户装好", risk: "GPL 许可证，闭源商用前必须确认合规",
  },
  {
    fullName: "shop-lab/cross-border-helper", owner: "shop-lab", name: "cross-border-helper",
    language: "TypeScript", license: "MIT", direction: "电商", score: 81, grade: "A",
    intro: "跨境电商批量处理工具，含表格导入、汇率换算与商品 listing 文案生成。",
    what: "补一份中文上手教程和批量导入模板", who: "跨境小卖家，需要能直接用的表格工具",
    how: "模板 + 教程打包，按份交付", risk: "平台规则变动可能导致接口失效",
  },
];

const BREAKDOWN = {
  "许可证": 25, "上手成本": 20, "中文友好": 15, "需求真实": 16,
  "交付轻重": 10, "时效红利": 6, "可接手度": 1,
};

function makeReport(date, offset) {
  const picks = TEMPLATES.slice(0, 3 + (offset % 2)).map((t, i) => ({
    ...t,
    url: `https://github.com/${t.fullName}`,
    description: `${t.name} 的中文示例描述`,
    stars: 13690 - i * 2100 - offset * 310,
    todayStars: 912 - i * 130 - offset * 40,
    openIssues: 300, sizeKb: 2048, createdAt: "2026-10-20T00:00:00Z",
    pushedAt: `${date}T00:00:00Z`, topics: ["中文", t.direction], isOrg: false,
    defaultBranch: "main", readmeHead: "示例 README 内容",
    score: t.score - offset, grade: t.grade, breakdown: BREAKDOWN,
    revisit: i === 2 && offset === 2,
    landing: {
      intro: t.intro,
      plain: `一句说人话：${t.name} 解决的是很具体的小问题`,
      what: t.what, who: t.who, how: t.how,
      hours: "1–3 天（待人工核实）", risk: t.risk,
    },
  }));
  return {
    date, generatedAt: `${date}T00:02:00.000Z`,
    scanned: 71 - offset * 3,
    rejected: [
      { name: "public-apis/public-apis", url: "https://github.com/public-apis/public-apis", reason: "纯清单 / 合集型仓库" },
      { name: "someone/skills-collection", url: "https://github.com/someone/skills-collection", reason: "分数 35 未达 60 线" },
    ],
    picks,
    aiUsed: true, aiModel: "@cf/zai-org/glm-4.7-flash", aiError: null,
  };
}

const dates = ["2026-11-10", "2026-11-09", "2026-11-08"];
const history = dates.map((d, i) => makeReport(d, i));

await fs.mkdir(path.join(OUT, "reports"), { recursive: true });
await fs.copyFile(path.join(ROOT, "site", "favicon.svg"), path.join(OUT, "favicon.svg"));
for (const d of history) {
  await fs.writeFile(path.join(OUT, "reports", `${d.date}.html`), renderReport(d));
}
await fs.writeFile(path.join(OUT, "index.html"), renderArchive(history));

// 设置页明文预览：同样内联 rules.mjs，可直接试滑块与实时重算
const config = normalizeConfig(JSON.parse(await fs.readFile(path.join(ROOT, "radar.config.json"), "utf8")));
const rulesSource = await fs.readFile(path.join(ROOT, "scripts", "rules.mjs"), "utf8");
const pool = {
  date: dates[0],
  repos: history.flatMap((d) => d.picks.map((p) => ({ ...p, readmeHead: String(p.readmeHead || "").slice(0, 400) }))),
};
await fs.writeFile(path.join(OUT, "settings.html"), renderSettings({
  config, defaultConfig: config, rulesSource, pool, repo: "lxygithub/github-actions-radar",
}));
console.log(`示例预览已生成：${path.join(OUT, "index.html")}（${history.length} 天 / ${history.reduce((s, d) => s + d.picks.length, 0)} 个项目）+ 设置页`);
