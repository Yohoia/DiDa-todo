/**
 * 待办解析：transcript → deepseek-flash（JSON mode、关思考）→ zod 校验
 * → 失败带错误重试一次 → 仍失败以原文降级（宁可朴素不可报错）。
 * 一段话说了几件事就拆成几件（tasks 数组，≤8），确认卡逐项展示。
 *
 * 供应商抽象：VOICE_LLM_BASE_URL / VOICE_LLM_API_KEY / VOICE_LLM_MODEL 三个
 * 环境变量可整体切回百炼 qwen-flash，调用逻辑不变。
 * 隐私：不写日志（含 transcript 与解析结果，仅错误元数据）。
 */

import { z } from "zod";
import { getTodayKey } from "@/lib/date-utils";
import { guardVoiceRequest } from "@/lib/server/voice-request-guard";
import type { VoiceParsed } from "@/types/voice";

/** 覆盖未启用 Fluid Compute 时较短的 Vercel 默认时限（重试一次最坏 2×12s）。 */
export const maxDuration = 30;

const TASK_LISTS = ["Inbox", "Work", "Study", "Life"] as const;
/** 一段语音最多拆出的待办数：防模型过度拆分（把一件事拆成碎片） */
const MAX_TASKS = 8;

const TaskSchema = z.object({
  isTodo: z.boolean(),
  title: z.string().nullable(),
  list: z.enum(TASK_LISTS).nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  reason: z.string().optional(),
});

function buildPrompt(today: string, tomorrow: string, dayAfter: string): string {
  const weekday = "日一二三四五六"[new Date(`${today}T12:00:00+08:00`).getDay()];
  return [
    "你是待办事项解析器，把用户语音转写文本解析为一件或多件待办，只输出一个 JSON 对象，不要输出任何其他内容。",
    `今天是 ${today}（星期${weekday}）。一周从周一开始。`,
    "可用清单：Inbox（默认）、Work（工作）、Study（学习）、Life（生活）。",
    "",
    "规则：",
    "1. 一段话里说了几件事就拆成几件，按出现顺序排列，最多 8 件；只有一件事时也输出单元素数组。",
    '2. title：去掉口语填充词（"帮我""提醒我""那个""记一下"），保留核心事项，每件不超过 30 字。',
    '3. date：输出 YYYY-MM-DD。相对日期口径："今天"=今天，"明天"=+1 天，"后天"=+2 天，"周X/星期X"=本周内未来最近的一天（本周已过则取下周），"下周X"=下一周的周X，"X月X号/X号"按今年推算。解析不出日期则 null。',
    '4. time：输出 24 小时制 HH:MM（"下午三点"=15:00，"上午十点半"=10:30）。只有时间没有日期时 date 为 null、time 有值。解析不出则 null。',
    '5. list：按事项语义匹配清单；拿不准或匹配不上用 "Inbox"。',
    "6. tasks 只放能形成具体事项的条目；寒暄、提问、闲聊、模糊到无法形成事项的内容不放入（此时 tasks 为空数组）。",
    "7. 输出格式（字段齐全，无值用 null）：",
    '{"tasks":[{"isTodo":bool,"title":string|null,"list":"Inbox"|"Work"|"Study"|"Life"|null,"date":string|null,"time":string|null,"reason":"不超过20字判定依据"}]}',
    "",
    "示例：",
    `输入"明天下午三点提醒我交房租，后天上午去超市买东西" → {"tasks":[{"isTodo":true,"title":"交房租","list":"Life","date":"${tomorrow}","time":"15:00","reason":"明确事项与时间"},{"isTodo":true,"title":"去超市买东西","list":"Life","date":"${dayAfter}","time":null,"reason":"明确事项无具体时间"}]}`,
    '输入"今天天气怎么样" → {"tasks":[]}',
  ].join("\n");
}

/** 形状之外的语义校验：返回问题列表（供重试 prompt 与降级判断）。 */
function semanticProblems(value: z.infer<typeof TaskSchema>, today: string): string[] {
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

/** 模型可能规规矩矩回 {"tasks":[...]}，也可能退化成单对象或裸数组——统一成条目数组。 */
function normalizeItems(raw: unknown): { recognized: boolean; items: unknown[] } {
  if (Array.isArray(raw)) return { recognized: true, items: raw };
  if (raw && typeof raw === "object") {
    const object = raw as Record<string, unknown>;
    if (Array.isArray(object.tasks)) return { recognized: true, items: object.tasks };
    if ("isTodo" in object) return { recognized: true, items: [object] };
  }
  return { recognized: false, items: [] };
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

function sanitize(value: z.infer<typeof TaskSchema>): VoiceParsed {
  return {
    isTodo: value.isTodo,
    title: value.title ? value.title.trim().slice(0, 60) : null,
    list: value.isTodo ? (value.list ?? "Inbox") : value.list,
    date: value.isTodo ? value.date : null,
    time: value.isTodo ? value.time : null,
    reason: (value.reason ?? "").slice(0, 40),
  };
}

/** 解析彻底失败时的兜底：原文作为唯一一条进确认卡，用户仍可编辑。 */
function degrade(transcript: string): VoiceParsed[] {
  return [
    {
      isTodo: true,
      title: transcript.slice(0, 60),
      list: "Inbox",
      date: null,
      time: null,
      reason: "",
      degraded: true,
    },
  ];
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
    {
      role: "system",
      content: buildPrompt(today, addDays(today, 1), addDays(today, 2)),
    },
    { role: "user", content: transcript },
  ];

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await callLlm(messages);
      const raw = extractJson(content);
      if (raw === null) {
        messages.push(
          { role: "assistant", content },
          { role: "user", content: "上一次输出不是合法 JSON。请只输出一个 JSON 对象。" },
        );
        continue;
      }
      const { recognized, items } = normalizeItems(raw);
      if (!recognized) {
        messages.push(
          { role: "assistant", content },
          {
            role: "user",
            content: '输出形状不对：需要形如 {"tasks":[…]}。请严格按规则重新输出，只输出 JSON。',
          },
        );
        continue;
      }
      if (!items.length) {
        // 模型判定整段都不是待办
        return Response.json({ parsed: [] }, { headers: { "Cache-Control": "no-store" } });
      }

      // 逐项过形状 + 语义校验，任何一项失败都带着明细重试一次
      const problems: string[] = [];
      const values: z.infer<typeof TaskSchema>[] = [];
      items.slice(0, MAX_TASKS).forEach((item, index) => {
        const shape = TaskSchema.safeParse(item);
        if (!shape.success) {
          problems.push(`第 ${index + 1} 项字段形状不对`);
          return;
        }
        const itemProblems = semanticProblems(shape.data, today);
        if (itemProblems.length) {
          problems.push(`第 ${index + 1} 项：${itemProblems.join("；")}`);
          return;
        }
        values.push(shape.data);
      });
      if (!problems.length) {
        return Response.json(
          { parsed: values.map(sanitize) },
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
    }
  } catch (error) {
    // 网络/超时/上游 5xx：记错误元数据后降级，不让用户对着报错无处可去
    console.error(
      `[voice/parse] llm failed: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
    );
  }
  return Response.json(
    { parsed: degrade(transcript) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
