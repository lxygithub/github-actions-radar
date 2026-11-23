#!/usr/bin/env python3
"""从真实日报数据生成三个设计方向的完整 HTML 初稿（三版共用同一份数据）。"""
import json, pathlib, html

HERE = pathlib.Path(__file__).parent
DATA = json.loads((HERE / "_data.json").read_text(encoding="utf-8"))
DATE = "2026-11-11"
SCANNED, KEPT, AVG = 80, 8, 68
REJECTED = 72

def e(s): return html.escape(str(s or ""), quote=True)

# ---------- 公共：项目主视觉（首卡）----------
top = DATA[0]

# ---------- dir-1：Bloomberg 媒体级粗野主义 ----------
cards1 = []
for i, p in enumerate(DATA):
    hi = p['score'] >= 70
    sig = "var(--sig)" if hi else "var(--fg)"
    cards1.append(f'''<article class="story">
<div class="story-n">{i+1:02d}</div>
<div class="story-body">
  <div class="story-meta"><span>{e(p['lang'])}</span><span>{e(p['license'])}</span><span>★ {p['stars']:,}</span><span>{e(p['direction'])}</span></div>
  <h3><a href="https://github.com/{e(p['name'])}" target="_blank">{e(p['name'])}</a></h3>
  <p class="intro">{e(p['intro'])}</p>
  <div class="landing"><div><b>改哪一处</b>{e(p['what'])}</div><div><b>卖给谁</b>{e(p['who'])}</div><div><b>怎么交付</b>{e(p['how'])}</div><div><b>预计工时</b>{e(p['hours'])}</div></div>
  <div class="risk">风险 / {e(p['risk'])}</div>
</div>
<div class="story-score" style="color:{sig}"><b>{p['score']}</b><span>{e(p['grade'])} 级</span></div>
</article>''')

dir1 = f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>副业雷达 · {DATE} · 方向1 粗野情报简报</title>
<style>
:root{{--bg:#f4f3ef;--fg:#0a0a0a;--muted:#555;--line:#0a0a0a;--sig:#0a7d4f;--amber:#b8620a;--blue:#0000ee;--chip:#e8e6df}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 "Helvetica Neue",Arial,"PingFang SC",sans-serif;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1280px;margin:0 auto;padding:0 28px 80px}}
.masthead{{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:6px solid var(--fg);padding:18px 0 10px}}
.masthead .brand{{font-size:15px;font-weight:700;letter-spacing:-.02em}}
.masthead .brand small{{display:block;font-size:11px;font-weight:400;letter-spacing:.18em;color:var(--muted);margin-top:3px}}
.masthead nav{{display:flex;gap:20px;font-size:12px}} .masthead nav a{{color:var(--fg);text-decoration:none;border-bottom:1px solid var(--fg)}}
.ticker{{border-bottom:1px solid var(--line);padding:7px 0;font-size:11px;letter-spacing:.08em;color:var(--muted);display:flex;justify-content:space-between}}
.hero{{display:grid;grid-template-columns:1.15fr .85fr;gap:0;border-bottom:6px solid var(--fg);min-height:390px}}
.hero-l{{padding:30px 24px 26px 0;border-right:1px solid var(--line)}}
.kicker{{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--sig);font-weight:700}}
h1{{font:800 clamp(84px,12vw,168px)/.86 "Helvetica Neue",Arial,sans-serif;letter-spacing:-.075em;margin:14px 0 6px}}
h1 .slash{{color:var(--sig)}}
.deck{{font-size:19px;font-weight:700;max-width:560px;line-height:1.25;letter-spacing:-.01em;margin:14px 0 10px}}
.sub{{font-size:13px;color:var(--muted);max-width:520px}}
.hero-r{{padding:30px 0 26px 24px;display:flex;flex-direction:column;justify-content:space-between}}
.figures{{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--line)}}
.fig{{padding:14px 12px 12px 0;border-bottom:1px solid var(--line)}}
.fig b{{font:800 58px/.9 "Helvetica Neue",Arial;letter-spacing:-.05em;display:block}}
.fig span{{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}}
.fig.hi b{{color:var(--sig)}}
.editorial{{font-size:12px;border-left:3px solid var(--sig);padding-left:12px;color:var(--muted)}}
.section-head{{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid var(--fg);padding:22px 0 8px;margin-top:8px}}
.section-head h2{{font-size:26px;letter-spacing:-.03em;margin:0;font-weight:800}}
.section-head span{{font-size:11px;letter-spacing:.12em;color:var(--muted)}}
.story{{display:grid;grid-template-columns:52px 1fr 92px;gap:0;border-bottom:1px solid var(--line);padding:18px 0}}
.story-n{{font:800 30px/.9 "Helvetica Neue",Arial;letter-spacing:-.04em;color:var(--muted)}}
.story-meta{{display:flex;gap:12px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}}
.story h3{{font-size:24px;letter-spacing:-.035em;margin:0 0 7px;font-weight:800;line-height:1.05}}
.story h3 a{{color:var(--fg);text-decoration:none;border-bottom:2px solid var(--blue)}}
.intro{{font-size:15px;margin:0 0 10px;max-width:760px;font-weight:500}}
.landing{{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 24px;font-size:13px;max-width:760px}}
.landing div b{{display:inline-block;min-width:64px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-right:6px}}
.risk{{font-size:12px;color:var(--amber);margin-top:9px}}
.story-score{{text-align:right;border-left:1px solid var(--line);padding-left:12px}}
.story-score b{{font:800 44px/.9 "Helvetica Neue",Arial;letter-spacing:-.05em;display:block}}
.story-score span{{font-size:10px;letter-spacing:.1em;color:var(--muted)}}
.foot{{border-top:6px solid var(--fg);margin-top:26px;padding:14px 0;font-size:11px;color:var(--muted);display:flex;justify-content:space-between}}
@media(max-width:760px){{.hero{{grid-template-columns:1fr}}.hero-l{{border-right:0;border-bottom:1px solid var(--line);padding-right:0}}.hero-r{{padding-left:0}}.story{{grid-template-columns:36px 1fr 56px}}.story h3{{font-size:19px}}.story-score b{{font-size:32px}}.landing{{grid-template-columns:1fr}}}}
</style></head><body><div class="wrap">
<header class="masthead"><div class="brand">GITHUB 副业雷达<small>THE SIDE-PROJECT INTELLIGENCE BRIEF</small></div>
<nav><a href="#">历史归档</a><a href="#">筛选设置</a><a href="#">上一份</a><a href="#">下一份</a></nav></header>
<div class="ticker"><span>第 47 期 · {DATE} · 每日一版</span><span>数据来自 GitHub 公开 API · 打分模型六维</span></div>
<section class="hero">
<div class="hero-l"><div class="kicker">今日战果 / DAILY FINDINGS</div>
<h1>8<span class="slash">/</span>80</h1>
<div class="deck">从 80 个仓库里，只挑出 8 个能写清「改哪一处 / 卖给谁 / 怎么交付」的。</div>
<div class="sub">其余 72 个被排掉：纯清单、合规红线、分数未达 60 线。宁可不推，也不凑数。</div></div>
<div class="hero-r"><div class="figures">
<div class="fig"><b>80</b><span>扫过 / scanned</span></div><div class="fig"><b>72</b><span>排掉 / rejected</span></div>
<div class="fig hi"><b>8</b><span>留下 / kept</span></div><div class="fig"><b>{AVG}</b><span>平均分 / avg</span></div>
</div><div class="editorial">今日头号：{e(top['name'])} — {e(top['intro'])} <b>{top['score']} 分</b></div></div>
</section>
<div class="section-head"><h2>今日入选 · THE EIGHT</h2><span>按分数降序 · 分数即信号强度</span></div>
{''.join(cards1)}
<div class="foot"><span>Workers AI · @cf/zai-org/glm-4.7-flash</span><span>仅供选品参考 · 数据来自 GitHub 公开 API</span></div>
</div></body></html>'''
(HERE / "dir-1.html").write_text(dir1, encoding="utf-8")

# ---------- dir-2：原研哉白画廊 ----------
items2=[]
for i,p in enumerate(DATA):
    items2.append(f'''<article class="piece {['tall','wide','small'][i%3]}">
<div class="p-no">{i+1:02d}</div>
<div class="p-ph"><span>{e(p['lang'])}</span></div>
<div class="p-name">{e(p['name'])}</div>
<div class="p-one">{e(p['what'])}</div>
<div class="p-foot"><span>{e(p['intro'])}</span><b>{p['score']}</b></div>
</article>''')
dir2=f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>副业雷达 · {DATE} · 方向2 白画廊</title><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root{{--paper:#fafaf8;--ink:#23252a;--soft:#92969e;--faint:#e6e6e2;--radar:#3d6fb4;--accent:#b4794a}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font-family:"Noto Serif SC",Georgia,serif;font-weight:300;line-height:1.9;-webkit-font-smoothing:antialiased}}
.shell{{max-width:1360px;margin:0 auto;padding:52px 6vw 90px}}
.side{{position:fixed;left:6vw;top:52px;width:210px}}
.side .mark{{font-size:13px;letter-spacing:.32em;color:var(--soft)}}
.side h1{{font-size:30px;font-weight:400;line-height:1.4;margin:34px 0 16px;letter-spacing:.02em}}
.side .line{{width:26px;height:1px;background:var(--ink);margin:18px 0}}
.side p{{font-size:12px;color:var(--soft);line-height:2.1;margin:0 0 22px}}
.side nav a{{display:block;font-size:12px;color:var(--soft);text-decoration:none;margin:9px 0;letter-spacing:.08em}}
.side nav a:hover{{color:var(--ink)}}
.count{{font-size:11px;color:var(--soft);letter-spacing:.14em;margin-top:30px}}
.gallery{{margin-left:290px;display:grid;grid-template-columns:repeat(12,1fr);gap:26px 20px;align-items:start}}
.piece{{position:relative}}
.piece.tall{{grid-column:span 5}} .piece.wide{{grid-column:span 7}} .piece.small{{grid-column:span 4}}
.piece:nth-child(3n){{margin-top:64px}}
.p-no{{font-size:10px;color:var(--soft);letter-spacing:.2em;margin-bottom:9px}}
.p-ph{{height:200px;background:var(--faint);display:flex;align-items:center;justify-content:center;color:var(--soft);font-size:12px;letter-spacing:.12em}}
.piece.wide .p-ph{{height:140px}} .piece.small .p-ph{{height:160px}}
.p-name{{font-size:17px;font-weight:400;margin-top:12px;line-height:1.5;word-break:break-all}}
.p-one{{font-size:12px;color:var(--soft);margin-top:3px;min-height:44px}}
.p-foot{{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--faint);margin-top:10px;padding-top:7px;font-size:11px;color:var(--soft)}}
.p-foot span{{max-width:82%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.p-foot b{{font-size:19px;font-weight:400;color:var(--radar)}}
@media(max-width:900px){{.side{{position:static;width:auto;margin-bottom:40px}}.side h1{{margin:16px 0}}.gallery{{margin-left:0}}.piece.tall,.piece.wide,.piece.small{{grid-column:span 6}}}}
</style></head><body><div class="shell">
<aside class="side"><div class="mark">副 业 雷 达</div>
<h1>今天，<br>只留八件。</h1><div class="line"></div>
<p>{DATE}<br>从 80 个仓库里筛出 8 个能落地的想法。每一件，都只说一句话。</p>
<nav><a href="#">历史归档 →</a><a href="#">筛选设置 →</a><a href="#">上一份 →</a><a href="#">下一份 →</a></nav>
<div class="count">第 47 期 · 共 8 件</div></aside>
<main class="gallery">{''.join(items2)}</main>
</div></body></html>'''
(HERE / "dir-2.html").write_text(dir2, encoding="utf-8")

# ---------- dir-3：Vignelli 瑞士网格 ----------
rows3=[]
for i,p in enumerate(DATA):
    bd = p['breakdown'] or {}
    chips = ''.join(f'<span class="bd">{e(k)} {v:+d}</span>' for k,v in bd.items())
    rows3.append(f'''<tr>
<td class="num">{i+1:02d}</td>
<td class="nm"><a href="https://github.com/{e(p['name'])}" target="_blank">{e(p['name'])}</a><div class="sub">{e(p['intro'])}</div></td>
<td class="tag">{e(p['lang'])}<br><span>{e(p['license'])}</span></td>
<td class="tag">{e(p['direction'])}<br><span>★ {p['stars']:,}</span></td>
<td class="bdcell">{chips}</td>
<td class="score"><b>{p['score']}</b><span>{e(p['grade'])}</span></td>
</tr>''')
dir3=f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>副业雷达 · {DATE} · 方向3 瑞士网格</title>
<style>
:root{{--bg:#101418;--panel:#161c22;--line:#2d3740;--fg:#e7edf2;--dim:#8593a0;--cyan:#4fd1c5;--amber:#e0a340}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 "Helvetica Neue",Arial,"PingFang SC",sans-serif;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1180px;margin:0 auto;padding:24px 28px 70px}}
.top{{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:14px}}
.top .logo{{font-size:14px;font-weight:700;letter-spacing:-.01em}}
.top .logo em{{font-style:normal;color:var(--cyan)}}
.top nav{{display:flex;gap:8px}} .top nav a{{font-size:11px;color:var(--dim);text-decoration:none;border:1px solid var(--line);padding:5px 11px;border-radius:2px}}
.head{{display:grid;grid-template-columns:repeat(6,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin:26px 0 0}}
.cell{{background:var(--panel);padding:17px 16px}} .cell b{{font-size:38px;font-weight:600;letter-spacing:-.04em;display:block;line-height:1}}
.cell span{{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}}
.cell.hl b{{color:var(--cyan)}}
.lead{{display:grid;grid-template-columns:2fr 1fr;gap:24px;border-bottom:2px solid var(--fg);padding:28px 0 20px;margin-bottom:4px}}
.lead h1{{font-size:46px;font-weight:600;letter-spacing:-.04em;line-height:1.06;margin:0 0 12px}}
.lead p{{font-size:14px;color:var(--dim);max-width:560px;margin:0}}
.lead .note{{font-size:11px;color:var(--dim);border-left:2px solid var(--cyan);padding-left:12px;align-self:end}}
.sec{{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:14px 0 7px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}}
table{{width:100%;border-collapse:collapse;table-layout:fixed}}
th{{text-align:left;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);font-weight:400;padding:8px 10px;border-bottom:1px solid var(--line)}}
td{{padding:13px 10px;border-bottom:1px solid var(--line);vertical-align:top;font-size:13px}}
tr:hover td{{background:var(--panel)}}
th:nth-child(1),td.num{{width:38px;text-align:right;color:var(--dim);font-variant-numeric:tabular-nums}}
th:nth-child(3),td.tag{{width:96px;font-size:12px}} td.tag span{{color:var(--dim);font-size:11px}}
th:nth-child(4),td.tag{{width:104px}}
th:nth-child(5),td.bdcell{{width:210px}}
th:nth-child(6),td.score{{width:66px;text-align:right}}
.nm a{{color:var(--fg);text-decoration:none;font-weight:600;word-break:break-all}}
.nm .sub{{color:var(--dim);font-size:11px;margin-top:4px;line-height:1.5}}
.bd{{display:inline-block;font-size:10px;border:1px solid var(--line);border-radius:2px;padding:1px 5px;margin:0 3px 3px 0;color:var(--dim);font-variant-numeric:tabular-nums}}
.score b{{font-size:25px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.03em;color:var(--cyan);display:block;line-height:1}}
.score span{{font-size:10px;color:var(--dim)}}
.foot{{display:flex;justify-content:space-between;font-size:10px;color:var(--dim);letter-spacing:.06em;border-top:1px solid var(--line);margin-top:24px;padding-top:12px}}
@media(max-width:820px){{.head{{grid-template-columns:repeat(3,1fr)}}.lead{{grid-template-columns:1fr}}th:nth-child(5),td.bdcell{{display:none}}}}
</style></head><body><div class="wrap">
<div class="top"><div class="logo">GITHUB <em>副业雷达</em></div><nav><a href="#">归档</a><a href="#">设置</a><a href="#">← 上一份</a><a href="#">下一份 →</a></nav></div>
<div class="head">
<div class="cell"><b>80</b><span>扫过</span></div><div class="cell"><b>72</b><span>排掉</span></div>
<div class="cell hl"><b>8</b><span>留下</span></div><div class="cell"><b>{AVG}</b><span>均分</span></div>
<div class="cell"><b>60</b><span>分数门槛</span></div><div class="cell"><b>7d</b><span>项目冷却</span></div>
</div>
<div class="lead"><div><h1>把 80 个仓库，<br>压成 8 行判断。</h1><p>六维打分：可落地性、需求明确度、技术可行、变现路径、竞争密度、中文友好。分数是结论，落地四问才是理由。</p></div>
<div class="note">{DATE} · 第 47 期<br>数据来自 GitHub 公开 API<br>筛掉 72 个：清单型 / 合规红线 / 未达线</div></div>
<div class="sec"><span>今日入选 · ranked by score</span><span>{DATE}</span></div>
<table><thead><tr><th>#</th><th>项目 / 一句话简介</th><th>语言 / 许可</th><th>方向 / 热度</th><th>评分拆解</th><th>得分</th></tr></thead>
<tbody>{''.join(rows3)}</tbody></table>
<div class="foot"><span>Workers AI · glm-4.7-flash</span><span>仅供选品参考</span></div>
</div></body></html>'''
(HERE / "dir-3.html").write_text(dir3, encoding="utf-8")

print("generated dir-1.html dir-2.html dir-3.html")
