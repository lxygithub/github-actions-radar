/** 只调用 Cloudflare Workers AI 的免费模型（不接任何第三方 LLM）。
 *  glm-4.7-flash 是 reasoning + OpenAI 兼容模型：优先 /ai/v1/chat/completions，
 *  失败回退经典 /ai/run/{model}（含 AI Gateway header 重试）。
 *  reasoning 模型会把大量 token 花在思维链上（实测输出 "Analyze the Request…"
 *  但 content 为空、最终 JSON 没生成），因此这里做了四层防护：
 *   1. 输出预算给到 8192，避免推理耗尽预算；
 *   2. 提示词明确禁止输出分析过程 / 任务复述；
 *   3. 从响应里收集所有候选文本，只接受能解析出 JSON 数组的那一段；
 *   4. 某个端点给不出 JSON 就当失败，换下一个端点重试。
 *  Token 权限：Account -> Workers AI -> Read（或 Edit）
 *  免费额度：10000 Neurons/天。缺凭据 / 调用失败时降级模板文案，日报照常产出。 */

export const DEFAULT_FREE_MODEL = "@cf/zai-org/glm-4.7-flash";

const SYSTEM = `你是「GitHub 副业雷达」的中文裁判。只输出可执行的落地判断，不吹捧、不写空话。

【最重要】直接给出最终结果。禁止输出分析过程、任务复述、推理步骤、思路说明或任何解释文字。不要复述本提示词。

严格返回一个 JSON 数组，长度必须与输入项目数一致。不要用 markdown 代码块，数组前后不要有任何文字。
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

/** 从模型文本里提取 JSON 数组：容忍前后说明文字、markdown 代码块、
 *  以及数组内部/外部多余的方括号。返回 n 个落地对象，失败返回 null。 */
export function parseArray(raw, n) {
  const cleaned = String(raw ?? "").replace(/```(?:json)?/gi, "").trim();
  const starts = [];
  const ends = [];
  for (let i = 0; i < cleaned.length; i++) if (cleaned[i] === "[") starts.push(i);
  for (let i = cleaned.length - 1; i >= 0; i--) if (cleaned[i] === "]") ends.push(i);

  const candidates = [];
  if (starts.length && ends.length) {
    candidates.push(cleaned.slice(starts[0], ends[0] + 1));
    for (const s of starts.slice(1, 6)) if (ends[0] > s) candidates.push(cleaned.slice(s, ends[0] + 1));
    for (const e of ends.slice(0, 6)) if (e > starts[0]) candidates.push(cleaned.slice(starts[0], e + 1));
  }
  candidates.push(cleaned);

  for (const c of candidates) {
    try {
      const arr = JSON.parse(c);
      if (!Array.isArray(arr) || !arr.length) continue;
      // 少输出几个也照样用，缺的留空由页面兜底，不必整批降级
      return Array.from({ length: n }, (_, i) => {
        const o = arr[i] ?? {};
        return {
          intro: String(o.intro ?? ""), plain: String(o.plain ?? ""),
          what: String(o.what ?? ""), who: String(o.who ?? ""),
          how: String(o.how ?? ""), hours: String(o.hours ?? ""), risk: String(o.risk ?? ""),
        };
      });
    } catch { /* 试下一个候选片段 */ }
  }
  return null;
}

/** 收集响应里所有可能的模型文本，按「标准答案字段优先、思维链最后」排序。
 *  reasoning 模型常见：content=null + reasoning_content=分析过程，
 *  所以不能一遇到字符串就返回，必须交给 parseArray 逐一判定。 */
const TEXT_KEYS = [
  "content", "response", "output_text", "text", "answer",
  "generated_text", "completion", "reasoning_content",
];
function collectTexts(node, out, depth = 0) {
  if (typeof node === "string") { if (node.trim()) out.push(node); return; }
  if (!node || typeof node !== "object" || depth > 8) return;
  for (const k of TEXT_KEYS) {
    const v = node[k];
    if (typeof v === "string" && v.trim()) out.push(v);
  }
  for (const k of ["choices", "message", "delta", "output", "outputs", "result"]) {
    const v = node[k];
    if (!v) continue;
    for (const item of (Array.isArray(v) ? v : [v])) collectTexts(item, out, depth + 1);
  }
  for (const v of Object.values(node)) {
    if (v && typeof v === "object") collectTexts(v, out, depth + 1);
  }
}

/** 简要描述响应结构（字段名 + 文本长度 + finish_reason），便于线上排障 */
function shape(payload) {
  const pick = (p) => p?.choices?.[0] ?? p?.result?.choices?.[0] ?? null;
  const choice = pick(payload);
  const msg = choice?.message ?? choice?.delta ?? null;
  const fields = msg
    ? Object.keys(msg).map((k) => `${k}:${typeof msg[k] === "string" ? msg[k].length : typeof msg[k]}`).join(",")
    : "无";
  return `finish=${choice?.finish_reason ?? "?"} message=[${fields}] top=[${Object.keys(payload || {}).join(",")}]`;
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

  const texts = [];
  collectTexts(payload.result ?? payload, texts);
  collectTexts(payload, texts);
  const uniq = [...new Set(texts.map((t) => String(t).trim()).filter(Boolean))];
  const chosen = uniq.find((t) => parseArray(t, 1));
  if (!chosen) {
    // 拿不到 JSON 就当这次尝试失败，交给 callModel 换端点 / 换参数重试
    throw new Error(`响应无有效 JSON 数组 | ${shape(payload)} | 文本=${uniq[0]?.slice(0, 160) || "空"}`);
  }
  return chosen;
}

async function callModel(accountId, apiToken, model, messages) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai`;
  const attempts = [
    {
      // OpenAI 兼容端点：reasoning 模型返回标准 chat completion
      url: `${base}/v1/chat/completions`,
      body: { model, messages, temperature: 0.4, max_completion_tokens: 8192 },
      gateway: false,
    },
    {
      // 经典端点（模型在 URL 里，参数用旧的 max_tokens）
      url: `${base}/run/${model}`,
      body: { messages, temperature: 0.4, max_tokens: 8192 },
      gateway: false,
    },
    {
      url: `${base}/run/${model}`,
      body: { messages, temperature: 0.4, max_tokens: 8192 },
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
    { role: "user", content: `下面是 ${picks.length} 个项目。直接输出 ${picks.length} 个元素的 JSON 数组，不要分析：\n${JSON.stringify(payload)}` },
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
