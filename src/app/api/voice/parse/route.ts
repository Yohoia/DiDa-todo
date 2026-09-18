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
import { dateKeyWeekday, getTodayKey, isValidTimeZone } from "@/lib/date-utils";
import { getAuthenticatedSession } from "@/lib/server/workspace-session";
import { consumeVoiceQuota, guardVoiceRequest } from "@/lib/server/voice-request-guard";
import type { VoiceParsed } from "@/types/voice";

/** 覆盖未启用 Fluid Compute 时较短的 Vercel 默认时限（重试一次最坏 2×12s）。 */
export const maxDuration = 30;

const TASK_LISTS = ["Inbox", "Work", "Study", "Life"] as const;
/** 一段语音最多拆出的待办数：防模型过度拆分（把一件事拆成碎片） */
const MAX_TASKS = 8;
/** 节假日解析窗口：覆盖元旦/春节等跨年节日（原 180 天会误拒） */
const MAX_DAYS_AHEAD = 370;

/** 农历节日对照（人工核对，每年初维护下一年）；公历节日（元旦/五一/国庆）按年计算不在此表。 */
const LUNAR_HOLIDAYS: Record<number, Record<string, string>> = {
  2026: { 春节: "2026-02-17", 清明: "2026-04-05", 端午: "2026-06-19", 中秋: "2026-09-25" },
  2027: { 春节: "2027-02-06" },
};

const TaskSchema = z.object({
  isTodo: z.boolean(),
  title: z.string().nullable(),
  list: z.enum(TASK_LISTS).nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  reason: z.string().optional(),
});

/** 本周六（周一起始的本周） */
function saturdayOf(today: string): string {
  const day = dateKeyWeekday(today);
  return addDays(today, (6 - day + 7) % 7);
}

/** 节假日对照行：农历表两年 + 公历节日本年/次年 */
function holidayLines(today: string): string {
  const year = Number(today.slice(0, 4));
  const lunar = [
    ...Object.entries(LUNAR_HOLIDAYS[year] ?? {}),
    ...Object.entries(LUNAR_HOLIDAYS[year + 1] ?? {}),
  ].map(([name, date]) => `${name}=${date}`);
  const gregorian = [`元旦=${year + 1}-01-01`, `五一=${year}-05-01`, `国庆=${year}-10-01`];
  return [...lunar, ...gregorian].join("，");
}

function buildPrompt(today: string, timeZone: string): string {
  const weekday = "日一二三四五六"[dateKeyWeekday(today)];
  const now = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return [
    "你是待办事项解析器，把用户语音转写文本解析为一件或多件待办，只输出一个 JSON 对象，不要输出任何其他内容。",
    `今天是 ${today}（星期${weekday}），现在是 ${now}。一周从周一开始。语音是收集动作：所有结果都进 Inbox 清单。`,
    "",
    "规则：",
    "1. 一段话里说了几件事就拆成几件，按出现顺序排列，最多 8 件；只有一件事时也输出单元素数组。",
    '2. title：去掉口语填充词（"帮我""提醒我""那个""记一下"）和日期时间表达（"明天""下午三点""中秋"），保留核心事项，每件不超过 30 字。',
    '3. list：一律输出 "Inbox"（分类整理由用户后续手动完成）。',
    "4. date：输出 YYYY-MM-DD，词义口径：",
    '   - 相对日："今天"=今天，"明天"=+1 天，"后天"=+2 天，"大后天"=+3 天，"N 天后"=今天+N',
    '   - 周序："周X/星期X/礼拜X/这周X/本周X"=本周内未来最近的一天（本周已过则取下周），"下周X"=下一周的周X，"周末/本周末"=本周六，"下周末"=下周六',
    '   - 月序："月底/月末"=本月最后一天，"月初"=本月 1 号，"下个月X号/下月X号"=下月对应日',
    '   - 显式日期："X月X日/X月X号/X号"=按今年推算；该月份今年已过则取明年',
    `   - 节假日：元旦、春节、清明、五一、端午、中秋、国庆优先用对照表：${holidayLines(today)}；表中没有的按你的知识推算；"今年/明年"前缀按字面取`,
    "   - 完全没有日期信息则 null",
    "5. time：输出 24 小时制 HH:MM，词义口径：",
    '   - 时段换算："凌晨 X 点"=0-5 点段，"中午十二点/正午"=12:00，"下午 X 点"=X+12，"晚上/今晚 X 点"=X+12，"傍晚"≈18:00',
    '   - 分钟："X 点半"=X:30，"X 点一刻"=X:15，"差一刻 X 点"=(X-1):45，"X 点 Y 分"=X:Y',
    '   - 相对时刻："半小时后/一小时后/N 小时后"从现在时刻推算成具体 HH:MM；跨过午夜则 date 顺延一天',
    '   - 只说"X 点"没有时段修饰：按现在时刻判断——今天的 X 点还没过就取今天，已过则取明天（此时若无日期词，date 填明天）',
    "   - 只有时间没有日期 → date 为 null（上一条的顺延情形除外）；解析不出 time 则 null",
    "6. tasks 只放能形成具体事项的条目；寒暄、提问、闲聊、模糊到无法形成事项的内容不放入（此时 tasks 为空数组）。",
    "7. 输出格式（字段齐全，无值用 null）：",
    '{"tasks":[{"isTodo":bool,"title":string|null,"list":"Inbox","date":string|null,"time":string|null,"reason":"不超过20字判定依据"}]}',
    "",
    "示例：",
    `输入"明天下午三点交房租，周末去超市买菜，晚上九点做复盘" → {"tasks":[{"isTodo":true,"title":"交房租","list":"Inbox","date":"${addDays(today, 1)}","time":"15:00","reason":"明天下午三点"},{"isTodo":true,"title":"去超市买菜","list":"Inbox","date":"${saturdayOf(today)}","time":null,"reason":"周末=本周六"},{"isTodo":true,"title":"做复盘","list":"Inbox","date":"${today}","time":"21:00","reason":"晚上九点"}]}`,
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
    } else if (value.date < today || daysBetween(today, value.date) > MAX_DAYS_AHEAD) {
      problems.push(`date "${value.date}" 超出今天起 ${MAX_DAYS_AHEAD} 天内的范围`);
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
        : "https://ws-9mlt2qkeiwpfmr0z.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"),
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
    // 语音=收集：无论模型判了什么清单，落点一律 Inbox（整理留给用户）
    list: value.isTodo ? "Inbox" : value.list,
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
  const rejected = await guardVoiceRequest(request, {
    scope: "parse",
    maxBodyBytes: 4 * 1024,
    chargeQuota: false,
  });
  if (rejected) return rejected;

  if (!resolveProvider().apiKey) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const session = await getAuthenticatedSession();
  if (!session) return Response.json({ error: "auth_required" }, { status: 401 });
  const { data: preference, error: preferenceError } = await session.supabase
    .from("user_preferences")
    .select("time_zone")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (preferenceError && preferenceError.code !== "PGRST204") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const requestedTimeZone = preference?.time_zone ?? "Asia/Shanghai";
  if (!isValidTimeZone(requestedTimeZone)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
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
  const quotaRejected = await consumeVoiceQuota("parse");
  if (quotaRejected) return quotaRejected;

  const today = getTodayKey(new Date(), requestedTimeZone);
  const messages: { role: string; content: string }[] = [
    {
      role: "system",
      content: buildPrompt(today, requestedTimeZone),
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
