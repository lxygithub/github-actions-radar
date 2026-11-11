/** 纯函数 HTML 渲染：每日独立报告 + 历史归档页（含关键词搜索的选品库）。
 *  零依赖、无外部资源，Pages 上和双击本地文件都能直接打开。 */

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC_MAP[c]);

export const anchor = (fullName) =>
  "repo-" + String(fullName).replace(/[^a-z0-9]+/gi, "-").toLowerCase();

/** 项目简介：AI 生成的中文一句 > GitHub 原始描述 > README 首段 > 兜底。
 *  历史数据里 landing.intro 不存在时会自动回退，向后兼容。 */
const clip = (s, n = 220) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const stripMarkup = (s) => String(s ?? "")
  .replace(/<[^>]*>/g, " ")
  .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
  .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/[#>*`_~|]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export function projectIntro(p) {
  const fromAI = stripMarkup(p?.landing?.intro);
  if (fromAI) return clip(fromAI);
  const desc = stripMarkup(p?.description);
  if (desc) return clip(desc);
  const readme = stripMarkup(p?.readmeHead);
  if (readme) return clip(readme);
  return `${p?.name || "这个项目"} 是一个用 ${p?.language || "开源代码"} 写的项目，仓库未提供简介。`;
}

const CSS = `
:root{--bg:#0e1117;--card:#171c26;--line:#2a3242;--fg:#e8ecf4;--muted:#9aa5b8;--accent:#7aa2ff;--good:#4ade80;--warn:#fbbf24;--chip:#202837}
body[data-theme="light"]{--bg:#f6f7f9;--card:#fff;--line:#e3e7ee;--fg:#1b2230;--muted:#6b7688;--accent:#2f6bff;--good:#0f9d58;--warn:#b45309;--chip:#eef1f6}
body[data-theme="green"]{--bg:#eef6ef;--card:#fff;--line:#d3e6d8;--fg:#1e3325;--muted:#5f7b68;--accent:#2e7d4f;--good:#16803c;--warn:#a86a00;--chip:#e2f0e6}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:880px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:22px;margin:0 0 4px;font-weight:500}
h2{font-size:16px;margin:24px 0 10px;font-weight:500}
a{color:var(--accent)}
.date{color:var(--muted);font-size:13px;margin-bottom:14px}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:18px}
.bar button,.bar a{font:inherit;font-size:12px;color:var(--muted);background:var(--chip);border:1px solid var(--line);border-radius:999px;padding:3px 11px;text-decoration:none;cursor:pointer}
.bar input,.bar select{font:inherit;font-size:13px;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:8px;padding:7px 10px;outline:none}
.bar input{flex:1;min-width:200px}
.summary,.card,.day,.item{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}
.summary{margin-bottom:18px}
.stats{display:flex;gap:22px;flex-wrap:wrap;margin-top:12px;color:var(--muted);font-size:12px}
.stats b{color:var(--fg);font-size:21px;display:block;font-weight:500}
.card,.day,.item{margin-bottom:12px}
.grade{float:right;font-weight:500;color:var(--good);font-size:14px}
.card h3,.item h3{font-size:16px;margin:0 0 6px;word-break:break-all;font-weight:500}
.card h3 a,.item h3 a{text-decoration:none}
.meta{color:var(--muted);font-size:12px;margin-bottom:8px}
.badge{display:inline-block;font-size:11px;border:1px solid var(--line);border-radius:6px;padding:1px 6px;margin:0 6px 6px 0;color:var(--muted)}
.intro{background:var(--chip);border-left:3px solid var(--accent);border-radius:0 8px 8px 0;padding:8px 11px;margin:10px 0 12px;font-size:13px;line-height:1.6;color:var(--fg);word-break:break-word}
.intro-label{display:block;color:var(--muted);font-size:11px;letter-spacing:.04em;margin-bottom:2px}
.row{margin:6px 0}
.row span{display:inline-block;min-width:64px;color:var(--muted);font-size:12px;vertical-align:top}
.risk{color:var(--warn);font-size:13px;margin-top:8px;border-top:1px dashed var(--line);padding-top:8px}
details{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:20px}
details ul{padding-left:18px;margin:8px 0 0;color:var(--muted);font-size:13px;max-height:340px;overflow:auto}
.days{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.day{margin:0}
.day a.daylink{font-size:16px;text-decoration:none;font-weight:500}
.muted{color:var(--muted);font-size:12px}
.empty{color:var(--muted);font-size:13px;padding:14px 0}
footer{color:var(--muted);font-size:12px;margin-top:26px;text-align:center}
@media(max-width:520px){.wrap{padding:16px 12px 40px}.card,.summary,.item,.day{padding:13px}.row span{display:block}}
`;

const THEME_SCRIPT = `
<script>
(function(){
  var q=new URLSearchParams(location.search).get('theme');
  var t=q||localStorage.getItem('radar-theme')||'dark';
  document.body.dataset.theme=t;
  document.querySelectorAll('[data-set-theme]').forEach(function(b){
    b.addEventListener('click',function(){
      localStorage.setItem('radar-theme',b.dataset.setTheme);
      document.body.dataset.theme=b.dataset.setTheme;
    });
  });
})();
</script>`;

const themeBar = () => `
<div class="bar">
<button data-set-theme="light">白天</button>
<button data-set-theme="green">摸鱼绿</button>
<button data-set-theme="dark">深夜</button>
</div>`;

const page = (title, body, extraScript = "", faviconHref = "favicon.svg") => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/svg+xml" href="${esc(faviconHref)}">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body data-theme="dark"><div class="wrap">
${body}
</div>${THEME_SCRIPT}${extraScript}</body></html>`;

/** 简介块：日报卡片与归档页选品库共用 */
const introBlock = (text) =>
  `<div class="intro"><span class="intro-label">项目简介</span>${esc(text)}</div>`;

export function renderReport(d) {
  const cards = d.picks.map((p, i) => {
    const badges = Object.entries(p.breakdown || {})
      .map(([k, v]) => `<span class="badge">${esc(k)} ${v > 0 ? "+" : ""}${v}</span>`).join("");
    const delta = p.todayStars === null || p.todayStars === undefined
      ? "" : ` · 今日 ${p.todayStars >= 0 ? "+" : ""}${p.todayStars} ★`;
    const l = p.landing || {};
    const intro = projectIntro(p);
    // 模板降级时 plain 就是原始英文描述，跟简介重复，不重复展示
    const plain = stripMarkup(l.plain);
    const plainRow = plain && clip(plain) !== intro
      ? `<div class="row"><span>说人话</span>${esc(plain)}</div>` : "";
    return `<article class="card" id="${anchor(p.fullName)}">
<span class="grade">${esc(p.grade)} · ${p.score}</span>
<h3>${i + 1}. <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.fullName)}</a></h3>
<div class="meta">${esc(p.owner)} · ${esc(p.language)} · ${esc(p.license)} · ★ ${p.stars}${delta} · ${esc(p.direction)}${p.revisit ? ' · <span class="badge">回看</span>' : ""}</div>
${introBlock(intro)}
<div>${badges}</div>
${plainRow}
<div class="row"><span>改哪一处</span>${esc(l.what)}</div>
<div class="row"><span>卖给谁</span>${esc(l.who)}</div>
<div class="row"><span>怎么交付</span>${esc(l.how)}</div>
<div class="row"><span>预计工时</span>${esc(l.hours)}</div>
<div class="risk">风险：${esc(l.risk)}</div>
</article>`;
  }).join("");

  const rejected = (d.rejected || []).map((r) => `<li>${esc(r.name)} — ${esc(r.reason)}</li>`).join("");
  const intro = d.picks.length ? `今晚可动手：${esc(d.picks[0]?.landing?.what || "看第一张卡")}` : "今天没筛出够格的项目，宁可不推。";
  const avg = d.picks.length ? Math.round(d.picks.reduce((s, p) => s + p.score, 0) / d.picks.length) : 0;
  const ai = d.aiUsed ? `Workers AI · ${esc(d.aiModel)}` : "模板文案（AI 未启用）";

  return page(`GitHub 副业雷达 · ${d.date}`, `
<div class="bar"><a href="../index.html">← 历史归档与选品库</a></div>
<h1>GitHub 副业雷达</h1>
<div class="date">${esc(d.date)} · 生成于 ${esc(String(d.generatedAt).replace("T", " ").slice(0, 16))} UTC</div>
${themeBar()}
<div class="summary"><div><b>${intro}</b></div>
<div class="muted" style="margin-top:6px">扫了 ${d.scanned} 个仓库，排掉 ${(d.rejected || []).length} 个，只留 ${d.picks.length} 个能写清「改哪一处 / 卖给谁 / 怎么交付」的。</div>
<div class="stats"><div><b>${d.scanned}</b>扫过</div><div><b>${(d.rejected || []).length}</b>排掉</div><div><b>${d.picks.length}</b>留下</div><div><b>${avg}</b>平均分</div></div></div>
${cards || '<div class="card">今天没有够格的项目。</div>'}
<details><summary>今天排掉了什么（${(d.rejected || []).length}）</summary><ul>${rejected || "<li>无</li>"}</ul></details>
<footer>${ai} · 数据来自 GitHub 公开 API，仅供选品参考</footer>`, "", "../favicon.svg");
}

/** 归档页：所有历史日报 + 可按关键词检索的选品库（数据内联，无 fetch，本地双击也能用） */
export function renderArchive(history) {
  const days = history.map((d) => ({
    date: d.date,
    scanned: d.scanned,
    kept: (d.picks || []).length,
    rejected: (d.rejected || []).length,
    avg: (d.picks || []).length ? Math.round(d.picks.reduce((s, p) => s + p.score, 0) / d.picks.length) : 0,
    top: d.picks?.[0]?.fullName ?? "—",
  }));
  const items = [];
  for (const d of history) {
    for (const p of d.picks || []) {
      const l = p.landing || {};
      items.push({
        date: d.date, name: p.fullName, url: p.url, score: p.score, grade: p.grade,
        direction: p.direction, language: p.language, license: p.license,
        stars: p.stars, intro: projectIntro(p),
        what: l.what || "", who: l.who || "", how: l.how || "",
        plain: l.plain || "", risk: l.risk || "", revisit: !!p.revisit,
        anchor: anchor(p.fullName),
      });
    }
  }
  const totalScanned = days.reduce((s, d) => s + d.scanned, 0);
  const totalKept = items.length;
  const avgAll = totalKept ? Math.round(items.reduce((s, i) => s + i.score, 0) / totalKept) : 0;
  const directions = [...new Set(items.map((i) => i.direction).filter(Boolean))].sort();
  const payload = JSON.stringify({ days, items }).replace(/</g, "\\u003c");

  const dayCards = days.map((d) => `<div class="day">
<a class="daylink" href="reports/${esc(d.date)}.html">${esc(d.date)}</a>
<div class="muted" style="margin:6px 0">扫 ${d.scanned} · 排 ${d.rejected} · 留 ${d.kept} · 均分 ${d.avg}</div>
<div class="muted">Top 1：${esc(d.top)}</div></div>`).join("");

  const script = `
<script id="radar-data" type="application/json">${payload}</script>
<script>
(function(){
  var data=JSON.parse(document.getElementById('radar-data').textContent);
  var q=document.getElementById('q'),dir=document.getElementById('dir'),box=document.getElementById('items');
  var count=document.getElementById('count');
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function render(){
    var kw=(q.value||'').trim().toLowerCase(),d=dir.value,out=[];
    data.items.forEach(function(i){
      if(d&&i.direction!==d)return;
      var hay=[i.name,i.intro,i.direction,i.language,i.license,i.plain,i.what,i.who,i.how,i.risk].join(' ').toLowerCase();
      if(kw&&hay.indexOf(kw)<0)return;
      out.push('<div class="item"><span class="grade">'+esc(i.grade)+' · '+i.score+'</span>'+
        '<h3><a href="reports/'+esc(i.date)+'.html#'+esc(i.anchor)+'">'+esc(i.name)+'</a></h3>'+
        '<div class="meta">'+esc(i.date)+' · '+esc(i.language)+' · '+esc(i.license)+' · ★ '+i.stars+' · '+esc(i.direction)+(i.revisit?' · 回看':'')+'</div>'+
        '<div class="intro"><span class="intro-label">项目简介</span>'+esc(i.intro||'仓库未提供简介')+'</div>'+
        '<div class="row"><span>改哪一处</span>'+esc(i.what)+'</div>'+
        '<div class="row"><span>卖给谁</span>'+esc(i.who)+'</div></div>');
    });
    box.innerHTML=out.length?out.join(''):'<div class="empty">没有匹配的项目，换个关键词试试。</div>';
    count.textContent='共 '+data.items.length+' 条，匹配 '+out.length+' 条';
  }
  q.addEventListener('input',render);dir.addEventListener('change',render);render();
})();
</script>`;

  return page("GitHub 副业雷达 · 历史归档", `
<h1>GitHub 副业雷达 · 历史归档</h1>
<div class="date">每天一份日报，永久留存；下面是可检索的选品库</div>
${themeBar()}
<div class="summary">
<div class="stats"><div><b>${days.length}</b>报告天数</div><div><b>${totalScanned}</b>累计扫描</div><div><b>${totalKept}</b>累计推荐</div><div><b>${avgAll}</b>平均评分</div></div>
</div>
<h2>按日期查看</h2>
<div class="days">${dayCards || '<div class="empty">还没有报告，等定时任务跑一次。</div>'}</div>
<h2>选品库检索</h2>
<div class="bar"><input id="q" placeholder="搜项目名、简介、方向、语言、许可证或三行落地，例如：命理 / TypeScript / MIT / SEO">
<select id="dir"><option value="">全部方向</option>${directions.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}</select></div>
<div class="muted" id="count" style="margin-bottom:10px"></div>
<div id="items"></div>
<footer>数据来自 GitHub 公开 API · 中文解说由 Cloudflare Workers AI 免费模型生成</footer>`, script, "favicon.svg");
}
