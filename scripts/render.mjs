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
.panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px 20px}
.ctl{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}
.ctl .lab{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:12px}
.ctl output{color:var(--fg);font-variant-numeric:tabular-nums;white-space:nowrap}
.ctl input[type=range]{width:100%;accent-color:var(--accent);margin:2px 0 0}
.ctl input[type=number],.ctl input[type=text],.ctl input[type=password],.ctl textarea,.ctl select{font:inherit;font-size:13px;color:var(--fg);background:var(--chip);border:1px solid var(--line);border-radius:8px;padding:7px 9px;outline:none;width:100%}
.ctl textarea{min-height:62px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;line-height:1.5}
.switch{display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 0}
.switch input{accent-color:var(--accent);width:16px;height:16px}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px}
.actions button{font:inherit;font-size:13px;color:var(--fg);background:var(--chip);border:1px solid var(--line);border-radius:9px;padding:8px 14px;cursor:pointer}
.actions button.primary{color:#fff;background:var(--accent);border-color:var(--accent)}
.actions button:hover{filter:brightness(1.12)}
.pv{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:10px 0}
.pv div{background:var(--chip);border-radius:9px;padding:9px 11px}
.pv b{display:block;font-size:20px;font-weight:500;color:var(--fg)}
.pv span{color:var(--muted);font-size:12px}
.pvlist{font-size:13px;color:var(--muted);line-height:1.9;word-break:break-all}
.pvlist b{color:var(--fg);font-weight:500}
.note{color:var(--muted);font-size:12px;margin:8px 0 0}
.status{font-size:13px;margin-top:10px;min-height:19px;color:var(--good)}
.status.bad{color:var(--warn)}
@media(max-width:520px){.wrap{padding:16px 12px 40px}.card,.summary,.item,.day,.panel{padding:13px}.row span{display:block}}
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
<div class="bar"><a href="../index.html">← 历史归档与选品库</a><a href="../settings.html">筛选设置</a></div>
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
<div class="bar"><a href="settings.html">筛选设置</a></div>
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

/* ---------------- 筛选设置页 ---------------- */

const SETTINGS_JS = String.raw`
(function(){
  var D=JSON.parse(document.getElementById('settings-data').textContent);
  var R=window.RadarRules;
  var cfg=R.normalizeConfig(D.config), POOL=D.pool||{repos:[]};
  function get(o,p){return p.split('.').reduce(function(x,k){return x==null?undefined:x[k];},o);}
  function set(o,p,v){var a=p.split('.'),x=o;for(var i=0;i<a.length-1;i++)x=x[a[i]];x[a[a.length-1]]=v;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function status(id,msg,bad){var e=document.getElementById(id);e.className='status'+(bad?' bad':'');e.textContent=msg||'';}
  function cur(){
    document.querySelectorAll('[data-path]').forEach(function(el){
      if(el.dataset.special)return;
      var v=el.type==='checkbox'?el.checked:(el.type==='range'||el.type==='number')?Number(el.value):el.value;
      set(cfg,el.dataset.path,v);
    });
    var d=document.querySelector('[data-special="directions"]');
    cfg.directions=d.value.split(String.fromCharCode(10)).map(function(l){var i=l.indexOf('|');return i<1?null:{name:l.slice(0,i).trim(),pattern:l.slice(i+1).trim()};}).filter(function(x){return x&&x.name&&x.pattern;});
    var q=document.querySelector('[data-special="queries"]');
    cfg.collect.queries=q.value.split(String.fromCharCode(10)).map(function(s){return s.trim();}).filter(Boolean);
    cfg=R.normalizeConfig(cfg);
  }
  function out(el){
    var o=el.parentElement.querySelector('output');if(!o)return;
    var u=el.dataset.unit||'';
    if(el.dataset.path.indexOf('weights.')===0){
      var t=0;['license','language','cjk','demand','size','freshness'].forEach(function(k){t+=cfg.weights[k];});
      o.textContent=el.value+'  ('+Math.round(Number(el.value)/t*100)+'%)';
    }else{o.textContent=el.value+u;}
  }
  function fill(){
    document.querySelectorAll('[data-path]').forEach(function(el){
      if(el.dataset.special)return;
      var v=get(cfg,el.dataset.path);
      if(el.type==='checkbox')el.checked=!!v;else el.value=v;
      out(el);
    });
    document.querySelector('[data-special="directions"]').value=cfg.directions.map(function(x){return x.name+' | '+x.pattern;}).join(String.fromCharCode(10));
    document.querySelector('[data-special="queries"]').value=cfg.collect.queries.join(String.fromCharCode(10));
  }
  function recompute(){
    var rules=R.createRules(cfg), now=new Date((POOL.date||new Date().toISOString().slice(0,10))+'T00:00:00Z');
    var reasons={},scored=[];
    (POOL.repos||[]).forEach(function(r){
      var why=rules.hardFilter(r,now);
      if(why){reasons[why]=(reasons[why]||0)+1;return;}
      scored.push(rules.scoreRepo(r,now));
    });
    scored.sort(function(a,b){return b.score-a.score;});
    var over=scored.filter(function(r){return r.score>=cfg.filter.minScore;});
    var picks=over.slice(0,cfg.filter.maxPicks);
    document.getElementById('pv-stats').innerHTML=
      '<div><b>'+(POOL.repos||[]).length+'</b><span>候选样本</span></div>'+
      '<div><b>'+((POOL.repos||[]).length-scored.length)+'</b><span>红线排除</span></div>'+
      '<div><b>'+over.length+'</b><span>过分数线</span></div>'+
      '<div><b>'+picks.length+'</b><span>最终入选</span></div>';
    document.getElementById('pv-list').innerHTML=picks.length?picks.slice(0,6).map(function(r){
      return '<div><b>'+r.score+' / '+esc(r.grade)+'</b>  '+esc(r.fullName)+' <span>· '+esc(r.direction)+'</span></div>';
    }).join(''):'<div>当前参数下没有项目入选，试试降低分数线或放宽红线。</div>';
    var rk=Object.keys(reasons).sort(function(a,b){return reasons[b]-reasons[a];}).slice(0,4);
    document.getElementById('pv-reasons').textContent=rk.length?'红线淘汰：'+rk.map(function(k){return k+' × '+reasons[k];}).join('；'):'';
  }
  function refresh(){cur();fill();recompute();}
  function text(){return JSON.stringify(R.normalizeConfig(cfg),null,2)+String.fromCharCode(10);}
  function download(){
    var b=new Blob([text()],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download='radar.config.json';document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
    status('main-status','已下载 radar.config.json，放回仓库根目录并 push 即可。');
  }
  function copy(){
    var t=text();
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){status('main-status','配置已复制，粘贴替换仓库里的 radar.config.json 即可。');},function(){legacy(t);});}
    else legacy(t);
  }
  function legacy(t){
    var x=document.createElement('textarea');x.value=t;x.style.position='absolute';x.style.left='-9999px';
    document.body.appendChild(x);x.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}
    x.remove();status('main-status',ok?'配置已复制。':'复制失败，请改用「下载」按钮。',!ok);
  }
  function b64(s){var b=new TextEncoder().encode(s),x='';for(var i=0;i<b.length;i++)x+=String.fromCharCode(b[i]);return btoa(x);}
  async function submit(){
    var token=document.getElementById('gh-token').value.trim();
    var repo=document.getElementById('gh-repo').value.trim();
    var branch=document.getElementById('gh-branch').value.trim()||'main';
    if(!token){status('gh-status','请先填写 PAT。',true);return;}
    if(!/^[^/\s]+\/[^/\s]+$/.test(repo)){status('gh-status','仓库格式应为 owner/repo。',true);return;}
    status('gh-status','正在提交…');
    try{
      var url='https://api.github.com/repos/'+repo+'/contents/radar.config.json';
      var h={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
      var c=await fetch(url+'?ref='+encodeURIComponent(branch),{headers:h});
      var sha=null;
      if(c.ok){sha=(await c.json()).sha;}
      else if(c.status!==404){throw new Error('读取现有配置失败 HTTP '+c.status);}
      var body={message:'chore: 从筛选设置页更新参数',content:b64(text()),branch:branch};
      if(sha)body.sha=sha;
      var r=await fetch(url,{method:'PUT',headers:Object.assign({},h,{'Content-Type':'application/json'}),body:JSON.stringify(body)});
      if(!r.ok){throw new Error('提交失败 HTTP '+r.status+' '+(await r.text()).slice(0,160));}
      status('gh-status','已提交到 '+repo+' 的 '+branch+'，下次定时任务生效；想立刻看效果可在 Actions 手动 Run workflow。');
    }catch(e){status('gh-status',String(e),true);}
  }
  document.querySelectorAll('[data-path]').forEach(function(el){
    el.addEventListener(el.type==='checkbox'||el.tagName==='TEXTAREA'?'change':'input',refresh);
  });
  document.querySelectorAll('[data-special]').forEach(function(el){el.addEventListener('change',refresh);});
  document.getElementById('btn-download').addEventListener('click',download);
  document.getElementById('btn-copy').addEventListener('click',copy);
  document.getElementById('btn-reset').addEventListener('click',function(){cfg=R.normalizeConfig(D.defaultConfig);fill();recompute();status('main-status','已还原为仓库当前生效的配置。');});
  document.getElementById('btn-import').addEventListener('click',function(){document.getElementById('file-import').click();});
  document.getElementById('file-import').addEventListener('change',function(e){
    var f=e.target.files[0];if(!f)return;var rd=new FileReader();
    rd.onload=function(){try{cfg=R.normalizeConfig(JSON.parse(rd.result));fill();recompute();status('main-status','已导入 '+f.name);}catch(err){status('main-status','导入失败：'+String(err),true);}};
    rd.readAsText(f);e.target.value='';
  });
  document.getElementById('btn-submit').addEventListener('click',submit);
  fill();recompute();
})();`;

/** 生成设置页。rulesSource 是 scripts/rules.mjs 的源码（去掉 export 后内联），
 *  保证浏览器预览与 Actions 打分用的是同一份规则实现。 */
export function renderSettings({ config, defaultConfig, rulesSource, pool, repo }) {
  const data = JSON.stringify({ config, defaultConfig, pool, repo }).replace(/</g, "\\u003c");
  const browserRules = rulesSource.replace(/^export\s+/gm, "") +
    "\nwindow.RadarRules={normalizeConfig:normalizeConfig,createRules:createRules,DEFAULT_CONFIG:DEFAULT_CONFIG};";

  const range = (p, label, min, max, step, unit = "") => `<label class="ctl"><span class="lab"><span>${esc(label)}</span><output></output></span><input type="range" data-path="${p}" min="${min}" max="${max}" step="${step}" data-unit="${esc(unit)}"></label>`;
  const number = (p, label, min, max, step = 1) => `<label class="ctl"><span class="lab"><span>${esc(label)}</span></span><input type="number" data-path="${p}" min="${min}" max="${max}" step="${step}"></label>`;
  const check = (p, label) => `<label class="switch"><input type="checkbox" data-path="${p}"><span>${esc(label)}</span></label>`;
  const textarea = (p, label, rows = 2) => `<label class="ctl"><span class="lab"><span>${esc(label)}</span></span><textarea data-path="${p}" rows="${rows}"></textarea></label>`;

  const body = `
<div class="bar"><a href="index.html">← 历史归档与选品库</a></div>
<h1>筛选设置</h1>
<div class="date">参数保存在仓库根目录 radar.config.json，下次定时任务运行生效</div>
${themeBar()}
<div class="summary"><div><b>实时预览</b> <span class="muted">用最近一次扫描的候选池快照，按与线上相同的规则代码重算</span></div>
<div class="pv" id="pv-stats"></div>
<div class="pvlist" id="pv-list"></div>
<div class="note" id="pv-reasons"></div>
<div class="note">预览不含冷却账本；正式运行还会按「同项目 / 同方向冷却」再排除一次，并只保留前 N 个。</div></div>

<h2>基础参数</h2>
<div class="panel"><div class="grid">
${range("filter.minScore", "入选分数线", 0, 100, 1, " 分")}
${range("filter.maxPicks", "每日最多推荐", 1, 20, 1, " 个")}
${range("collect.maxCandidates", "候选池上限", 20, 200, 10, " 个")}
${range("collect.maxReadmes", "抓取 README 数", 0, 50, 1, " 个")}
${number("filter.minStars", "最低星数", 0, 100000, 50)}
${number("filter.maxPushedDays", "最长未提交天数", 1, 3650, 30)}
${range("cooldown.projectDays", "同项目冷却", 0, 60, 1, " 天")}
${range("cooldown.directionDays", "同方向冷却", 0, 60, 1, " 天")}
${check("filter.blockLists", "拦截清单 / 合集型仓库")}
${check("filter.blockRisk", "拦截破解 / 绕过类（合规红线）")}
</div></div>

<h2>评分权重</h2>
<div class="panel"><div class="note" style="margin:0 0 12px">权重按总和归一化，分数线始终是百分制；调权重只改变各维度的重要性，不会改变分数线的含义。</div>
<div class="grid">
${range("weights.license", "许可证", 0, 50, 1)}
${range("weights.language", "上手成本", 0, 50, 1)}
${range("weights.cjk", "中文友好", 0, 50, 1)}
${range("weights.demand", "需求真实", 0, 50, 1)}
${range("weights.size", "交付轻重", 0, 50, 1)}
${range("weights.freshness", "时效红利", 0, 50, 1)}
${number("grades.S", "S 级线", 0, 100)}
${number("grades.A", "A 级线", 0, 100)}
${number("grades.B", "B 级线", 0, 100)}
</div>
<details style="margin-top:12px"><summary class="muted">可接手度加减项</summary><div class="grid" style="margin-top:12px">
${number("handoff.heavy", "重型 / GPU 集群扣分", -100, 0)}
${number("handoff.infra", "框架 / 编译器扣分", -100, 0)}
${number("handoff.bigOrg", "大厂大项目扣分", -100, 0)}
${number("handoff.vertical", "垂类关键词加分", 0, 100)}
${number("handoff.bigOrgStars", "大项目星数门槛", 0, 10000000, 1000)}
${number("handoff.min", "扣分下限", -100, 0)}
${number("handoff.max", "加分上限", 0, 100)}
</div></details></div>

<h2>判定阈值</h2>
<div class="panel"><div class="grid">
${range("thresholds.cjkDesc", "描述汉字比例阈值", 0, 1, 0.01)}
${range("thresholds.cjkReadme", "README 汉字比例阈值", 0, 1, 0.01)}
${range("thresholds.issueHigh", "issue/星数 高线", 0, 0.1, 0.001)}
${range("thresholds.issueMid", "issue/星数 中线", 0, 0.1, 0.001)}
${number("thresholds.sizeSmallKb", "小仓库上限 KB", 1, 10000000, 512)}
${number("thresholds.sizeMidKb", "中仓库上限 KB", 1, 10000000, 1024)}
${number("thresholds.sizeLargeKb", "大仓库上限 KB", 1, 10000000, 1024)}
${number("thresholds.newDays", "新建满分天数", 1, 3650, 10)}
${number("thresholds.midDays", "次新分界天数", 1, 3650, 10)}
${number("thresholds.oldDays", "老旧分界天数", 1, 3650, 10)}
</div></div>

<h2>方向与关键词</h2>
<div class="panel">
<label class="ctl"><span class="lab"><span>方向识别（每行「名称 | 正则」，自上而下首个命中；都不命中归「通用工具」）</span></span><textarea data-special="directions" rows="8"></textarea></label>
<div class="grid" style="margin-top:12px">
${textarea("keywords.listName", "清单型仓库名正则")}
${textarea("keywords.listDesc", "清单型描述正则")}
${textarea("keywords.risk", "合规红线正则")}
${textarea("keywords.heavy", "重型项目正则")}
${textarea("keywords.infra", "基础设施正则")}
${textarea("keywords.vertical", "垂类加分正则")}
</div></div>

<h2>采集查询</h2>
<div class="panel"><label class="ctl"><span class="lab"><span>GitHub Search 查询（每行一条，{dN} 展开为 N 天前的日期）</span></span><textarea data-special="queries" rows="4"></textarea></label>
<div class="note">查询越多越耗 GitHub API 配额；匿名调用限 60 次/小时，workflow 使用内置 github.token。</div></div>

<h2>导出与应用</h2>
<div class="panel"><div class="actions">
<button id="btn-download" class="primary">下载 radar.config.json</button>
<button id="btn-copy">复制到剪贴板</button>
<button id="btn-import">导入配置</button>
<button id="btn-reset">撤销改动</button>
<input type="file" id="file-import" accept=".json,application/json" style="display:none">
</div>
<div class="note">把文件放回仓库根目录替换现有 radar.config.json 并 push，下次运行（每天北京 08:00）生效；也可以在 Actions 手动 Run workflow 立即跑一次。</div>
<div class="status" id="main-status"></div></div>

<details class="panel"><summary>直接提交到 GitHub（免手动上传）</summary>
<div class="note" style="margin-top:10px">填一个只授予该仓库 Contents 读写权限的 fine-grained PAT。Token 仅在当前页面内存中使用，不写入 localStorage、不保存进页面或配置文件，关闭标签页即消失。公开站点上请勿使用权限过大的经典 Token。</div>
<div class="grid" style="margin-top:12px">
<label class="ctl"><span class="lab"><span>仓库 owner/repo</span></span><input type="text" id="gh-repo" value="${esc(repo)}"></label>
<label class="ctl"><span class="lab"><span>分支</span></span><input type="text" id="gh-branch" value="main"></label>
<label class="ctl"><span class="lab"><span>Fine-grained PAT</span></span><input type="password" id="gh-token" placeholder="github_pat_..." autocomplete="off"></label>
</div>
<div class="actions"><button id="btn-submit" class="primary">提交到仓库</button></div>
<div class="status" id="gh-status"></div></details>

<footer>配置改动只影响下一次扫描，已生成的历史报告不会被改写</footer>`;

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<title>筛选设置 · GitHub 副业雷达</title><style>${CSS}</style></head>
<body data-theme="dark"><div class="wrap">
${body}
</div><script id="settings-data" type="application/json">${data}</script>
<script>${browserRules}</script>
<script>${SETTINGS_JS}</script>
${THEME_SCRIPT}</body></html>`;
}
