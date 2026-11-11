# github-actions-radar

每天自动扫描 GitHub 新项目，按「可接手度」打分，用 **Cloudflare Workers AI 免费模型** 补中文落地建议，生成日报并永久归档成可搜索的选品库。

零 npm 依赖，只用 Node 22 内置 `fetch` / `fs`。调度、存储、托管全在 GitHub：Actions 定时跑 → 报告 commit 回仓库 → Pages 发布。

## 能看什么

- **每日日报** `reports/YYYY-MM-DD.html`：S/A/B 分级、打分明细、项目简介、说人话/改哪一处/卖给谁/怎么交付、被淘汰原因，三套配色（摸鱼绿 / 白天 / 深夜），可单独转发。
- **历史归档 + 选品库** `index.html`：按日期倒序翻全部历史报告，并对所有历史项目做关键词搜索（项目名、简介、方向、语言、许可证、落地三行）与方向筛选。
- **筛选设置** `settings.html`：图形化调整分数线、名额、六个评分维度权重与可接手度、红线开关、冷却天数、方向关键词和采集查询，实时用真实候选池重算预览，可下载配置或直接提交回仓库。
- **项目简介**：日报卡片与选品库都展示一句项目说明，取值优先级为 AI 生成的中文简介 → GitHub 原始 `description` → README 首段（去 HTML/Markdown），超长截断；简介并入搜索关键词。AI 未启用时显示英文原始描述。
- **站点图标** `site/favicon.svg`：登录页与解锁后的页面共用，日报走 `../favicon.svg`。
- **原始数据** `data/*.json`：每天一份，Git 就是持久层；`ledger.json` 记冷却账本，`stars.json` 记跨天星数快照（用来算「今日 +xxx」），`pool.json` 是给设置页做预览的候选池快照。

## 部署

1. 把本仓库推到自己的 GitHub 账号（私有仓库也可以，Pages 需按账号套餐）。
2. **Settings → Secrets and variables → Actions → Secrets**，添加三个 repository secrets：

   | 名称 | 说明 |
   |---|---|
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID， Workers & Pages 概览页右侧可见 |
   | `CLOUDFLARE_API_TOKEN` | 创建 API Token，权限 `Account → Workers AI → Read/Edit` |
   | `RADAR_PASSWORD` | 站点访问密码（不设则站点保持公开） |

   不需要 `GITHUB_TOKEN`（workflow 直接用内置的 `github.token`）；`RADAR_REPO` 也由 `${{ github.repository }}` 自动注入，供设置页「一键提交」定位仓库，无需手工配置。
3. **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
4. **Actions → 每日 GitHub 副业雷达 → Run workflow** 手动跑第一次。
5. 之后每天 UTC 00:00（北京时间 08:00）自动运行，日报回写仓库并发布。

访问地址：默认是 `https://<用户名>.github.io/<仓库名>/`；本实例绑定了自定义域 **`https://gh-radar.ieop.top/`**，日报路径形如 `/reports/YYYY-MM-DD.html`。

### 自定义域注意事项

- 用户站点仓库（`<用户名>.github.io`）根目录若残留 `CNAME`，会把**该账号下所有项目 Pages** 一起 301 到那个域名；域名不用了就删掉该文件或在 Pages 设置里 Remove。
- Cloudflare 上的 CNAME 建议设为「仅 DNS」（灰云）。「已代理」（橙云）会把 CNAME 展平成 Cloudflare 的 A 记录，GitHub 校验不到指向 `<用户名>.github.io` 的 CNAME，于是报 `DNS check unsuccessful / InvalidDNSError`，也无法签发证书或开启 Enforce HTTPS；浏览器仍可访问，但 HTTPS 靠的是 Cloudflare 边缘证书。
- `github.io` 地址会跳转到自定义域，且可能落到 `http`；口令门依赖 Web Crypto，登录壳会自动跳回 https。日常直接用 https 的自定义域地址。

### 可选变量

在 Settings → Secrets and variables → Actions → **Variables** 里设置：

- `CF_AI_MODEL`：默认 `@cf/zai-org/glm-4.7-flash`（免费计划可用、131k 上下文、多语言）。可换成 Cloudflare 模型目录中其它**免费**模型。本项目不调用任何第三方 LLM。
- 分数线、名额、权重等筛选参数不在这里设，见下节「筛选设置」。

缺凭据或 Workers AI 调用失败时，会自动降级成模板文案，并在报告页脚标注「AI 未启用」，不会伪装成 AI 生成。

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
4. **一键提交**：页面底部展开「直接提交到 GitHub」，用只授予该仓库 Contents 读写权限的 fine-grained PAT 走 GitHub Contents API commit（Token 只在当前页面内存中使用，不落盘、不写 localStorage）。

另有「撤销改动」可还原到线上配置。**下一次定时任务运行才生效**，想立刻看效果就手动 Run workflow；配置改动不会改写已生成的历史报告。

## 访问密码

设了 `RADAR_PASSWORD` 后，每个页面（归档首页、所有历史日报和筛选设置页）都会变成一个密码门：

- 页面源码里**只有密文**，没有密码，也没有明文内容。用 PBKDF2-SHA256（15 万轮）+ AES-GCM 加密，浏览器端用 Web Crypto 本地解密，解密失败即提示密码错误。
- 解密成功后在同一标签页内自动记住（`sessionStorage`），刷新、点进历史日报都无需重输；关闭标签页即失效。
- **改密码**：更新 Secret 后手动跑一次 workflow 即可 —— 每天运行时会用当前密码全量重渲染所有历史页，不会出现新旧密码混用。
- **关闭密码**：删掉 Secret 再跑一次，页面会重新变回明文。
- 本地不设密码也能正常生成明文页面；想验证加密效果：

```bash
RADAR_PASSWORD=你的密码 node scripts/protect.mjs     # 只用已有数据离线重建，不联网
RADAR_OFFLINE=1 RADAR_PASSWORD=你的密码 node scripts/run.mjs
```

> 注意：这是静态站点能做到的强度，挡的是「直接打开网页」。仓库若是 public，`site/data/*.json` 在 **GitHub 源码里**仍是明文（Pages 发布前会移除该目录，但仓库历史里能看到）。要彻底保密请把仓库设为 private，或改用 Cloudflare Access 之类的边缘鉴权。

## 本地运行

```bash
node scripts/run.mjs          # 真实扫描一次，产物写入 site/
node scripts/preview.mjs      # 生成 3 天示例数据到 preview/，仅供本地看效果
```

本地不配 Cloudflare 凭据也能跑（走模板降级）。想用真 AI 就设 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN` 环境变量。设 `RADAR_GITHUB_TOKEN` 可避免 GitHub 匿名 60 次/小时的限流。

## 目录

```
radar.config.json             筛选参数唯一来源（设置页导出的就是它）
.github/workflows/daily.yml   定时 + 报告回写 + Pages 发布
scripts/core.mjs              GitHub 采集（Search 查询、README、星数快照）
scripts/rules.mjs             配置归一化 + 红线 + 六维打分/可接手度 + 冷却（Node 与设置页共用，零依赖纯函数）
scripts/cf-ai.mjs             Workers AI 免费模型 REST 调用（含失败降级）
scripts/run.mjs               主流程编排
scripts/render.mjs            日报、归档页、筛选设置页 HTML 渲染
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
- Actions 的 `schedule` 在整点高峰期可能延迟几分钟，且不保证必定触发，可用 `workflow_dispatch` 手动补跑。
- Workers AI 免费额度 10000 Neurons/天，一天一次批量请求绰绰有余。默认模型是推理 + OpenAI 兼容模型：`scripts/cf-ai.mjs` 优先请求 `/ai/v1/chat/completions`（`max_completion_tokens`），失败回退经典 `/ai/run/{model}` 并带 gateway 头重试；解析兼容 `content` / `response` / `output_text` / `reasoning_content` 等结构，推理模型返回 `content: null` 也能取到文本。确实取不到内容时会把 `finish_reason` 与响应结构写进 `aiError`，便于定位。
- workflow 里的官方 action 已全部升级到 Node 24 版本（`checkout@v7`、`setup-node@v7`、`configure-pages@v6`、`upload-pages-artifact@v5`、`deploy-pages@v5`）；继续用 v4/v5 会收到 `Node.js 20 is deprecated` 警告。项目脚本本身仍跑 Node 22。
- **`git push` 只更新仓库代码**，Pages 发布的是上一次 workflow 生成的 artifact。改了渲染、页面、密码或配置之后，要手动 Run workflow 一次才会真正上线。
- 每次运行会把当期完整候选池写入 `site/data/pool.json`；本地未跑真实扫描时该文件不存在，设置页预览会退化为历史入选项目、红线淘汰显示为 0。
