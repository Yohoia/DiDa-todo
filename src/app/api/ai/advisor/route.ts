import { z } from "zod";
import { normalizeAiAdvisorResult } from "@/lib/server/ai-advisor-result";
import { guardVoiceRequest } from "@/lib/server/voice-request-guard";
import { MAX_AI_ADVISOR_TASKS } from "@/types/ai-advisor";

export const maxDuration = 30;

const RequestSchema = z.object({
  locale: z.string().min(1).max(20),
  pomodoroMinutes: z.number().int().min(5).max(120),
  dailyCapacity: z.number().int().min(1).max(20),
  tasks: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        title: z.string().min(1).max(200),
        description: z.string().max(500),
        list: z.enum(["Inbox", "Work", "Study", "Life"]),
        priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        estimate: z.number().int().min(1).max(16),
        subtaskCount: z.number().int().min(0).max(99),
      }),
    )
    .max(MAX_AI_ADVISOR_TASKS),
  history: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        completed: z.number().int().min(0).max(1000),
        focusMinutes: z.number().int().min(0).max(1440),
      }),
    )
    .max(14),
});

const ResultSchema = z.object({
  taskSuggestions: z.array(
    z.object({
      id: z.string(),
      subtasks: z.array(z.string().min(1).max(120)).max(6),
      estimate: z.number().int().min(1).max(16),
      reason: z.string().max(80),
    }),
  ),
  capacity: z.object({
    status: z.enum(["fits", "tight", "over"]),
    totalPomodoros: z.number().int().min(0).max(640),
    message: z.string().min(1).max(160),
  }),
  weeklyReview: z.object({
    summary: z.string().min(1).max(240),
    wins: z.array(z.string().min(1).max(120)).max(4),
    risks: z.array(z.string().min(1).max(120)).max(4),
    nextActions: z.array(z.string().min(1).max(120)).max(4),
  }),
});

function resolveProvider() {
  const hasDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
  return {
    baseUrl:
      process.env.TASK_ORGANIZE_LLM_BASE_URL ??
      process.env.VOICE_LLM_BASE_URL ??
      (hasDeepSeek
        ? "https://api.deepseek.com/v1"
        : "https://ws-9mlt2qkeiwpfmr0z.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"),
    apiKey:
      process.env.TASK_ORGANIZE_LLM_API_KEY ??
      process.env.VOICE_LLM_API_KEY ??
      process.env.DEEPSEEK_API_KEY ??
      process.env.DASHSCOPE_API_KEY,
    model:
      process.env.TASK_ORGANIZE_LLM_MODEL ??
      process.env.VOICE_LLM_MODEL ??
      (hasDeepSeek ? "deepseek-flash" : "qwen-flash"),
  };
}

function buildPrompt(input: z.infer<typeof RequestSchema>) {
  return [
    "你是 Todo 应用的独立任务顾问。只输出一个 JSON 对象。",
    `界面语言是 ${input.locale}；一个番茄钟为 ${input.pomodoroMinutes} 分钟；用户设置的每日任务容量是 ${input.dailyCapacity} 项。`,
    "你必须生成四类内容：可执行子任务、独立耗时预估、容量规划和周回顾。",
    "子任务只给没有子任务的任务，最多 5 条；每条 4-30 字，必须是下一步动作，不重复标题。",
    "已有子任务的任务也必须返回对应 id，并且 subtasks 固定为空数组，表示保留用户现有子任务。",
    "estimate 是独立判断的番茄钟数量，范围 1-16；不要因为容量压力而缩小真实工作量。",
    "capacity 只给判断和建议，不得生成或修改任何日期或时间。",
    "weeklyReview 基于输入 history，只陈述事实与可验证建议，不虚构数据。",
    "taskSuggestions 必须完整覆盖每个输入 id，且不新增 id。",
    '输出格式：{"taskSuggestions":[{"id":"...","subtasks":["..."],"estimate":1,"reason":"..."}],"capacity":{"status":"fits|tight|over","totalPomodoros":1,"message":"..."},"weeklyReview":{"summary":"...","wins":["..."],"risks":["..."],"nextActions":["..."]}}',
  ].join("\n");
}

async function callLlm(input: z.infer<typeof RequestSchema>) {
  const { baseUrl, apiKey, model } = resolveProvider();
  if (!apiKey) throw new Error("not_configured");
  const isDeepSeek = baseUrl.includes("deepseek.com");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildPrompt(input) },
        { role: "user", content: JSON.stringify(input) },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      ...(isDeepSeek ? { thinking: { type: "disabled" } } : { enable_thinking: false }),
      stream: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`llm_http_${response.status}`);
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return payload.choices?.[0]?.message?.content ?? "";
}

function extractJson(content: string) {
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

function validate(raw: unknown, input: z.infer<typeof RequestSchema>) {
  const parsed = ResultSchema.safeParse(normalizeAiAdvisorResult(raw, input.tasks, input.locale));
  if (!parsed.success) return null;
  const ids = new Set(input.tasks.map((task) => task.id));
  const returned = new Set(parsed.data.taskSuggestions.map((item) => item.id));
  if (
    parsed.data.taskSuggestions.length !== ids.size ||
    returned.size !== ids.size ||
    [...ids].some((id) => !returned.has(id))
  )
    return null;
  const withoutSubtasks = new Set(
    input.tasks.filter((task) => task.subtaskCount === 0).map((task) => task.id),
  );
  for (const item of parsed.data.taskSuggestions) {
    if (!withoutSubtasks.has(item.id) && item.subtasks.length) return null;
    if (withoutSubtasks.has(item.id) && !item.subtasks.length) return null;
  }
  return parsed.data;
}

export async function POST(request: Request) {
  const rejected = await guardVoiceRequest(request, {
    scope: "parse",
    maxBodyBytes: 64 * 1024,
  });
  if (rejected) return rejected;
  if (!resolveProvider().apiKey) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const input = RequestSchema.safeParse(body);
  if (!input.success) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await callLlm(input.data);
      const result = validate(extractJson(content), input.data);
      if (result) {
        return Response.json({ result }, { headers: { "Cache-Control": "no-store" } });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ai/advisor] llm failed: ${message}`);
    if (message === "not_configured") {
      return Response.json({ error: "not_configured" }, { status: 503 });
    }
  }
  return Response.json({ error: "advisor_failed" }, { status: 502 });
}
