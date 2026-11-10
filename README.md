# github-actions-radar

每天自动扫描 GitHub 新项目，按「可接手度」打分，用 **Cloudflare Workers AI 免费模型** 补中文落地建议，生成日报并永久归档成可搜索的选品库。

零 npm 依赖，只用 Node 22 内置 `fetch` / `fs`。调度、存储、托管全在 GitHub：Actions 定时跑 → 报告 commit 回仓库 → Pages 发布。

## 能看什么

- **每日日报** `reports/YYYY-MM-DD.html`：S/A/B 分级、六维打分明细、说人话/改哪一处/卖给谁/怎么交付、被淘汰原因，三套配色（摸鱼绿 / 白天 / 深夜），可单独转发。
- **历史归档 + 选品库** `index.html`：按日期倒序翻全部历史报告，并对所有历史项目做关键词搜索（项目名、方向、语言、许可证、落地三行）与方向筛选。
- **原始数据** `data/*.json`：每天一份，Git 就是持久层；`ledger.json` 记冷却账本，`stars.json` 记跨天星数快照（用来算「今日 +xxx」）。

## 部署

1. 把本仓库推到自己的 GitHub 账号（私有仓库也可以，Pages 需按账号套餐）。
2. **Settings → Secrets and variables → Actions → Secrets**，添加两个 repository secrets：

   | 名称 | 说明 |
   |---|---|
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID， Workers & Pages 概览页右侧可见 |
   | `CLOUDFLARE_API_TOKEN` | 创建 API Token，权限 `Account → Workers AI → Read/Edit` |

   不需要 `GITHUB_TOKEN`：workflow 直接使用内置的 `github.token`。
3. **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
4. **Actions → 每日 GitHub 副业雷达 → Run workflow** 手动跑第一次。
5. 之后每天 UTC 00:00（北京时间 08:00）自动运行，日报回写仓库并发布。

访问地址：`https://<用户名>.github.io/<仓库名>/`。

### 可选变量

在 Settings → Secrets and variables → Actions → **Variables** 里设置：

- `CF_AI_MODEL`：默认 `@cf/zai-org/glm-4.7-flash`（免费计划可用、131k 上下文、多语言）。可换成 Cloudflare 模型目录中其它**免费**模型。本项目不调用任何第三方 LLM。
- 想改每日入选数量或分数门槛，编辑 `.github/workflows/daily.yml` 里的 `MAX_PICKS` / `MIN_SCORE`。

缺凭据或 Workers AI 调用失败时，会自动降级成模板文案，并在报告页脚标注「AI 未启用」，不会伪装成 AI 生成。

## 本地运行

```bash
node scripts/run.mjs          # 真实扫描一次，产物写入 site/
node scripts/preview.mjs      # 生成 3 天示例数据到 preview/，仅供本地看效果
```

本地不配 Cloudflare 凭据也能跑（走模板降级）。想用真 AI 就设 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN` 环境变量。设 `RADAR_GITHUB_TOKEN` 可避免 GitHub 匿名 60 次/小时的限流。

## 目录

```
.github/workflows/daily.yml   定时 + 报告回写 + Pages 发布
scripts/core.mjs              GitHub 采集、六维打分、红线过滤、冷却账本
scripts/cf-ai.mjs             Workers AI 免费模型 REST 调用（含失败降级）
scripts/run.mjs               主流程编排
scripts/render.mjs            日报与归档页 HTML 渲染
scripts/preview.mjs           示例预览生成器
site/                         Pages 发布目录（日报 + 归档 + JSON）
```

## 几点说明

- GitHub 没有官方 Trending API，也没有「今日涨星」字段：榜单用 Search API 组合近似，日增星靠跨天星数快照相减，**跑满两天后才会出现「今日 +xxx」**。
- 评分规则复刻自公开文章，偏宽松；嫌松可以调高 `MIN_SCORE`。
- Actions 的 `schedule` 在整点高峰期可能延迟几分钟，且不保证必定触发，可用 `workflow_dispatch` 手动补跑。
- Workers AI 免费额度 10000 Neurons/天，一天一次 8 个项目的批量请求绰绰有余。
