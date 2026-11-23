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
/* dir-1 粗野情报简报 · 三主题：light(dir1米白) / dark(黑底) / green(摸鱼绿) */
:root,body[data-theme="light"]{
  --bg:#f4f3ef;--card:#eceae3;--line:#0a0a0a;--fg:#0a0a0a;--muted:#4c4c4c;
  --sig:#0a7d4f;--good:#0a7d4f;--warn:#b8620a;--accent:#0000ee;--chip:#e6e4dc;--hair:#0a0a0a;
  color-scheme:light
}
body[data-theme="dark"]{
  --bg:#0b0d10;--card:#12161b;--line:#e9ece7;--fg:#f1f3ef;--muted:#9aa1a9;
  --sig:#4ade80;--good:#4ade80;--warn:#fbbf24;--accent:#8ab4ff;--chip:#171c22;--hair:#e9ece7;
  color-scheme:dark
}
body[data-theme="green"]{
  --bg:#eef3e8;--card:#e4ece0;--line:#1e3325;--fg:#1e3325;--muted:#5f7b68;
  --sig:#2e7d4f;--good:#2e7d4f;--warn:#a86a00;--accent:#2e7d4f;--chip:#e2f0e6;--hair:#1e3325;
  color-scheme:light
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 "Helvetica Neue",Arial,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px 70px}
a{color:var(--accent)}
h1{font-size:clamp(34px,5vw,52px);font-weight:800;letter-spacing:-.04em;line-height:1.08;margin:0 0 10px}
h2{font-size:22px;font-weight:800;letter-spacing:-.02em;margin:26px 0 10px}
.date{color:var(--muted);font-size:12px;letter-spacing:.06em;margin-bottom:14px}
/* 报头 */
.masthead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:5px solid var(--fg);padding:18px 0 10px;gap:12px;flex-wrap:wrap}
.masthead .brand{font-size:15px;font-weight:800;letter-spacing:-.02em}
.masthead .brand small{display:block;font-size:10px;font-weight:400;letter-spacing:.18em;color:var(--muted);margin-top:3px}
.masthead nav{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.masthead nav a,.masthead nav button{font:inherit;font-size:11px;letter-spacing:.04em;color:var(--fg);background:transparent;border:1px solid var(--line);border-radius:0;padding:5px 11px;text-decoration:none;cursor:pointer}
.masthead nav a:hover,.masthead nav button:hover{background:var(--chip)}
.ticker{border-bottom:1px solid var(--line);padding:7px 0;font-size:11px;letter-spacing:.06em;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px}
/* 通用 bar：细线方角小按钮 */
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:18px}
.bar button,.bar a{font:inherit;font-size:11px;letter-spacing:.04em;color:var(--fg);background:transparent;border:1px solid var(--line);border-radius:0;padding:5px 11px;text-decoration:none;cursor:pointer}
.bar button:hover,.bar a:hover{background:var(--chip)}
.bar input,.bar select{font:inherit;font-size:13px;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:0;padding:7px 10px;outline:none}
.bar input{flex:1;min-width:180px}
.daynav{justify-content:space-between;border-top:2px solid var(--fg);border-bottom:1px solid var(--line);padding:8px 0}
.bar .navend{font-size:11px;color:var(--muted);padding:5px 0}
/* 巨号统计 hero */
.hero{display:grid;grid-template-columns:1fr 1fr;border-bottom:5px solid var(--fg);padding:26px 0 22px}
.hero-l{padding:0 24px 0 0;border-right:1px solid var(--line)}
.hero-r{padding:0 0 0 24px;display:flex;flex-direction:column;justify-content:space-between}
.kicker{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--sig);font-weight:800}
.hero-num{font:800 clamp(72px,10vw,132px)/.86 "Helvetica Neue",Arial,sans-serif;letter-spacing:-.075em;margin:12px 0 8px}
.hero-num .slash{color:var(--sig)}
.deck{font-size:18px;font-weight:700;line-height:1.3;max-width:560px;margin:0 0 8px;letter-spacing:-.01em}
.sub{font-size:13px;color:var(--muted);max-width:560px}
.figures{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line)}
.fig{padding:12px 12px 10px 0;border-bottom:1px solid var(--line)}
.fig:nth-child(odd){border-right:1px solid var(--line);padding-left:0}
.fig:nth-child(even){padding-left:14px}
.fig b{font:800 42px/.9 "Helvetica Neue",Arial;letter-spacing:-.05em;display:block}
.fig span{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.fig.hi b{color:var(--sig)}
.editorial{font-size:12px;border-left:3px solid var(--sig);padding-left:11px;color:var(--muted);margin-top:12px}
/* 分栏标题 */
.section-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid var(--fg);padding:18px 0 7px;gap:10px;flex-wrap:wrap}
.section-head h2{margin:0;font-size:22px;font-weight:800}
.section-head span{font-size:10px;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}
/* 摘要 / 统计 */
.summary{border-bottom:1px solid var(--line);padding:12px 0;margin-bottom:8px}
.stats{display:flex;gap:0;flex-wrap:wrap;margin-top:8px}
.stats>div{padding:0 20px;border-right:1px solid var(--line)}
.stats>div:first-child{padding-left:0}
.stats>div:last-child{border-right:0}
.stats b{font:800 32px/.95 "Helvetica Neue",Arial;display:block;color:var(--fg);letter-spacing:-.04em}
.stats div{color:var(--muted);font-size:11px;letter-spacing:.06em}
/* 项目 story（规则线分栏，非卡片） */
.story{display:grid;grid-template-columns:48px 1fr 84px;border-bottom:1px solid var(--line);padding:16px 0;gap:0}
.story-n{font:800 26px/.9 "Helvetica Neue",Arial;letter-spacing:-.04em;color:var(--muted)}
.story-body{min-width:0}
.story-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.story h3{font-size:21px;letter-spacing:-.03em;margin:0 0 6px;font-weight:800;line-height:1.15;word-break:break-word}
.story h3 a{color:var(--fg);text-decoration:none;border-bottom:2px solid var(--accent)}
.story .intro{font-size:14px;margin:0 0 9px;font-weight:500;max-width:760px}
.landing{display:grid;grid-template-columns:1fr 1fr;gap:3px 20px;font-size:12px;max-width:760px}
.landing>div{display:flex;gap:8px}
.landing b{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);flex:0 0 62px}
.risk{color:var(--warn);font-size:12px;margin-top:8px;border-top:1px dashed var(--line);padding-top:7px}
.story-score{text-align:right;border-left:1px solid var(--line);padding-left:10px}
.story-score b{font:800 40px/.9 "Helvetica Neue",Arial;letter-spacing:-.05em;display:block;color:var(--sig)}
.story-score span{font-size:10px;letter-spacing:.08em;color:var(--muted)}
/* 卡片粗野化：细线框、无圆角 */
.card,.item,.panel,.rerun,.month,.summary,details{background:transparent;border:1px solid var(--line);border-radius:0;padding:14px 16px;margin-bottom:10px}
.summary{padding:16px;margin-bottom:18px}
details ul{padding-left:18px;margin:8px 0 0;color:var(--muted);font-size:13px;max-height:340px;overflow:auto}
.grade{float:right;font-weight:800;color:var(--sig);font-size:13px}
.card h3,.item h3{font-size:17px;margin:0 0 6px;word-break:break-all;font-weight:800}
.card h3 a,.item h3 a{text-decoration:none}
.meta{color:var(--muted);font-size:11px;margin-bottom:8px;letter-spacing:.02em}
.badge{display:inline-block;font-size:10px;border:1px solid var(--line);border-radius:0;padding:1px 6px;margin:0 5px 5px 0;color:var(--muted)}
.intro{background:var(--chip);border-left:3px solid var(--sig);border-radius:0;padding:8px 11px;margin:10px 0 12px;font-size:13px;line-height:1.6;color:var(--fg);word-break:break-word}
.intro-label{display:block;color:var(--muted);font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:2px}
.row{margin:6px 0}
.row span{display:inline-block;min-width:70px;color:var(--muted);font-size:11px;vertical-align:top;letter-spacing:.04em}
/* 手动重跑面板 */
.rerun[hidden]{display:none}
.rerun-title{font-size:13px;margin:0 0 10px;font-weight:800;letter-spacing:.02em}
.rerun .actions{align-items:center}
.rr-link{font-size:11px;color:var(--muted);text-decoration:none;border-bottom:1px solid var(--line)}
.rr-link:hover{color:var(--accent)}
.rr-opt{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);white-space:nowrap;cursor:pointer}
.rr-opt input{accent-color:var(--sig);width:15px;height:15px;margin:0}
.actions button.rr-mini{font-size:11px;padding:5px 9px}
.rr-hint{color:var(--sig);font-size:11px;margin:0 0 10px}
/* 按日期：月份折叠 + 紧凑行 */
.month{padding:0;margin-bottom:8px}
.month summary{list-style:none;cursor:pointer;padding:11px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.month summary::-webkit-details-marker{display:none}
.month summary:hover{background:var(--chip)}
.mh-title{font-size:14px;font-weight:800}
.mh-arrow{color:var(--muted);font-size:11px;margin-left:auto}
.dayrow{display:grid;grid-template-columns:120px minmax(180px,1fr) minmax(0,1fr);gap:10px;align-items:center;padding:9px 14px;border-top:1px solid var(--line);font-size:13px}
.dayrow:hover{background:var(--chip)}
.dr-date{display:flex;align-items:baseline;gap:7px;white-space:nowrap}
.dr-date a{text-decoration:none;font-variant-numeric:tabular-nums;font-weight:700}
.dr-wd{color:var(--muted);font-size:11px}
.dr-stat{display:flex;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:11px}
.dr-stat b{color:var(--fg);font-weight:800}
.dr-top{color:var(--muted);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.muted{color:var(--muted);font-size:11px}
.empty{color:var(--muted);font-size:13px;padding:14px 0}
footer{color:var(--muted);font-size:11px;margin-top:26px;text-align:center;border-top:1px solid var(--line);padding-top:12px;letter-spacing:.04em}
/* 设置页 */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px 20px}
.ctl{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}
.ctl .lab{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:11px;letter-spacing:.04em}
.ctl output{color:var(--fg);font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:700}
.ctl input[type=range]{width:100%;accent-color:var(--sig);margin:2px 0 0}
.ctl input[type=number],.ctl input[type=text],.ctl input[type=password],.ctl textarea,.ctl select{font:inherit;font-size:13px;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:0;padding:7px 9px;outline:none;width:100%}
.ctl textarea{min-height:62px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;line-height:1.5}
.switch{display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 0}
.switch input{accent-color:var(--sig);width:16px;height:16px}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px}
.actions button{font:inherit;font-size:12px;color:var(--fg);background:transparent;border:1px solid var(--line);border-radius:0;padding:8px 14px;cursor:pointer;letter-spacing:.03em}
.actions button.primary{color:var(--bg);background:var(--fg);border-color:var(--fg)}
.actions button:hover{filter:brightness(1.12)}
.pv{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0;border:1px solid var(--line);margin:10px 0}
.pv div{background:transparent;border-right:1px solid var(--line);padding:9px 11px}
.pv div:last-child{border-right:0}
.pv b{display:block;font-size:24px;font-weight:800;color:var(--sig);letter-spacing:-.03em}
.pv span{color:var(--muted);font-size:11px}
.pvlist{font-size:12px;color:var(--muted);line-height:1.8;word-break:break-all}
.pvlist b{color:var(--fg);font-weight:800}
.note{color:var(--muted);font-size:11px;margin:8px 0 0}
.status{font-size:12px;margin-top:10px;min-height:19px;color:var(--sig)}
.status.bad{color:var(--warn)}
.foot{border-top:5px solid var(--fg);margin-top:24px;padding:12px 0;font-size:11px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;letter-spacing:.04em}
@media(max-width:760px){.hero{grid-template-columns:1fr}.hero-l{border-right:0;border-bottom:1px solid var(--line);padding:0 0 18px}.hero-r{padding:18px 0 0}.story{grid-template-columns:32px 1fr 56px}.story h3{font-size:18px}.story-score b{font-size:30px}.landing{grid-template-columns:1fr}}
@media(max-width:640px){.dayrow{grid-template-columns:105px 1fr;gap:4px 10px}.dr-top{grid-column:1/-1}}
@media(max-width:520px){.wrap{padding:14px 14px 40px}.stats>div{padding:0 10px}.stats b{font-size:26px}.row span{display:block}.masthead nav{gap:5px}}
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

const DEFAULT_REPO = "lxygithub/github-actions-radar";
const WORKFLOW_FILE = "daily.yml";
const rerunButton = `<button type="button" id="btn-rerun">↻ 立即重跑</button>`;

/** 手动重跑面板：归档页 / 日报页 / 设置页共用。
 *  凭证来源优先级：页面内置（Actions Secret 注入加密页）> 本标签页手填 > 本机记住 > 手动填。
 *  不填 PAT 也能用右侧链接跳到 GitHub 网页手动 Run workflow。 */

/** 内置凭据会以 JS 字符串字面量出现在加密页里；白名单过滤杜绝引号 / 尖括号 / 反斜杠。
 *  GitHub PAT 只由字母、数字、下划线组成，不会被误伤。 */
const inlinePat = (s) => String(s ?? "").replace(/[^A-Za-z0-9_\-.]/g, "");

/** 三个页面共用的凭证读写口径，避免重跑面板与设置页漂移。 */
const PAT_BOOT = (pat) => `
  var BUILTIN=${JSON.stringify(inlinePat(pat))},K='radar-pat';
  function savedToken(){
    try{return sessionStorage.getItem(K)||localStorage.getItem(K)||BUILTIN||'';}catch(e){return BUILTIN||'';}
  }
  function remembered(){try{return !!localStorage.getItem(K);}catch(e){return false;}}
  function persist(tk,remember){
    try{
      if(remember){localStorage.setItem(K,tk);sessionStorage.removeItem(K);}
      else{sessionStorage.setItem(K,tk);localStorage.removeItem(K);}
    }catch(e){}
  }
  function forget(){try{localStorage.removeItem(K);sessionStorage.removeItem(K);}catch(e){}}
`;

const rerunPanel = (repo, pat = "") => `<div class="rerun" id="rerun-panel" hidden>
<div class="rerun-title">手动重跑一次完整扫描</div>
${inlinePat(pat) ? '<div class="rr-hint">✓ 站点已内置专用 Token，解锁后直接点「触发重跑」即可，无需填写。</div>' : ""}
<div class="grid">
<label class="ctl"><span class="lab"><span>仓库 owner/repo</span></span><input type="text" id="rr-repo" value="${esc(repo)}"></label>
<label class="ctl"><span class="lab"><span>分支</span></span><input type="text" id="rr-branch" value="main"></label>
<label class="ctl"><span class="lab"><span>Fine-grained PAT${inlinePat(pat) ? "（已内置，可覆盖）" : ""}</span></span><input type="password" id="rr-token" placeholder="github_pat_..." autocomplete="off"></label>
</div>
<div class="actions"><button type="button" id="rr-go" class="primary">触发重跑</button>
<label class="rr-opt"><input type="checkbox" id="rr-remember"><span>记住此 Token</span></label>
<button type="button" id="rr-clear" class="rr-mini">清除本机保存</button>
<a class="rr-link" id="rr-gh" href="https://github.com/${esc(repo)}/actions/workflows/${WORKFLOW_FILE}" target="_blank" rel="noopener">在 GitHub 上手动 Run workflow ↗</a></div>
<div class="status" id="rr-status"></div>
<div class="note">${inlinePat(pat)
    ? "Token 由 Actions Secret 在构建时注入本加密页，静态文件与公开仓库里都没有明文；能解锁页面的人可在浏览器中读到它，请务必使用最小权限的 fine-grained PAT。"
    : "Token 默认只保存在当前标签页的 sessionStorage；勾选「记住此 Token」会存到本机 localStorage，换设备仍需重填。也可不填 Token，点右侧链接到 GitHub 网页手动运行。"}
需要该仓库 <b>Actions: read/write</b>（设置页提交配置还需要 <b>Contents: read/write</b>）。</div>
</div>`;

const rerunScript = (pat = "") => `<script>
(function(){
  var btn=document.getElementById('btn-rerun'),panel=document.getElementById('rerun-panel');
  if(!btn||!panel)return;
  ${PAT_BOOT(pat)}
  var go=document.getElementById('rr-go'),st=document.getElementById('rr-status');
  var repoEl=document.getElementById('rr-repo'),brEl=document.getElementById('rr-branch'),tkEl=document.getElementById('rr-token'),ghLink=document.getElementById('rr-gh');
  var rememberEl=document.getElementById('rr-remember'),clearEl=document.getElementById('rr-clear');
  tkEl.value=savedToken();
  if(rememberEl)rememberEl.checked=remembered();
  function msg(s,bad){st.className='status'+(bad?' bad':'');st.textContent=s||'';}
  btn.addEventListener('click',function(){panel.hidden=!panel.hidden;if(!panel.hidden){msg('');tkEl.focus();}});
  repoEl.addEventListener('change',function(){ghLink.href='https://github.com/'+repoEl.value.trim()+'/actions/workflows/${WORKFLOW_FILE}';});
  if(clearEl)clearEl.addEventListener('click',function(){
    forget();tkEl.value=BUILTIN;if(rememberEl)rememberEl.checked=false;
    msg(BUILTIN?'已清除本机保存的 Token，恢复使用站点内置凭证。':'已清除本机保存的 Token，请重新填写。');
  });
  go.addEventListener('click',async function(){
    var repo=repoEl.value.trim(),br=brEl.value.trim()||'main',tk=tkEl.value.trim();
    var parts=repo.split('/');
    if(parts.length!==2||!parts[0]||!parts[1]||/\\s/.test(repo)){msg('仓库格式应为 owner/repo',true);return;}
    if(!tk){msg('请先填 PAT，或点「在 GitHub 上手动 Run workflow」',true);return;}
    go.disabled=true;msg('正在触发…');
    try{
      var r=await fetch('https://api.github.com/repos/'+repo+'/actions/workflows/${WORKFLOW_FILE}/dispatches',{
        method:'POST',
        headers:{Authorization:'Bearer '+tk,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
        body:JSON.stringify({ref:br})
      });
      if(!r.ok){
        var hint=(r.status===401||r.status===403)?'（请确认 PAT 授予了该仓库 Actions: read/write，且未过期）':'';
        throw new Error('HTTP '+r.status+' '+(await r.text()).slice(0,140)+hint);
      }
      persist(tk,rememberEl&&rememberEl.checked);
      msg('已触发 '+br+' 分支的重跑，约 1 分钟后刷新本页；右侧链接可查看运行进度。');
    }catch(e){msg('触发失败：'+String(e),true);}
    finally{go.disabled=false;}
  });
})();
</script>`;

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

export function renderReport(d, opts = {}) {
  const repo = opts.repo || DEFAULT_REPO;
  const pat = opts.pat || "";
  // 相邻报告日期由 rebuildPages 按 history 顺序注入；同窗口切换，sessionStorage 里的解锁状态天然保留
  const prevDate = opts.prevDate || "";
  const nextDate = opts.nextDate || "";
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
    return `<article class="story" id="${anchor(p.fullName)}">
<div class="story-n">${String(i + 1).padStart(2, "0")}</div>
<div class="story-body">
<div class="story-meta"><span>${esc(p.language)}</span><span>${esc(p.license)}</span><span>★ ${p.stars}${delta}</span><span>${esc(p.direction)}</span>${p.revisit ? '<span>回看</span>' : ""}</div>
<h3><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.fullName)}</a></h3>
<p class="intro">${esc(intro)}</p>
<div class="landing"><div><b>改哪一处</b><span>${esc(l.what)}</span></div><div><b>卖给谁</b><span>${esc(l.who)}</span></div><div><b>怎么交付</b><span>${esc(l.how)}</span></div><div><b>预计工时</b><span>${esc(l.hours)}</span></div></div>
${plainRow}
${badges ? `<div>${badges}</div>` : ""}
<div class="risk">风险 / ${esc(l.risk)}</div>
</div>
<div class="story-score"><b>${p.score}</b><span>${esc(p.grade)} 级</span></div>
</article>`;
  }).join("");

  const rejected = (d.rejected || []).map((r) => `<li>${esc(r.name)} — ${esc(r.reason)}</li>`).join("");
  const intro = d.picks.length ? `今晚可动手：${esc(d.picks[0]?.landing?.what || "看第一张卡")}` : "今天没筛出够格的项目，宁可不推。";
  const avg = d.picks.length ? Math.round(d.picks.reduce((s, p) => s + p.score, 0) / d.picks.length) : 0;
  const ai = d.aiUsed ? `Workers AI · ${esc(d.aiModel)}` : "模板文案（AI 未启用）";
  const dayNav = `<div class="bar daynav">
${prevDate ? `<a href="${esc(prevDate)}.html">← 上一份 ${esc(prevDate)}</a>` : '<span class="navend">已是最早的报告</span>'}
${nextDate ? `<a href="${esc(nextDate)}.html">下一份 ${esc(nextDate)} →</a>` : '<span class="navend">已是最新报告</span>'}
</div>`;

  return page(`GitHub 副业雷达 · ${d.date}`, `
<header class="masthead"><div class="brand">GITHUB 副业雷达<small>THE SIDE-PROJECT INTELLIGENCE BRIEF</small></div>
<nav><a href="../index.html">历史归档</a><a href="../settings.html">筛选设置</a>${rerunButton}<button data-set-theme="light">白天</button><button data-set-theme="green">摸鱼绿</button><button data-set-theme="dark">深夜</button></nav></header>
<div class="ticker"><span>每日一版 · ${esc(d.date)} · 生成于 ${esc(String(d.generatedAt).replace("T", " ").slice(0, 16))} UTC</span><span>数据来自 GitHub 公开 API · 六维打分</span></div>
${dayNav}
${rerunPanel(repo, pat)}
<section class="hero">
<div class="hero-l"><div class="kicker">今日战果 / DAILY FINDINGS</div>
<div class="hero-num">${d.picks.length}<span class="slash">/</span>${d.scanned}</div>
<div class="deck">${esc(intro)}</div>
<div class="sub">其余 ${(d.rejected || []).length} 个被排掉：纯清单、合规红线、分数未达线。宁可不推，也不凑数。</div></div>
<div class="hero-r"><div class="figures">
<div class="fig"><b>${d.scanned}</b><span>扫过 / scanned</span></div><div class="fig"><b>${(d.rejected || []).length}</b><span>排掉 / rejected</span></div>
<div class="fig hi"><b>${d.picks.length}</b><span>留下 / kept</span></div><div class="fig"><b>${avg}</b><span>均分 / avg</span></div>
</div><div class="editorial">${d.picks.length ? `今日头号：${esc(d.picks[0].fullName)} — ${esc(projectIntro(d.picks[0]))} <b>${d.picks[0].score} 分</b>` : "今天没有够格的项目。"}</div></div>
</section>
<div class="section-head"><h2>今日入选 · THE EIGHT</h2><span>按分数降序 · 分数即信号强度</span></div>
${cards || '<div class="card">今天没有够格的项目。</div>'}
<details><summary>今天排掉了什么（${(d.rejected || []).length}）</summary><ul>${rejected || "<li>无</li>"}</ul></details>
<footer>${ai} · 数据来自 GitHub 公开 API，仅供选品参考</footer>`, rerunScript(pat), "../favicon.svg");
}

/* ---------------- 归档页：月份折叠 + 选品库 ---------------- */

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const weekdayOf = (s) => WEEKDAYS[new Date(`${s}T00:00:00Z`).getUTCDay()];

/** 按月份分组的紧凑行列表：只展示最近 3 天的报告，日期再多也不用长翻。 */
function monthCards(days) {
  const shown = days.slice(0, 3);
  const groups = new Map();
  for (const d of shown) {
    const ym = d.date.slice(0, 7);
    if (!groups.has(ym)) groups.set(ym, []);
    groups.get(ym).push(d);
  }
  return [...groups.entries()].map(([ym, list], i) => {
    const [y, m] = ym.split("-");
    const kept = list.reduce((s, d) => s + d.kept, 0);
    const avg = kept ? Math.round(list.reduce((s, d) => s + d.avg * d.kept, 0) / kept) : 0;
    const rows = list.map((d) => `<div class="dayrow" data-year="${esc(y)}" data-hay="${esc(`${d.date} ${ym} ${d.top}`.toLowerCase())}">
<div class="dr-date"><a href="reports/${esc(d.date)}.html" target="_blank" rel="opener">${esc(d.date)}</a><span class="dr-wd">${esc(weekdayOf(d.date))}</span></div>
<div class="dr-stat"><span>扫 <b>${d.scanned}</b></span><span>排 <b>${d.rejected}</b></span><span>留 <b>${d.kept}</b></span><span>均分 <b>${d.avg}</b></span></div>
<div class="dr-top" title="Top 1 · ${esc(d.top)}">Top 1 · ${esc(d.top)}</div></div>`).join("");
    return `<details class="month" ${i === 0 ? "open" : ""}>
<summary><span class="mh-title">${esc(y)} 年 ${Number(m)} 月</span><span class="muted"><span class="mh-count">${list.length}</span> 份报告 · 留 ${kept} · 均分 ${avg}</span><span class="mh-arrow">▾</span></summary>
<div class="dayrows">${rows}</div></details>`;
  }).join("");
}

/** 归档页：按日期折叠列表（最近 3 天）+ 可按关键词检索的选品库（数据内联，本地双击也能用） */
export function renderArchive(history, opts = {}) {
  const repo = opts.repo || DEFAULT_REPO;
  const pat = opts.pat || "";
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

  const years = [...new Set(days.map((d) => d.date.slice(0, 4)))].sort().reverse();
  const minDate = days.length ? days[days.length - 1].date : "";
  const maxDate = days.length ? days[0].date : "";

  const script = `
<script id="radar-data" type="application/json">${payload}</script>
<script>
(function(){
  var data=JSON.parse(document.getElementById('radar-data').textContent);
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  /* 选品库检索 */
  var q=document.getElementById('q'),dir=document.getElementById('dir'),box=document.getElementById('items');
  var count=document.getElementById('count');
  function render(){
    var kw=(q.value||'').trim().toLowerCase(),d=dir.value,out=[];
    data.items.forEach(function(i){
      if(d&&i.direction!==d)return;
      var hay=[i.name,i.intro,i.direction,i.language,i.license,i.plain,i.what,i.who,i.how,i.risk].join(' ').toLowerCase();
      if(kw&&hay.indexOf(kw)<0)return;
      out.push('<div class="item"><span class="grade">'+esc(i.grade)+' · '+i.score+'</span>'+
        '<h3><a href="reports/'+esc(i.date)+'.html#'+esc(i.anchor)+'" target="_blank" rel="opener">'+esc(i.name)+'</a></h3>'+
        '<div class="meta">'+esc(i.date)+' · '+esc(i.language)+' · '+esc(i.license)+' · ★ '+i.stars+' · '+esc(i.direction)+(i.revisit?' · 回看':'')+'</div>'+
        '<div class="intro"><span class="intro-label">项目简介</span>'+esc(i.intro||'仓库未提供简介')+'</div>'+
        '<div class="row"><span>改哪一处</span>'+esc(i.what)+'</div>'+
        '<div class="row"><span>卖给谁</span>'+esc(i.who)+'</div></div>');
    });
    box.innerHTML=out.length?out.join(''):'<div class="empty">没有匹配的项目，换个关键词试试。</div>';
    count.textContent='共 '+data.items.length+' 条，匹配 '+out.length+' 条';
  }
  q.addEventListener('input',render);dir.addEventListener('change',render);render();

  /* 日期跳转 */
  var jump=document.getElementById('cal-jump'),jmsg=document.getElementById('cal-jump-msg');
  document.getElementById('cal-go').addEventListener('click',function(){
    var v=jump.value;
    if(!v){jmsg.textContent='先选一个日期';return;}
    var hit=data.days.some(function(d){return d.date===v;});
    if(hit){
      var a=document.createElement('a');a.href='reports/'+v+'.html';a.target='_blank';a.rel='opener';
      document.body.appendChild(a);a.click();a.remove();jmsg.textContent='';
    }
    else jmsg.textContent=v+' 没有报告（浅色说明那天没跑）';
  });

  /* 月份列表筛选 / 展开收起 */
  var ys=document.getElementById('day-year'),dq=document.getElementById('day-q'),dcount=document.getElementById('day-count');
  var months=[].slice.call(document.querySelectorAll('#day-months .month'));
  function filterDays(){
    var y=ys.value,kw=(dq.value||'').trim().toLowerCase();
    months.forEach(function(m){
      var vis=0;
      [].slice.call(m.querySelectorAll('.dayrow')).forEach(function(row){
        var ok=(!y||row.dataset.year===y)&&(!kw||(row.dataset.hay||'').indexOf(kw)>=0);
        row.style.display=ok?'':'none';
        if(ok)vis++;
      });
      m.style.display=vis?'':'none';
      m.querySelector('.mh-count').textContent=vis;
      if(y||kw)m.open=true;
    });
    dcount.textContent='共 '+data.days.length+' 天报告，下方列出最近 3 天';
  }
  ys.addEventListener('change',filterDays);dq.addEventListener('input',filterDays);
  document.getElementById('day-expand').addEventListener('click',function(){months.forEach(function(m){if(m.style.display!=='none')m.open=true;});});
  document.getElementById('day-collapse').addEventListener('click',function(){months.forEach(function(m){m.open=false;});});
  filterDays();
})();
</script>`;

  return page("GitHub 副业雷达 · 历史归档", `
<div class="bar"><a href="settings.html">筛选设置</a>${rerunButton}</div>
${rerunPanel(repo, pat)}
<h1>GitHub 副业雷达 · 历史归档</h1>
<div class="date">每天一份日报，永久留存；下面是可检索的选品库</div>
${themeBar()}
<div class="summary">
<div class="stats"><div><b>${days.length}</b>报告天数</div><div><b>${totalScanned}</b>累计扫描</div><div><b>${totalKept}</b>累计推荐</div><div><b>${avgAll}</b>平均评分</div></div>
</div>
<h2>按日期查看</h2>
<div class="bar"><input type="date" id="cal-jump" min="${esc(minDate)}" max="${esc(maxDate)}" value="${esc(maxDate)}">
<button type="button" id="cal-go">打开该日报告</button><span class="muted" id="cal-jump-msg"></span></div>
<div class="bar"><select id="day-year"><option value="">全部年份</option>${years.map((y) => `<option value="${esc(y)}">${esc(y)} 年</option>`).join("")}</select>
<input id="day-q" placeholder="按日期或 Top 1 项目筛选，例如 11 / ziwei">
<button type="button" id="day-expand">展开全部</button><button type="button" id="day-collapse">收起全部</button></div>
<div class="muted" id="day-count" style="margin-bottom:10px"></div>
<div id="day-months">${monthCards(days)}</div>
<h2>选品库检索</h2>
<div class="bar"><input id="q" placeholder="搜项目名、简介、方向、语言、许可证或三行落地，例如：命理 / TypeScript / MIT / SEO">
<select id="dir"><option value="">全部方向</option>${directions.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}</select></div>
<div class="muted" id="count" style="margin-bottom:10px"></div>
<div id="items"></div>
<footer>数据来自 GitHub 公开 API · 中文解说由 Cloudflare Workers AI 免费模型生成</footer>`, script + rerunScript(pat), "favicon.svg");
}

/* ---------------- 筛选设置页 ---------------- */

const settingsScript = (pat = "") => String.raw`
(function(){
  ${PAT_BOOT(pat)}
  var D=JSON.parse(document.getElementById('settings-data').textContent);
  var R=window.RadarRules;
  var cfg=R.normalizeConfig(D.config), POOL=D.pool||{repos:[]};
  function get(o,p){return p.split('.').reduce(function(x,k){return x==null?undefined:x[k];},o);}
  function set(o,p,v){var a=p.split('.'),x=o;for(var i=0;i<a.length-1;i++)x=x[a[i]];x[a[a.length-1]]=v;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  document.getElementById('gh-token').value=savedToken();
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
      var rem=document.getElementById('rr-remember');persist(token,rem&&rem.checked);
      status('gh-status','已提交到 '+repo+' 的 '+branch+'，push 会自动触发一次重算；想立刻看效果也可以点右上角「立即重跑」。');
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
export function renderSettings({ config, defaultConfig, rulesSource, pool, repo, pat = "" }) {
  const data = JSON.stringify({ config, defaultConfig, pool, repo }).replace(/</g, "\\u003c");
  const browserRules = rulesSource.replace(/^export\s+/gm, "") +
    "\nwindow.RadarRules={normalizeConfig:normalizeConfig,createRules:createRules,DEFAULT_CONFIG:DEFAULT_CONFIG};";

  const range = (p, label, min, max, step, unit = "") => `<label class="ctl"><span class="lab"><span>${esc(label)}</span><output></output></span><input type="range" data-path="${p}" min="${min}" max="${max}" step="${step}" data-unit="${esc(unit)}"></label>`;
  const number = (p, label, min, max, step = 1) => `<label class="ctl"><span class="lab"><span>${esc(label)}</span></span><input type="number" data-path="${p}" min="${min}" max="${max}" step="${step}"></label>`;
  const check = (p, label) => `<label class="switch"><input type="checkbox" data-path="${p}"><span>${esc(label)}</span></label>`;
  const textarea = (p, label, rows = 2) => `<label class="ctl"><span class="lab"><span>${esc(label)}</span></span><textarea data-path="${p}" rows="${rows}"></textarea></label>`;

  const body = `
<div class="bar"><a href="index.html">← 历史归档与选品库</a>${rerunButton}</div>
${rerunPanel(repo, pat)}
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
<div class="note" style="margin-top:10px">与「立即重跑」共用同一个 Token：站点已内置时会自动填好，无需操作；否则可手填并勾选「记住此 Token」存到本机。该 Token 需要本仓库 <b>Contents: read/write</b>（重跑还要 <b>Actions: read/write</b>）。请用只勾选这一个仓库、设了过期时间的 fine-grained PAT，公开站点上不要使用权限过大的经典 Token。</div>
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
<script>${settingsScript(pat)}</script>
${rerunScript(pat)}
${THEME_SCRIPT}</body></html>`;
}
