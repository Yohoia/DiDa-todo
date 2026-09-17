import type { Task, TaskList } from "../../types/task.ts";
import { taskDateTime } from "../../lib/date-utils.ts";

export type TaskCaptureDraft = {
  id: string;
  title: string;
  list: TaskList;
  date: string;
  time?: string;
};
export type CaptureSaveResult = { savedIds: string[]; failedIds: string[] };
export function captureDraftError(
  draft: TaskCaptureDraft,
  timeZone = "Asia/Shanghai",
): string | null {
  if (!draft.title.trim() || draft.title.trim().length > 200) return "capture.invalidTitle";
  if (!["Inbox", "Work", "Study", "Life"].includes(draft.list)) return "organize.invalidList";
  if (draft.date && !taskDateTime(draft.date, "00:00", timeZone)) {
    return "capture.invalidDate";
  }
  if (draft.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) return "organize.invalidTime";
  return null;
}
export function capturedTask(
  draft: TaskCaptureDraft,
  pomodoroMinutes: number,
  created = Date.now(),
  defaultReminderMinutes = 0,
): Task {
  return {
    ...draft,
    title: draft.title.trim(),
    description: "",
    tags: [],
    priority: 3,
    estimate: 1,
    reminder:
      draft.date && draft.time && defaultReminderMinutes > 0
        ? `${defaultReminderMinutes} min before`
        : "None",
    completed: false,
    created,
    subtasks: [],
    schedule:
      draft.date && draft.time
        ? {
            date: draft.date,
            hour: Number(draft.time.slice(0, 2)),
            minute: Number(draft.time.slice(3, 5)),
            duration: pomodoroMinutes,
            label: draft.title.trim(),
          }
        : undefined,
  };
}
function shiftDate(key: string, days: number) {
  return new Date(Date.parse(`${key}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
function chineseNumber(text: string) {
  if (/^\d+$/.test(text)) return Number(text);
  const digits = "零一二三四五六七八九";
  const value = text.replaceAll("两", "二");
  if (value.includes("十")) {
    const [ten, one] = value.split("十");
    return (ten ? digits.indexOf(ten) : 1) * 10 + (one ? digits.indexOf(one) : 0);
  }
  return digits.indexOf(value);
}
/** Deterministic quick capture. No model request and no guessed time or date. */
export function parseQuickCapture(
  input: string,
  today: string,
  preset: { list: TaskList; date?: string; time?: string },
  id: string,
): TaskCaptureDraft {
  let title = input.trim();
  let date = preset.date ?? "";
  let time = preset.time;
  let extractedTime = false;
  const relative = title.match(/大后天|后天|明天|今天|\b(?:day after tomorrow|tomorrow|today)\b/i);
  const explicit = title.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (relative) {
    const offsets: Record<string, number> = {
      今天: 0,
      明天: 1,
      后天: 2,
      大后天: 3,
      today: 0,
      tomorrow: 1,
      "day after tomorrow": 2,
    };
    date = shiftDate(today, offsets[relative[0].toLowerCase()]);
    title = title.replace(relative[0], "");
  } else if (explicit && taskDateTime(explicit[0], "00:00")) {
    date = explicit[0];
    title = title.replace(explicit[0], "");
  }
  const periodClock = title.match(/(上午|下午|晚上|凌晨|中午)\s*([01]?\d|2[0-3]):([0-5]\d)/);
  const clock = title.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const spoken = title.match(
    /(上午|下午|晚上|凌晨|中午)([零一二三四五六七八九十两\d]+)点(半|一刻|三刻|[零一二三四五六七八九十两\d]+分)?/,
  );
  const adjustPeriodHour = (period: string, hour: number) => {
    if (["下午", "晚上", "中午"].includes(period) && hour < 12) return hour + 12;
    // 中午/下午 12 点按正午处理；上午/凌晨/晚上 12 点是午夜或凌晨零点。
    if (hour === 12 && ["上午", "凌晨", "晚上"].includes(period)) return 0;
    return hour;
  };
  const english = title.match(/\b(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (english) {
    extractedTime = true;
    const hour = (Number(english[1]) % 12) + (english[3].toLowerCase() === "pm" ? 12 : 0);
    time = `${String(hour).padStart(2, "0")}:${english[2] ?? "00"}`;
    title = title.replace(english[0], "");
  } else if (periodClock) {
    extractedTime = true;
    const hour = adjustPeriodHour(periodClock[1], Number(periodClock[2]));
    time = `${String(hour).padStart(2, "0")}:${periodClock[3]}`;
    title = title.replace(periodClock[0], "");
  } else if (clock) {
    extractedTime = true;
    time = `${clock[1].padStart(2, "0")}:${clock[2]}`;
    title = title.replace(clock[0], "");
  } else if (spoken) {
    const hour = adjustPeriodHour(spoken[1], chineseNumber(spoken[2]));
    const minute =
      spoken[3] === "半"
        ? 30
        : spoken[3] === "一刻"
          ? 15
          : spoken[3] === "三刻"
            ? 45
            : spoken[3]
              ? chineseNumber(spoken[3].slice(0, -1))
              : 0;
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      extractedTime = true;
      time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      title = title.replace(spoken[0], "");
    }
  }
  const trimmed = (extractedTime ? title.replace(/\bat\s*$/i, "") : title)
    .replace(/\s+/g, " ")
    .trim();
  return { id, title: trimmed || input.trim(), list: preset.list, date, time };
}
