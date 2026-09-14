/**
 * 待办解析：transcript → deepseek-flash（JSON mode、关思考）→ zod 校验
 * → 失败带错误重试一次 → 仍失败以原文降级（宁可朴素不可报错）。
 *
 * 供应商抽象：VOICE_LLM_BASE_URL / VOICE_LLM_API_KEY / VOICE_LLM_MODEL 三个
 * 环境变量可整体切回百炼 qwen-flash，调用逻辑不变。
 * 隐私：不写日志（含 transcript 与解析结果）。
 */

import { z } from "zod";
import { getTodayKey } from "@/lib/date-utils";
import { guardVoiceRequest } from "@/lib/server/voice-request-guard";
import type { VoiceParsed } from "@/types/voice";

const TASK_LISTS = ["Inbox", "Work", "Study", "Life"] as const;

const ParsedSchema = z.object({
  isTodo: z.boolean(),
  title: z.string().nullable(),
  list: z.enum(TASK_LISTS).nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  reason: z.string().optional(),
});

function buildPrompt(today: string, tomorrow: string): string {
  const weekday = "日一二三四五六"[new Date(`${today}T12:00:00+08:00`).getDay()];
  return [
    "你是待办事项解析器，把语音转写文本解析为结构化待办，只输出一个 JSON 对象，不要输出任何其他内容。",
    `今天是 ${today}（星期${weekday}）。一周从周一开始。`,
    "可用清单：Inbox（默认）、Work（工作）、Study（学习）、Life（生活）。",
    "",
    "规则：",
    '1. title：去掉口语填充词（"帮我""提醒我""那个""记一下"），保留核心事项，不超过 30 字。',
    '2. date：输出 YYYY-MM-DD。相对日期口径："今天"=今天，"明天"=+1 天，"后天"=+2 天，"周X/星期X"=本周内未来最近的一天（本周已过则取下周），"下周X"=下一周的周X，"X月X号/X号"按今年推算。解析不出日期则 null。',
    '3. time：输出 24 小时制 HH:MM（"下午三点"=15:00，"上午十点半"=10:30）。只有时间没有日期时 date 为 null、time 有值。解析不出则 null。',
    '4. list：按事项语义匹配清单；拿不准或匹配不上用 "Inbox"。',
    "5. isTodo：寒暄、提问、闲聊、或模糊到无法形成具体事项时为 false，其余为 true。",
    "6. 输出字段齐全，无值用 null：",
    '{"isTodo":bool,"title":string|null,"list":"Inbox"|"Work"|"Study"|"Life"|null,"date":string|null,"time":string|null,"reason":"不超过20字的判定依据"}',
    "",
    "示例：",
    `输入"明天下午三点提醒我交房租" → {"isTodo":true,"title":"交房租","list":"Life","date":"${tomorrow}","time":"15:00","reason":"明确事项与时间"}`,
    '输入"今天天气怎么样" → {"isTodo":false,"title":null,"list":null,"date":null,"time":null,"reason":"提问非待办"}',
  ].join("\n");
}

/** 形状之外的语义校验：返回问题列表（供重试 prompt 与降级判断）。 */
function semanticProblems(value: z.infer<typeof ParsedSchema>, today: string): string[] {
  const problems: string[] = [];
  if (value.isTodo && !(value.title ?? "").trim()) {
    problems.push("isTodo 为 true 时 title 不能为空");
  }
  if (value.date !== null) {
    const { year, month, day } = splitDateKey(value.date);
    const date = new Date(Date.UTC(year, month, day));
    const normalized = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    if (normalized !== value.date) {
      problems.push(`date "${value.date}" 不是真实存在的日历日期`);
    } else if (value.date < today || daysBetween(today, value.date) > 180) {
      problems.push(`date "${value.date}" 超出今天起 180 天内的范围`);
    }
  }
  if (value.time !== null) {
    const [hour, minute] = value.time.split(":").map(Number);
    if (!/^\d{2}:\d{2}$/.test(value.time) || hour > 23 || minute > 59) {
      problems.push(`time "${value.time}" 不是合法的 HH:MM`);
    }
  }
  return problems;
}

function splitDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month: month - 1, day };
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function addDays(key: string, days: number): string {
  const date = new Date(Date.parse(`${key}T00:00:00Z`) + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/** 从模型输出里剥出 JSON（容忍 ```json 围栏或前后缀文本）。 */
function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced ? fenced[1] : content).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** 供应商解析：显式三元组优先；否则按"哪把 key 在"自动选平台（DeepSeek 官方 ↔ 百炼）。 */
function resolveProvider() {
  const hasDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
  return {
    baseUrl:
      process.env.VOICE_LLM_BASE_URL ??
      (hasDeepSeek
        ? "https://api.deepseek.com/v1"
        : "https://dashscope.aliyuncs.com/compatible-mode/v1"),
    apiKey:
      process.env.VOICE_LLM_API_KEY ??
      process.env.DEEPSEEK_API_KEY ??
      process.env.DASHSCOPE_API_KEY,
    model: process.env.VOICE_LLM_MODEL ?? (hasDeepSeek ? "deepseek-flash" : "qwen-flash"),
  };
}

async function callLlm(messages: { role: string; content: string }[]): Promise<string> {
  const { baseUrl, apiKey, model } = resolveProvider();
  if (!apiKey) throw new Error("not_configured");
  // 两家的非标准参数：DeepSeek V4 用 thinking 对象关思考；百炼 qwen 用 enable_thinking
  const isDeepSeek = baseUrl.includes("deepseek.com");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      response_format: { type: "json_object" },
      ...(isDeepSeek ? { thinking: { type: "disabled" } } : { enable_thinking: false }),
      stream: false,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`llm_http_${response.status}`);
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return payload.choices?.[0]?.message?.content ?? "";
}

function degrade(transcript: string): VoiceParsed {
  return {
    isTodo: true,
    title: transcript.slice(0, 60),
    list: "Inbox",
    date: null,
    time: null,
    reason: "",
    degraded: true,
  };
}

export async function POST(request: Request) {
  const rejected = guardVoiceRequest(request, {
    scope: "parse",
    limit: 16,
    maxBodyBytes: 4 * 1024,
  });
  if (rejected) return rejected;

  if (!resolveProvider().apiKey) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  let body: { transcript?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript || transcript.length > 500) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const today = getTodayKey();
  const messages: { role: string; content: string }[] = [
    { role: "system", content: buildPrompt(today, addDays(today, 1)) },
    { role: "user", content: transcript },
  ];

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await callLlm(messages);
      const raw = extractJson(content);
      if (raw) {
        const shape = ParsedSchema.safeParse(raw);
        if (shape.success) {
          const problems = semanticProblems(shape.data, today);
          if (!problems.length) {
            const value = shape.data;
            return Response.json(
              {
                parsed: {
                  isTodo: value.isTodo,
                  title: value.title ? value.title.trim().slice(0, 60) : null,
                  list: value.isTodo ? (value.list ?? "Inbox") : value.list,
                  date: value.isTodo ? value.date : null,
                  time: value.isTodo ? value.time : null,
                  reason: (value.reason ?? "").slice(0, 40),
                } satisfies VoiceParsed,
              },
              { headers: { "Cache-Control": "no-store" } },
            );
          }
          messages.push(
            { role: "assistant", content },
            {
              role: "user",
              content: `你输出的 JSON 未通过校验：${problems.join("；")}。请修正后严格按规则重新输出，只输出 JSON。`,
            },
          );
        } else {
          messages.push(
            { role: "assistant", content },
            {
              role: "user",
              content: `你输出的 JSON 字段形状不对（${shape.error.issues.map((issue) => issue.path.join(".")).join("、")}）。请严格按规则重新输出，只输出 JSON。`,
            },
          );
        }
      } else {
        messages.push(
          { role: "assistant", content },
          { role: "user", content: "上一次输出不是合法 JSON。请只输出一个 JSON 对象。" },
        );
      }
    }
  } catch {
    // 网络/超时/上游 5xx：直接降级，不让用户对着报错无处可去
  }
  return Response.json(
    { parsed: degrade(transcript) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
