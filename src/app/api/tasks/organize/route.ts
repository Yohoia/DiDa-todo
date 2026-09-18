/**
 * 当日待办整理：仅补全已有任务的时间、清单、标签、优先级和工作量。
 * 不改标题、不拆任务，也不为没有明确时间的事项编造日程。
 */

import { z } from "zod";
import { consumeVoiceQuota, guardVoiceRequest } from "@/lib/server/voice-request-guard";
import type { TaskOrganizationSuggestion } from "@/types/task-organization";
import { MAX_ORGANIZE_TASKS } from "@/types/task-organization";

export const maxDuration = 30;

const ORGANIZED_LISTS = ["Work", "Study", "Life"] as const;
const TASK_LISTS = ["Inbox", ...ORGANIZED_LISTS] as const;

const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const RequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locale: z.string().max(20).optional(),
  pomodoroMinutes: z.number().int().min(5).max(120),
  tasks: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        title: z.string().min(1).max(200),
        description: z.string().max(500),
        list: z.enum(TASK_LISTS),
        tags: z.array(z.string().max(24)).max(3),
        time: TimeSchema.optional(),
        priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        estimate: z.number().int().min(1).max(16),
      }),
    )
    .min(1)
    .max(MAX_ORGANIZE_TASKS),
});

const SuggestionSchema = z.object({
  id: z.string(),
  list: z.enum(ORGANIZED_LISTS),
  tags: z.array(z.string()).max(3),
  time: TimeSchema.nullable(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  estimate: z.number().int().min(1).max(16),
  reason: z.string().optional(),
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

function buildPrompt({
  date,
  locale,
  pomodoroMinutes,
}: {
  date: string;
  locale: string;
  pomodoroMinutes: number;
}) {
  return [
    "你是 Todo 应用的当日待办整理器。输入是一组已经属于同一天的待办。只输出 JSON，不要输出其他文字。",
    `正在整理的日期是 ${date}，界面语言是 ${locale}，一个番茄钟为 ${pomodoroMinutes} 分钟。`,
    "",
    "你只负责补全以下字段，不得改标题、不得拆分、不得新增或删除任务：",
    "1. time：已有 time 必须原样保留；没有 time 时，只有标题或描述明确写出具体时刻才可提取为 HH:MM，否则必须为 null（代表随时）。禁止为了排程而推测时间。",
    "2. list：必须按内容选择现有清单之一。Work=职业/项目/团队/业务；Study=课程/论文/阅读/学习；Life=家庭/健康/财务/出行/个人生活。不得输出 Inbox，不得创建新清单。",
    "3. tags：生成 1–3 个短标签，每个最多 12 个字符；尽量复用输入中已有且相关的标签；标签语言跟随任务原文，不加 #。",
    "4. priority：1=P1 高优先级（紧急、截止临近、会阻塞其他事项）；2=P2 中优先级（重要但不紧急）；3=P3 低优先级（日常、可选）。不要把大多数任务都判为 P1。",
    `5. estimate：估算需要多少个 ${pomodoroMinutes} 分钟番茄钟，取 1–16 的整数。简单沟通或小事务通常为 1，复杂工作按实际工作量提高。`,
    "6. reason：用不超过 30 个字简述判断依据，不复述所有字段。",
    "7. 必须为每个输入 id 返回且只返回一条结果，顺序与输入一致。",
    "",
    '输出格式：{"suggestions":[{"id":"...","list":"Work|Study|Life","tags":["..."],"time":"HH:MM或null","priority":1,"estimate":1,"reason":"..."}]}',
  ].join("\n");
}

async function callLlm(messages: { role: string; content: string }[]): Promise<string> {
  const { baseUrl, apiKey, model } = resolveProvider();
  if (!apiKey) throw new Error("not_configured");
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
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`llm_http_${response.status}`);
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return payload.choices?.[0]?.message?.content ?? "";
}

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

function validateSuggestions(
  raw: unknown,
  tasks: z.infer<typeof RequestSchema>["tasks"],
): { values?: TaskOrganizationSuggestion[]; problems?: string[] } {
  const object = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const items = object?.suggestions;
  if (!Array.isArray(items)) return { problems: ["suggestions 必须是数组"] };

  const inputById = new Map(tasks.map((task) => [task.id, task]));
  const seen = new Set<string>();
  const values: TaskOrganizationSuggestion[] = [];
  const problems: string[] = [];

  for (const item of items) {
    const parsed = SuggestionSchema.safeParse(item);
    if (!parsed.success) {
      problems.push("存在字段不合法的结果");
      continue;
    }
    const input = inputById.get(parsed.data.id);
    if (!input || seen.has(parsed.data.id)) {
      problems.push(`id ${parsed.data.id} 不存在或重复`);
      continue;
    }
    seen.add(parsed.data.id);
    const tags = [...new Set(parsed.data.tags.map((tag) => tag.trim().replace(/^#/, "")))]
      .filter(Boolean)
      .map((tag) => tag.slice(0, 12))
      .slice(0, 3);
    if (!tags.length) {
      problems.push(`id ${parsed.data.id} 缺少标签`);
      continue;
    }
    values.push({
      ...parsed.data,
      tags,
      // 用户已经设置的具体时间是最高优先级，模型不能覆盖或清空。
      time: input.time ?? parsed.data.time,
      reason: (parsed.data.reason ?? "").trim().slice(0, 30),
    });
  }
  if (seen.size !== tasks.length) problems.push("返回结果没有完整覆盖输入任务");
  return problems.length ? { problems } : { values };
}

export async function POST(request: Request) {
  const rejected = await guardVoiceRequest(request, {
    scope: "parse",
    maxBodyBytes: 64 * 1024,
    chargeQuota: false,
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
  const parsedRequest = RequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const quotaRejected = await consumeVoiceQuota("parse");
  if (quotaRejected) return quotaRejected;

  const input = parsedRequest.data;
  const messages: { role: string; content: string }[] = [
    {
      role: "system",
      content: buildPrompt({
        date: input.date,
        locale: input.locale ?? "zh-CN",
        pomodoroMinutes: input.pomodoroMinutes,
      }),
    },
    { role: "user", content: JSON.stringify({ tasks: input.tasks }) },
  ];

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await callLlm(messages);
      const result = validateSuggestions(extractJson(content), input.tasks);
      if (result.values) {
        return Response.json(
          { suggestions: result.values },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      messages.push(
        { role: "assistant", content },
        {
          role: "user",
          content: `上一次输出不合格：${result.problems?.join("；")}。请完整修正，只输出规定的 JSON。`,
        },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[tasks/organize] llm failed: ${message}`);
    if (message === "not_configured") {
      return Response.json({ error: "not_configured" }, { status: 503 });
    }
  }
  return Response.json({ error: "organize_failed" }, { status: 502 });
}
