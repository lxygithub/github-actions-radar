/** 只调用 Cloudflare Workers AI 的免费模型（不接任何第三方 LLM）。
 *  REST: POST /accounts/{account_id}/ai/run/{model}
 *  Token 权限：Account -> Workers AI -> Read（或 Edit）
 *  免费额度：10000 Neurons/天，一天一次 8 个项目的批量请求绰绰有余。
 *  没配凭据 / 调用失败时降级成模板文案，日报照常产出。 */

export const DEFAULT_FREE_MODEL = "@cf/zai-org/glm-4.7-flash";

const SYSTEM = `你是「GitHub 副业雷达」的中文裁判。只输出可执行的落地判断，不吹捧、不写空话。
严格返回 JSON 数组，长度必须与输入项目数一致，不要 markdown 代码块，不要任何额外文字。
每个元素字段：plain(一句说人话)、what(具体改哪一处)、who(卖给谁、为什么买)、how(怎么交付)、hours(预计开发时长)、risk(最大的一个风险)。
如果某个项目写不出具体的 what/who/how，这三个字段一律写「不推荐」，绝对不要编造。
涉及破解、绕过平台限制的项目，全部字段写「不推荐」。`;

function fallback(r) {
  return {
    plain: r.description || `${r.name} 是一个用 ${r.language} 写的项目。`,
    what: `先包一层中文界面 / 配置，把 ${r.name} 的核心能力做成开箱即用的小工具`,
    who: "有明确需求、但不想自己搭环境的中小团队或内容创作者",
    how: "打包成成品 + 中文说明，按份交付或按部署次数收费",
    hours: "1–3 天（待人工核实）",
    risk:
      r.license === "NONE" || r.license === "NOASSERTION"
        ? "无明确许可证，商用前必须确认授权"
        : "需核实上游依赖稳定性，以及许可证是否允许闭源商用",
  };
}

function parseArray(raw, n) {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const arr = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(arr) || arr.length < n) return null;
    return Array.from({ length: n }, (_, i) => {
      const o = arr[i] ?? {};
      return {
        plain: String(o.plain ?? ""), what: String(o.what ?? ""), who: String(o.who ?? ""),
        how: String(o.how ?? ""), hours: String(o.hours ?? ""), risk: String(o.risk ?? ""),
      };
    });
  } catch {
    return null;
  }
}

async function runModel(accountId, apiToken, model, messages, withGateway) {
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
  // 新版 AI Gateway 通用端点要求该 header；经典 model-in-path 端点通常不需要。
  // 先不带，遇到 4xx 再带 default gateway 重试一次，两种账号配置都能跑通。
  if (withGateway) headers["cf-aig-gateway-id"] = "default";

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ messages, max_tokens: 1800, temperature: 0.4 }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Workers AI ${res.status}: ${text.slice(0, 300)}`);
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error(`返回非 JSON: ${text.slice(0, 200)}`); }
  if (payload.success === false) throw new Error(`Workers AI 业务错误: ${JSON.stringify(payload.errors).slice(0, 200)}`);
  const result = payload.result ?? payload;
  const content = result.response ?? result.choices?.[0]?.message?.content ?? result.text ?? "";
  if (!content) throw new Error("模型返回空内容");
  return String(content);
}

export async function enrich(picks, cfg = {}) {
  const fallbacks = picks.map(fallback);
  if (!picks.length) return { landings: [], aiUsed: false, model: null, error: null };

  const accountId = cfg.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = cfg.apiToken || process.env.CLOUDFLARE_API_TOKEN;
  const model = cfg.model || process.env.CF_AI_MODEL || DEFAULT_FREE_MODEL;

  if (!accountId || !apiToken) {
    return { landings: fallbacks, aiUsed: false, model, error: "未配置 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN" };
  }

  const payload = picks.map((r, i) => ({
    i, name: r.fullName, description: r.description, language: r.language,
    license: r.license, stars: r.stars, score: r.score,
    topics: r.topics.slice(0, 8), readme_excerpt: r.readmeHead.slice(0, 500),
  }));
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify(payload) },
  ];

  try {
    let raw;
    try {
      raw = await runModel(accountId, apiToken, model, messages, false);
    } catch (firstError) {
      if (!/Workers AI 4\d\d|Workers AI 400|Workers AI 401|Workers AI 403/.test(String(firstError))) throw firstError;
      raw = await runModel(accountId, apiToken, model, messages, true);
    }
    const parsed = parseArray(raw, picks.length);
    if (!parsed) throw new Error("模型输出不是合法 JSON 数组");
    return { landings: parsed, aiUsed: true, model, error: null };
  } catch (e) {
    console.warn("Workers AI 调用失败，降级模板文案:", String(e));
    return { landings: fallbacks, aiUsed: false, model, error: String(e) };
  }
}
