/** 只调用 Cloudflare Workers AI 的免费模型（不接任何第三方 LLM）。
 *  glm-4.7-flash 是 reasoning + OpenAI 兼容模型，优先走 /ai/v1/chat/completions，
 *  失败再回退经典 /ai/run/{model}（含 AI Gateway header 重试）。
 *  Token 权限：Account -> Workers AI -> Read（或 Edit）
 *  免费额度：10000 Neurons/天，一天一次 8 个项目的批量请求绰绰有余。
 *  没配凭据 / 调用失败时降级成模板文案，日报照常产出。 */

export const DEFAULT_FREE_MODEL = "@cf/zai-org/glm-4.7-flash";

const SYSTEM = `你是「GitHub 副业雷达」的中文裁判。只输出可执行的落地判断，不吹捧、不写空话。
严格返回 JSON 数组，长度必须与输入项目数一致，不要 markdown 代码块，不要任何额外文字。
每个元素字段：intro(一句中文说清这个项目原本是做什么的，只描述项目本身，不要写成副业建议)、plain(一句说人话讲清机会)、what(具体改哪一处)、who(卖给谁、为什么买)、how(怎么交付)、hours(预计开发时长)、risk(最大的一个风险)。
如果某个项目写不出具体的 what/who/how，这三个字段一律写「不推荐」，绝对不要编造。
涉及破解、绕过平台限制的项目，全部字段写「不推荐」。`;

function fallback(r) {
  return {
    // intro 留空，渲染层会回退到仓库原始描述，避免把英文简介冒充中文解说
    intro: "",
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
    // 少输出几个也照样用，缺的留空由页面兜底，不必整批降级
    if (!Array.isArray(arr) || !arr.length) return null;
    return Array.from({ length: n }, (_, i) => {
      const o = arr[i] ?? {};
      return {
        intro: String(o.intro ?? ""), plain: String(o.plain ?? ""),
        what: String(o.what ?? ""), who: String(o.who ?? ""),
        how: String(o.how ?? ""), hours: String(o.hours ?? ""), risk: String(o.risk ?? ""),
      };
    });
  } catch {
    return null;
  }
}

/** 从 Workers AI 的各种返回结构里找出模型文本。
 *  经典端点包 result，OpenAI 兼容端点不包；reasoning 模型的 content 可能为 null，
 *  因此按标准字段优先、再下钻 choices/message、最后浅层递归兜底。 */
const TEXT_KEYS = [
  "content", "response", "output_text", "text", "answer",
  "generated_text", "completion", "reasoning_content",
];
function extractText(node, depth = 0) {
  if (typeof node === "string") return node.trim() ? node : "";
  if (!node || typeof node !== "object" || depth > 8) return "";
  for (const k of TEXT_KEYS) {
    const v = node[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  for (const k of ["choices", "message", "delta", "output", "outputs", "result"]) {
    const v = node[k];
    if (!v) continue;
    for (const item of (Array.isArray(v) ? v : [v])) {
      const t = extractText(item, depth + 1);
      if (t) return t;
    }
  }
  for (const v of Object.values(node)) {
    if (v && typeof v === "object") {
      const t = extractText(v, depth + 1);
      if (t) return t;
    }
  }
  return "";
}

function brief(payload) {
  try {
    const s = JSON.stringify(payload);
    return s.length > 420 ? `${s.slice(0, 420)}…` : s;
  } catch {
    return String(payload).slice(0, 420);
  }
}

async function postJSON(url, apiToken, body, withGateway) {
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
  // 部分账号的经典端点需要 default gateway header，留作最后兜底
  if (withGateway) headers["cf-aig-gateway-id"] = "default";

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error(`返回非 JSON: ${text.slice(0, 200)}`); }
  if (payload.success === false) {
    throw new Error(`业务错误: ${JSON.stringify(payload.errors).slice(0, 200)}`);
  }

  const content = extractText(payload.result ?? payload) || extractText(payload);
  if (!content) {
    const fr = payload.result?.choices?.[0]?.finish_reason
      ?? payload.choices?.[0]?.finish_reason ?? "未知";
    // 把响应结构写进日志，下次再出问题能一眼看出真实格式
    throw new Error(`空内容(finish_reason=${fr}): ${brief(payload)}`);
  }
  return String(content);
}

async function callModel(accountId, apiToken, model, messages) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai`;
  const attempts = [
    {
      // OpenAI 兼容端点：reasoning 模型返回标准 chat completion
      url: `${base}/v1/chat/completions`,
      body: { model, messages, temperature: 0.4, max_completion_tokens: 4096 },
      gateway: false,
    },
    {
      // 经典端点（模型在 URL 里，参数用旧的 max_tokens）
      url: `${base}/run/${model}`,
      body: { messages, temperature: 0.4, max_tokens: 4096 },
      gateway: false,
    },
    {
      url: `${base}/run/${model}`,
      body: { messages, temperature: 0.4, max_tokens: 4096 },
      gateway: true,
    },
  ];
  const errors = [];
  for (const a of attempts) {
    try { return await postJSON(a.url, apiToken, a.body, a.gateway); }
    catch (e) { errors.push(`[${errors.length + 1}] ${String(e)}`); }
  }
  throw new Error(errors.join(" | ").slice(0, 900));
}

export async function enrich(picks, cfg = {}) {
  const fallbacks = picks.map(fallback);
  if (!picks.length) return { landings: [], aiUsed: false, model: null, error: null };

  const accountId = cfg.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = cfg.apiToken || process.env.CLOUDFLARE_API_TOKEN;
  const model = cfg.model || process.env.CF_AI_MODEL || DEFAULT_FREE_MODEL;

  if (!accountId || !apiToken) {
    return {
      landings: fallbacks, aiUsed: false, model,
      error: "未配置 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN",
    };
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
    const raw = await callModel(accountId, apiToken, model, messages);
    const parsed = parseArray(raw, picks.length);
    if (!parsed) throw new Error(`模型输出不是合法 JSON 数组: ${raw.slice(0, 200)}`);
    return { landings: parsed, aiUsed: true, model, error: null };
  } catch (e) {
    console.warn("Workers AI 调用失败，降级模板文案:", String(e));
    return { landings: fallbacks, aiUsed: false, model, error: String(e) };
  }
}
