/** 单密码口令门：把整页 HTML 用 AES-GCM 加密后包成登录壳。
 *  密码不写进任何产物，浏览器端用 Web Crypto 本地解密；解密失败即密码错误。
 *  零依赖，Node 22 与浏览器都只用内置 crypto。
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { renderReport, renderArchive, renderSettings } from "./render.mjs";
import { DEFAULT_CONFIG, normalizeConfig } from "./rules.mjs";

const webcrypto = crypto.webcrypto;
const enc = new TextEncoder();
const ITERATIONS = 150_000;
const DATE_JSON = /^\d{4}-\d{2}-\d{2}\.json$/;

const b64 = (buf) => Buffer.from(buf).toString("base64");
const escAttr = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function deriveKey(password, salt) {
  const base = await webcrypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"],
  );
  return webcrypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** 加密一段 HTML，返回可直接内嵌的 blob（只有密文 + 随机盐 + iv） */
export async function seal(html, password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, enc.encode(html),
  );
  return { v: 1, iter: ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

/** 解密（供本地自测 / 换密码时使用） */
export async function unseal(blob, password) {
  const u8 = (s) => Uint8Array.from(Buffer.from(s, "base64"));
  const key = await deriveKey(password, u8(blob.salt));
  const buf = await webcrypto.subtle.decrypt(
    { name: "AES-GCM", iv: u8(blob.iv) }, key, u8(blob.ct),
  );
  return new TextDecoder().decode(buf);
}

const GATE_CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
background:#0e1117;color:#e8ecf4;font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
.box{width:100%;max-width:360px;background:#171c26;border:1px solid #2a3242;border-radius:16px;padding:28px 24px}
.lock{width:38px;height:38px;border:2px solid #7aa2ff;border-radius:10px;position:relative;margin-bottom:18px}
.lock:after{content:"";position:absolute;left:9px;top:-11px;width:16px;height:14px;border:2px solid #7aa2ff;border-bottom:0;border-radius:8px 8px 0 0}
h1{font-size:18px;font-weight:500;margin:0 0 4px}
.hint,.note{color:#9aa5b8;font-size:12px;margin:0 0 18px}
.note{margin:16px 0 0;font-size:11px}
input{width:100%;font:inherit;font-size:14px;color:#e8ecf4;background:#202837;border:1px solid #2a3242;
border-radius:9px;padding:10px 12px;outline:none;margin-bottom:10px}
input:focus{border-color:#7aa2ff}
button{width:100%;font:inherit;font-size:14px;color:#0e1117;background:#7aa2ff;border:0;border-radius:9px;
padding:10px 12px;cursor:pointer;font-weight:500}
button:hover{background:#96b4ff}
.err{color:#fbbf24;font-size:12px;min-height:18px;margin:10px 0 0}
`;

/* 浏览器端脚本里不含 ${}，避免与外层模板字符串冲突 */
const GATE_JS = `
(function(){
  // Web Crypto 只在安全上下文可用；GitHub Pages 的自定义域跳转可能是 http，先切到 https
  if(!window.isSecureContext||!window.crypto||!crypto.subtle){
    if(location.protocol==='http:'){
      location.replace('https://'+location.host+location.pathname+location.search+location.hash);
      return;
    }
    document.getElementById('e').textContent='当前环境不支持 Web Crypto，请用 https 打开本页';
    return;
  }
  var K='radar-pass-v1';
  var B=JSON.parse(document.getElementById('radar-blob').textContent);
  var form=document.getElementById('f'), input=document.getElementById('p'), err=document.getElementById('e');
  function u8(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a;}
  function key(pass){
    return crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey'])
      .then(function(k){return crypto.subtle.deriveKey(
        {name:'PBKDF2',salt:u8(B.salt),iterations:B.iter,hash:'SHA-256'},
        k,{name:'AES-GCM',length:256},false,['decrypt']);});
  }
  function show(html){
    var doc=new DOMParser().parseFromString(html,'text/html');
    document.head.innerHTML=doc.head.innerHTML;
    document.body.innerHTML=doc.body.innerHTML;
    var scripts=doc.body.querySelectorAll('script');
    for(var i=0;i<scripts.length;i++){
      var old=scripts[i], s=document.createElement('script');
      if(old.type)s.type=old.type;
      if(old.id)s.id=old.id;
      s.textContent=old.textContent;
      document.body.appendChild(s);
    }
    document.body.setAttribute('data-theme',document.body.getAttribute('data-theme')||'dark');
  }
  function unlock(pass,silent){
    return key(pass).then(function(k){return crypto.subtle.decrypt({name:'AES-GCM',iv:u8(B.iv)},k,u8(B.ct));})
      .then(function(buf){
        try{sessionStorage.setItem(K,pass);}catch(e){}
        show(new TextDecoder().decode(buf));
      }).catch(function(){
        try{sessionStorage.removeItem(K);}catch(e){}
        if(silent){form.style.display='';input.focus();return;}
        err.textContent='密码不对，再试一次';input.value='';input.focus();
      });
  }
  form.addEventListener('submit',function(e){e.preventDefault();if(input.value)unlock(input.value,false);});
  var saved=null;try{saved=sessionStorage.getItem(K);}catch(e){}
  if(saved){form.style.display='none';unlock(saved,true);}else{input.focus();}
})();
`;

/** 生成登录壳页面。faviconHref 需按页面所在目录传：
 *  日报在 reports/ 下用 ../favicon.svg，归档首页用 favicon.svg。
 *  解锁后 head 会被明文页的 head 替换，两边 href 必须一致。 */
export function gatePage(blob, faviconHref = "favicon.svg") {
  const payload = JSON.stringify(blob).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/svg+xml" href="${escAttr(faviconHref)}">
<meta name="robots" content="noindex,nofollow">
<title>需要访问密码 · GitHub 副业雷达</title><style>${GATE_CSS}</style></head>
<body><div class="box"><div class="lock"></div>
<h1>需要访问密码</h1>
<p class="hint">这份雷达仅对持有密码的人开放</p>
<form id="f"><input id="p" type="password" placeholder="输入密码" autocomplete="current-password" required autofocus>
<button type="submit">解锁</button></form>
<p class="err" id="e"></p>
<p class="note">解锁后本标签页内自动记住，关闭标签页即失效。</p>
</div><script id="radar-blob" type="application/json">${payload}</script><script>${GATE_JS}</script></body></html>`;
}

/** 从 data/*.json 全量重建所有页面。每次运行都重渲染历史页，
 *  这样改密码后旧日报也会被重新加密，不会出现「新旧密码混用」。 */
export async function rebuildPages({ SITE, DATA, REPORTS, ROOT, password = "", repo = "" }) {
  const files = (await fs.readdir(DATA).catch(() => []))
    .filter((f) => DATE_JSON.test(f)).sort().reverse();
  const history = [];
  for (const f of files) {
    try { history.push(JSON.parse(await fs.readFile(path.join(DATA, f), "utf8"))); }
    catch { /* 跳过损坏的数据文件 */ }
  }
  const locked = Boolean(password);
  const write = async (file, html, faviconHref) => {
    const out = locked ? gatePage(await seal(html, password), faviconHref) : html;
    await fs.writeFile(file, out);
  };
  for (const d of history) {
    await write(path.join(REPORTS, `${d.date}.html`), renderReport(d), "../favicon.svg");
  }
  await write(path.join(SITE, "index.html"), renderArchive(history), "favicon.svg");

  // 设置页：把同一份规则源码内联进去，保证预览与线上打分口径一致
  if (ROOT) {
    let rulesSource = "";
    let config = normalizeConfig(DEFAULT_CONFIG);
    try {
      config = normalizeConfig(JSON.parse(await fs.readFile(path.join(ROOT, "radar.config.json"), "utf8")));
    } catch (e) {
      console.warn("[设置页] 读取 radar.config.json 失败，使用内置默认:", String(e));
    }
    try {
      rulesSource = await fs.readFile(path.join(ROOT, "scripts", "rules.mjs"), "utf8");
    } catch (e) {
      console.warn("[设置页] 读取 rules.mjs 失败，跳过设置页:", String(e));
    }
    if (rulesSource) {
      const pool = await loadPreviewPool(DATA, history);
      const html = renderSettings({
        config,
        defaultConfig: config,
        rulesSource,
        pool,
        repo: repo || process.env.RADAR_REPO || "lxygithub/github-actions-radar",
      });
      await write(path.join(SITE, "settings.html"), html, "favicon.svg");
    }
  }
  return { days: history.length, locked };
}

/** 设置页的预览样本：优先用最近一次扫描的完整候选池，否则退回历史日报里入选过的项目 */
async function loadPreviewPool(DATA, history) {
  let pool = null;
  try {
    const p = JSON.parse(await fs.readFile(path.join(DATA, "pool.json"), "utf8"));
    if (Array.isArray(p.repos)) pool = p;
  } catch { /* 没有快照，走兜底 */ }
  if (!pool) {
    const seen = new Set();
    const repos = [];
    for (const d of history) {
      for (const p of d.picks || []) {
        if (seen.has(p.fullName)) continue;
        seen.add(p.fullName);
        repos.push({
          fullName: p.fullName, owner: p.owner, name: p.name, url: p.url,
          description: p.description, stars: p.stars, language: p.language,
          license: p.license, openIssues: p.openIssues, sizeKb: p.sizeKb,
          createdAt: p.createdAt, pushedAt: p.pushedAt, topics: p.topics,
          isOrg: p.isOrg, readmeHead: String(p.readmeHead || "").slice(0, 600),
        });
      }
    }
    pool = { date: history[0]?.date || new Date().toISOString().slice(0, 10), repos };
  }
  return {
    date: pool.date,
    repos: pool.repos.slice(0, 120).map((r) => ({
      ...r, readmeHead: String(r.readmeHead || "").slice(0, 400),
    })),
  };
}
