# github-actions-radar

每天自动扫描 GitHub 新项目，按「可接手度」打分，用 **Cloudflare Workers AI 免费模型** 补中文落地建议，生成日报并永久归档成可搜索的选品库。

零 npm 依赖，只用 Node 22 内置 `fetch` / `fs`。调度、存储、托管全在 GitHub：Actions 定时跑 → 历史数据同步到独立的 `radar-data` 分支 → Pages 发布。`main` 分支不会产生 bot commit，本地不用反复 `fetch && rebase`。

## 能看什么

- **每日日报** `reports/YYYY-MM-DD.html`：S/A/B 分级、打分明细、项目简介、说人话/改哪一处/卖给谁/怎么交付、被淘汰原因，三套配色（摸鱼绿 / 白天 / 深夜），可单独转发。
- **历史归档 + 选品库** `index.html`：**报告日历**（GitHub 风格热力图，点方块直达当天日报）、**日期跳转**、**按月份折叠的紧凑列表**（年份 / 关键词筛选、展开收起全部），并对所有历史项目做关键词搜索（项目名、简介、方向、语言、许可证、落地三行）与方向筛选。日期再多也不用翻一长串卡片。
- **筛选设置** `settings.html`：图形化调整分数线、名额、六个评分维度权重与可接手度、红线开关、冷却天数、方向关键词和采集查询，实时用真实候选池重算预览，可下载配置或直接提交回仓库。
- **手动重跑**「↻ 立即重跑」：归档页、日报页、设置页顶部都有；配好 Secret `RADAR_PAT` 后，解锁页面即可一键触发 workflow，全程不用填 Token，也不必去 GitHub 网页点 Run workflow。
- **项目简介**：日报卡片与选品库都展示一句项目说明，取值优先级为 AI 生成的中文简介 → GitHub 原始 `description` → README 首段（去 HTML/Markdown），超长截断；简介并入搜索关键词。AI 未启用时显示英文原始描述。
- **站点图标** `site/favicon.svg`：登录页与解锁后的页面共用，日报走 `../favicon.svg`。
- **原始数据** `data/*.json`：每天一份；`ledger.json` 记冷却账本，`stars.json` 记跨天星数快照（用来算「今日 +xxx」），`pool.json` 是给设置页做预览的候选池快照。默认存在 `radar-data` 分支，见「历史数据持久层」。

## 部署

1. 把本仓库推到自己的 GitHub 账号（私有仓库也可以，Pages 需按账号套餐）。
2. **Settings → Secrets and variables → Actions → Secrets**，添加以下 repository secrets（前三个必填）：

   | 名称 | 说明 |
   |---|---|
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID， Workers & Pages 概览页右侧可见 |
   | `CLOUDFLARE_API_TOKEN` | 创建 API Token，权限 `Account → Workers AI → Read/Edit` |
   | `RADAR_PASSWORD` | 站点访问密码（不设则站点保持公开） |
   | `RADAR_PAT`（可选） | 免填重跑用的 fine-grained PAT，见「手动重跑按钮与凭证」；不配则页面回退到手填模式 |

   不需要 `GITHUB_TOKEN`（workflow 直接用内置的 `github.token`）；`RADAR_REPO` 也由 `${{ github.repository }}` 自动注入，供设置页「一键提交」与重跑按钮定位仓库，无需手工配置。
3. **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
4. **Actions → 每日 GitHub 副业雷达 → Run workflow** 手动跑第一次；之后也可以直接在站点点「↻ 立即重跑」。
5. 之后每天 UTC 00:00（北京时间 08:00）自动运行；往 `main` push 代码也会自动触发一次完整运行并发布，详见下节。

访问地址：默认是 `https://<用户名>.github.io/<仓库名>/`；本实例绑定了自定义域 **`https://gh-radar.ieop.top/`**，日报路径形如 `/reports/YYYY-MM-DD.html`。

### 自定义域注意事项

- 用户站点仓库（`<用户名>.github.io`）根目录若残留 `CNAME`，会把**该账号下所有项目 Pages** 一起 301 到那个域名；域名不用了就删掉该文件或在 Pages 设置里 Remove。
- Cloudflare 上的 CNAME 建议设为「仅 DNS」（灰云）。「已代理」（橙云）会把 CNAME 展平成 Cloudflare 的 A 记录，GitHub 校验不到指向 `<用户名>.github.io` 的 CNAME，于是报 `DNS check unsuccessful / InvalidDNSError`，也无法签发证书或开启 Enforce HTTPS；浏览器仍可访问，但 HTTPS 靠的是 Cloudflare 边缘证书。
- `github.io` 地址会跳转到自定义域，且可能落到 `http`；口令门依赖 Web Crypto，登录壳会自动跳回 https。日常直接用 https 的自定义域地址。

### 可选变量

在 Settings → Secrets and variables → Actions → **Variables** 里设置：

- `CF_AI_MODEL`：默认 `@cf/zai-org/glm-4.7-flash`（免费计划可用、131k 上下文、多语言）。可换成 Cloudflare 模型目录中其它**免费**模型。本项目不调用任何第三方 LLM。
- `RADAR_STORAGE`：默认留空（数据写 `radar-data` 分支）。设成 `cache` 可切换到**真·零 commit** 的缓存模式，见下节。
- `RADAR_DATA_BRANCH`：自定义数据分支名，默认 `radar-data`。
- 分数线、名额、权重等筛选参数不在这里设，见下节「筛选设置」。

缺凭据或 Workers AI 调用失败时，会自动降级成模板文案，并在报告页脚标注「AI 未启用」，不会伪装成 AI 生成。

## push 自动触发

`daily.yml` 除了每天定时和 `workflow_dispatch`，还监听 `main` 分支的 push：

- 改动涉及代码或配置（`scripts/**`、`radar.config.json`、workflow 本身等）时，**自动跑完整流程**：重新扫描、调 AI、生成当日日报、发布 Pages。改渲染、密码、图标、筛选参数后，push 完就生效。
- `paths-ignore` 排除 `site/**` 与 `*.md`：只改文档或站点产物时不会浪费一次扫描。
- **不会无限循环**：历史数据回写发生在 `radar-data` 分支，而 `on.push` 只监听 `main`；内置 `github.token` 产生的 push 也不会再创建新 run。
- 设置页「一键提交」用 fine-grained PAT 修改 `radar.config.json` 的那次 commit 属于普通 push，会**立即触发一次重算**，新参数当天就生效。
- 同一天多次 push 会重跑扫描，但**冷却账本会忽略当天写入的条目**，不会出现「第二次跑，日报从 8 个骤减到 1 个」；跨天的 7 天项目冷却 / 14 天方向冷却照常生效。
- 手动 Run workflow 与站点的「立即重跑」都保留，随时可强制补跑；`schedule` 与 push 撞车时由 `concurrency: git-radar` 排队，不会互相取消。

> 注意：push 触发的是**完整扫描**，会重新消耗一次 GitHub API 与 Workers AI 免费额度；但不会再往 `main` 写任何 bot commit。纯改 README 不会触发。

## 手动重跑按钮与凭证

归档页、日报页、设置页右上角都有「↻ 立即重跑」。点开后点「触发重跑」即可；页面直接调 `POST /repos/{repo}/actions/workflows/daily.yml/dispatches`，等价于在 GitHub 网页点 Run workflow，约 1 分钟后刷新就能看到新日报。

浏览器要调 GitHub 写接口就必须带凭证，三档任选（按免填程度排序）：

| 档位 | 配置 | 体验 | 代价 |
|---|---|---|---|
| **A. 站点内置（推荐）** | 仓库 Secret 加 `RADAR_PAT` | 输一次站点密码，之后所有设备、所有浏览器**永久免填**，直接点按钮 | PAT 随加密页下发，能解锁页面的人可在浏览器里读到它 |
| **B. 本机记住** | 面板勾「记住此 Token」 | 填一次，本机长期免填 | 明文存浏览器 localStorage；换设备 / 清缓存要重填 |
| **C. 不配置** | 什么都不做 | 每次新标签页手填；或点「在 GitHub 上手动 Run workflow ↗」在网页上跑 | 最啰嗦，但零凭证下发 |

### 档位 A：一次性配置

1. 在 GitHub **头像 → Settings → Developer settings → Personal access tokens → Fine-grained tokens** 建一个 PAT：
   - Resource owner 选自己；Repository access 选 `Only select repositories` → 只勾本仓库；过期时间建议 90 天。
   - Repository permissions：**Actions: Read and write**（重跑）+ **Contents: Read and write**（设置页一键提交）；其余全部 No access。
   - 已有 PAT 直接点进去改权限并保存即可，Token 字符串不变，不用重新生成。
2. **Settings → Secrets and variables → Actions → Secrets → New repository secret**，名称 `RADAR_PAT`，值填这串 PAT。
3. 跑一次 workflow（Actions 手动 Run，或在站点用旧方式手填一次 Token 点重跑）。每次运行都会用当前 Secret 全量重渲染并重新加密所有页面，之后新页面就内置了凭证。

**安全边界**：`RADAR_PAT` 只在 Actions 构建时注入**已加密的页面**，公开的仓库源码、Pages artifact、静态 HTML 里都只有密文，不含明文 PAT；`RADAR_PASSWORD` 为空（明文站）时代码会直接忽略并告警，不会把凭证写进公开页面。但能解锁页面的人可以在浏览器开发者工具里读到它 —— 所以务必用上面那种最小权限、单仓库、有过期时间的 fine-grained PAT，最坏影响也只是「别人能触发重跑 / 改 `radar.config.json`」。PAT 过期或轮换后，更新 Secret 再跑一次 workflow 即可，不用改代码。

**发布前的自动闸门**：workflow 在上传 Pages artifact 前会扫一遍 `site/` 下的 `.html/.js/.json`，只要出现明文 PAT（fine-grained 与经典 token 格式都认）就直接 `exit 1` 中止发布，并且只报告命中文件数、不打印命中内容，避免检查动作本身把凭证写进公开日志。所以即便将来口令门被关掉、或注入逻辑被改坏，也不会把 Token 推到公开站点上。构建日志里关于凭证只有「已注入 / 未启用」这类状态字样，从不打印值。

**本机操作的边界**：手填的 Token 只存在浏览器 `sessionStorage` / `localStorage`，从不回写仓库或配置文件；`scripts/protect.mjs` 和 `RADAR_OFFLINE=1` 在未设 `RADAR_PASSWORD` 时会拒绝注入并告警，不会产出含 PAT 的明文页面。源码里唯一的 `github_pat_...` 是输入框占位符，不是凭证。想自查可在仓库根目录跑 `grep -rnE "github_pat_[A-Za-z0-9_]{20,}" --exclude-dir=.git .`，正常应无输出。

**清除与优先级**：面板「清除本机保存」会清掉本机记住的手填 Token，档位 A 下会恢复使用站点内置凭证。读取优先级为 **页面内置 > 本标签页手填 > 本机记住**；手填的值可以临时覆盖内置凭证。

### 其他

- `workflow_dispatch` 一直保留，任何时候都能在 GitHub 网页或 Actions API 手动触发。
- 重跑是完整扫描，会重新消耗一次 GitHub API 与 Workers AI 免费额度；同日重跑会忽略当天账本，不会把 8 个推荐砍成 1 个。

## 历史数据持久层（回写 bot commit 能避免吗）

原来 workflow 每天把日报 `git commit && git push` 回 `main`，结果：本地仓库总是落后（push 前要 `fetch && rebase`）、`git log` 被 `chore: 副业雷达日报 …` 刷屏、手动重跑和 push 自动触发又各加一条。

现在有两档，**`main` 上永远没有 bot commit**：

| 模式 | 怎么设 | 提交数 | 历史留存 |
|---|---|---|---|
| `branch`（默认） | 不用设 | `radar-data` 分支每次数据变化 1 条；`main` **0 条** | Git 永久留存 |
| `cache` | Variables 加 `RADAR_STORAGE=cache` | **全仓库 0 条** | Actions cache 全量快照，缓存 7 天未访问会被回收 |

### 默认：radar-data 分支

`scripts/store.mjs` 用 Git Data API（`github.token` + `contents: write`）在运行前 `pull`、运行后 `push`：

- `radar-data` 是一条与 `main` 无关的 orphan 分支，只放 `site/data/*.json`，不污染代码历史；`main` 里的 `site/data/*.json` 保留为只读种子，首次运行会自动迁过去，已有历史不会丢。
- 每次运行只创建**一条** commit（数据完全没变则直接跳过），是带 parent 的正常增量提交，不 force push；`concurrency: git-radar` 保证不会并发写。
- 该分支的 push 被 `on.push.branches: [main]` 过滤，不会触发新 run；`paths-ignore: site/**` 是第二道保险。
- 用 Node 22 内置 `fetch` 直接调 API，不切分支、不 clone、不需要额外 Secret。

### 可选：真·零 commit

设 `RADAR_STORAGE=cache` 后，workflow 改用 `actions/cache/restore@v5` / `actions/cache/save@v5`（Node 24 版本，不会有 Node 20 弃用警告），把 `site/data` 全量快照存进 Actions cache，全程不调用任何 git 写接口。

代价：GitHub 会回收**超过 7 天未被访问**的缓存。每天定时跑会持续续命，但仓库停跑超过一周可能丢历史。想同时要「零 commit」和「绝对永久」，只能换外部存储（例如 Cloudflare Workers KV / R2），本项目暂未内置 —— 默认档就是为此保留 Git 的永久留存。

> 切回 `branch` 时，缓存模式期间积累的数据在 `radar-data` 分支上是不存在的，会以 `main` 里的种子为起点重新开始；只在确定长期用缓存模式时才切换。

## 筛选设置

所有筛选参数的唯一来源是仓库根目录的 **`radar.config.json`**。Actions 每次运行都读它，`scripts/rules.mjs` 负责归一化（类型检查、范围钳制、非法正则回退），所以手改坏了也不会让定时任务崩掉。

站点里的 **筛选设置** 页（归档首页和日报顶部都有入口，同样受口令门保护）可以不用碰代码：

- 基础参数：分数线 `minScore`、每日名额 `maxPicks`、候选池上限、README 抓取数、最低星数、最长未提交天数、项目/方向冷却天数、两条红线开关。
- 评分权重：六个维度 + 等级线 + 可接手度加减项。**权重按总和归一化**，改动只调整各维度重要性，分数线始终按百分制解释，不会出现「改了权重分数线就变了」。
- 判定阈值：汉字比例、issue/星数比、仓库体积、项目年龄的分档。
- 高级：方向识别正则、六类关键词正则、GitHub Search 查询（`{dN}` 会展开成 N 天前的日期）。
- **实时预览**：页面内联了与 Actions 完全相同的 `rules.mjs` 源码，用 `site/data/pool.json`（最近一次扫描的候选池）重算分数线、红线淘汰和入选名单。预览不含冷却账本，正式运行还会再排一次。

改完有四种落地方式：

1. **下载** `radar.config.json`，放回仓库根目录并 push。
2. **复制** 配置内容，粘贴到 GitHub 网页编辑器。
3. **导入** 已有的配置文件，继续在上面改。
4. **一键提交**：页面底部展开「直接提交到 GitHub」，走 GitHub Contents API commit。它与「立即重跑」共用同一个 Token：配了 Secret `RADAR_PAT` 时自动填好、无需操作；否则手填（可勾「记住此 Token」存到本机）。该 Token 需要本仓库 **Contents: read/write**，重跑还需要 **Actions: read/write**，详见上节。

另有「撤销改动」可还原到线上配置。配置改动在**下一次运行**生效：用「一键提交」或把配置 push 到 `main` 会自动触发一次重算，也可以点「立即重跑」或手动 Run workflow；配置改动不会改写已生成的历史报告。

## 访问密码

设了 `RADAR_PASSWORD` 后，每个页面（归档首页、所有历史日报和筛选设置页）都会变成一个密码门：

- 页面源码里**只有密文**，没有密码，也没有明文内容。用 PBKDF2-SHA256（15 万轮）+ AES-GCM 加密，浏览器端用 Web Crypto 本地解密，解密失败即提示密码错误。
- 解密成功后在同一标签页内自动记住（`sessionStorage`），刷新、点进历史日报都无需重输；关闭标签页即失效。
- **改密码**：更新 Secret 后手动跑一次 workflow（或点「立即重跑」）即可 —— 每次运行都会用当前密码全量重渲染所有历史页，不会出现新旧密码混用。
- **关闭密码**：删掉 Secret 再跑一次，页面会重新变回明文。
- 本地不设密码也能正常生成明文页面；想验证加密效果：

```bash
RADAR_PASSWORD=你的密码 node scripts/protect.mjs     # 只用已有数据离线重建，不联网
RADAR_OFFLINE=1 RADAR_PASSWORD=你的密码 node scripts/run.mjs
```

> 注意：这是静态站点能做到的强度，挡的是「直接打开网页」。仓库若是 public，`site/data/*.json` 在 **GitHub 源码里**（`main` 的种子文件与 `radar-data` 分支）仍是明文（Pages 发布前会移除该目录）。要彻底保密请把仓库设为 private，或改用 Cloudflare Access 之类的边缘鉴权。

## 本地运行

```bash
node scripts/run.mjs          # 真实扫描一次，产物写入 site/
node scripts/preview.mjs      # 生成 3 天示例数据到 preview/，仅供本地看效果
node scripts/store.mjs pull   # 需要 GITHUB_TOKEN + RADAR_REPO，从数据分支恢复历史
node scripts/store.mjs push   # 把 site/data 回写到数据分支（Actions 里自动调用）
```

本地不配 Cloudflare 凭据也能跑（走模板降级）。想用真 AI 就设 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN` 环境变量。设 `RADAR_GITHUB_TOKEN` 可避免 GitHub 匿名 60 次/小时的限流。

## 目录

```
radar.config.json             筛选参数唯一来源（设置页导出的就是它）
.github/workflows/daily.yml   定时 + push + 手动触发、数据恢复/回写、Pages 发布
scripts/core.mjs              GitHub 采集（Search 查询、README、星数快照）
scripts/rules.mjs             配置归一化 + 红线 + 六维打分/可接手度 + 冷却（Node 与设置页共用，零依赖纯函数）
scripts/cf-ai.mjs             Workers AI 免费模型 REST 调用（含失败降级）
scripts/run.mjs               主流程编排
scripts/store.mjs             历史数据持久层（radar-data 分支 pull/push）
scripts/render.mjs            日报、归档页（日历/月份折叠/选品库）、筛选设置页、重跑面板 HTML 渲染
scripts/auth.mjs              整页 AES-GCM 加密 + 登录壳 + 全量重建页面
scripts/protect.mjs           离线重建/换密码（不联网）
scripts/preview.mjs           示例预览生成器
site/favicon.svg              站点图标（登录页与解锁后的页面共用，日报走 ../favicon.svg）
site/settings.html            筛选设置页（每次重建生成，同样加密）
site/                         Pages 发布目录（日报 + 归档 + 设置页）；data/ 只留仓库，发布前移除
```

## 几点说明

- GitHub 没有官方 Trending API，也没有「今日涨星」字段：榜单用 Search API 组合近似，日增星靠跨天星数快照相减，**跑满两天后才会出现「今日 +xxx」**。
- 评分规则复刻自公开文章，偏宽松；嫌松可以在筛选设置页调高「入选分数线」，或降低许可证/时效红利的权重。
- Actions 的 `schedule` 在整点高峰期可能延迟几分钟，且不保证必定触发，可用站点「立即重跑」或 `workflow_dispatch` 手动补跑。
- Workers AI 免费额度 10000 Neurons/天，一天一次批量请求绰绰有余。默认模型是推理 + OpenAI 兼容模型：`scripts/cf-ai.mjs` 优先请求 `/ai/v1/chat/completions`（`max_completion_tokens: 8192`），失败回退经典 `/ai/run/{model}` 并带 gateway 头重试；解析兼容 `content` / `response` / `output_text` / `reasoning_content` 等结构。**推理模型容易把预算全花在思维链上**（实测输出「Analyze the Request…」而 `content` 为空），所以提示词明确禁止输出分析过程、解析层只接受能提取出 JSON 数组的文本、拿不到就换端点重试；确实失败时会把 `finish_reason`、字段名与文本长度写进 `aiError`。若模型始终不配合，把 `CF_AI_MODEL` 换成模型目录里的免费 instruct 模型。
- workflow 里的官方 action 已全部升级到 Node 24 版本（`checkout@v7`、`setup-node@v7`、`configure-pages@v6`、`upload-pages-artifact@v5`、`deploy-pages@v5`；缓存模式用 `actions/cache/restore@v5`、`save@v5`）；继续用 v4/v5 会收到 `Node.js 20 is deprecated` 警告。项目脚本本身仍跑 Node 22。
- 改了渲染、页面、图标或配置后，push 到 `main` 会自动重新发布；但**改密码 Secret 本身不会触发 push**，需要再 push 任意代码、点「立即重跑」或手动 Run workflow，才会用新密码全量重新加密所有历史页。
- 每次运行会把当期完整候选池写入 `site/data/pool.json`；本地未跑真实扫描时该文件不存在，设置页预览会退化为历史入选项目、红线淘汰显示为 0。
