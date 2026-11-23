#!/usr/bin/env python3
"""把 dir-1 粗野情报简报的视觉语言写进 render.mjs 的 CSS 块（保留所有 class 名）。"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / "scripts" / "render.mjs"
src = TARGET.read_text(encoding="utf-8")

start = src.index("const CSS = `")
end = src.index("`;", start) + 2

NEW_CSS = r'''const CSS = `
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
.masthead nav{display:flex;gap:8px;flex-wrap:wrap}
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
`;'''

src = src[:start] + NEW_CSS + src[end:]
TARGET.write_text(src, encoding="utf-8")
print("CSS replaced. Lines:", len(src.splitlines()))
