# 打磨记录 · 三方向初稿（第 1 轮）

截图工具：pip 安装 playwright 超时失败，改用本机 Edge `--headless=new --screenshot` 截 1440×1100 首屏。design_lint 的截图体检因此跳过，改用肉眼逐屏看。

## dir-1 · 粗野情报简报
最伤三处：
1. 「改哪一处」等标签与正文粘连（min-width 64px 不够，中文四字标签贴住内容）；
2. 落地四问两列 gap 过大，读起来断裂；
3. 分数列与项目名垂直对齐可更紧。
判断：均为排版细节，不动骨架。选定后落地时调 label 宽度与 gap 即可，不影响方向。

## dir-2 · 白画廊
最伤三处：
1. 语言标签块（程序化材质占位）信息量低、显得空；
2. 侧栏与项目说明字号偏小（部分 12px 以下），可读性偏弱；
3. 项目名 / 一句话 / 分数关系不够紧凑。
判断：留白与错落骨架成立；选定后加大说明字号、把分数提到项目名同一行区域。

## dir-3 · 瑞士网格
最伤三处：
1. 评分拆解 chips 10px 太密成噪音；
2. 项目名与简介行距略紧；
3. 顶部统计格与标题之间留白分配可更紧凑。
判断：网格与信息密度是这版的核心优势，均属微调；落地时把 chips 字号提到 11px 并减数量感。

## 结论
三版骨架、气质各异（暗底爆炸 / 亮底安静 / 暗底克制），首屏均成立，无元素重叠截断，无编造数据。按 directions.md 进入展示、等待用户选择。

---

# 落地打磨 · dir-1 + 暗黑模式（用户选择后）

用户原话「用dir1加上暗黑模式」→ 选 dir-1，保留明暗切换（light 米白 / dark 黑底 / green 摸鱼绿三主题）。

## 落地做法
- 备份 render.mjs 后用脚本替换 CSS 块：dir-1 粗野语言（规则线分栏、无圆角、巨字号、信号绿分数）转译成 CSS 变量，三主题各一套（light=#f4f3ef 米白黑字，dark=#0b0d10 黑底白线+绿信号，green 浅绿）。
- 日报页结构：加 masthead 报头 + ticker + 巨号 hero（kept/scanned）+ section-head；项目卡 `.card` 改 `.story` 规则线分栏（序号/主体/分数三列）；主题按钮移入报头 nav。
- 归档页、设置页只换 CSS，HTML/JS 逻辑不动，风格自动统一。

## 打磨轮（落地后，逐屏看真截图）
第 1 轮（applied-dark.png / applied-light.png / applied-index.png / applied-settings.png，Edge 1440×1150）：
1. 日报页 masthead nav 的链接/按钮初始是浏览器默认样式 → 补 `.masthead nav a,button` 粗野方角样式（已改）。
2. dir-1 初稿记录的落地四问标签粘连 → `.landing b` 改 flex + flex:0 0 62px（已随结构改）。
3. 三版对比确认暗黑与白天结构一致、仅配色不同（符合"加暗黑模式"要求）。

## 验证
- `node --check` render/auth 通过。
- 三页明文预览（`node scripts/preview.mjs`）生成成功，story 列表/主题按钮/交互元素 id 全部保留。
- 加密流程实测：临时目录 `rebuildPages` 加密成功（locked=true, builtInPat=false, radar-blob 存在, 无明文 masthead）。
- 真实站点数据 8/80、示例预览数据 3/71 —— 预览用示例数据属正常，不影响线上。
- 截图工具：pip 装 playwright 超时，全程用 Edge `--headless=new` 截图肉眼打磨，design_lint 截图体检跳过（如实记录）。
