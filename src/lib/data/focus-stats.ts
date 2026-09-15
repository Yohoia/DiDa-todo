import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type FocusStats = {
  activity: Record<string, number>;
  completedTasks: number;
  completedTasksThisMonth: number;
  focusSeconds: number;
  focusSecondsThisMonth: number;
  focusSecondsThisWeek: number;
  streakDays: number;
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function shanghaiDateKey(value: string | Date) {
  return dateKeyFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function shiftDateKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function recentDateKeys(count: number, today = shanghaiDateKey(new Date())) {
  return Array.from({ length: count }, (_, index) => shiftDateKey(today, index - count + 1));
}

function currentStreak(activity: Record<string, number>, today: string) {
  let cursor = activity[today] ? today : shiftDateKey(today, -1);
  let streak = 0;
  while ((activity[cursor] ?? 0) > 0) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

/** 在数据库端聚合不可变事实，避免 PostgREST 默认最多返回 1000 行导致统计漏算。 */
export async function loadFocusStats(client: SupabaseClient): Promise<FocusStats> {
  const { data, error } = await client.rpc("get_focus_stats");
  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as Partial<Omit<FocusStats, "streakDays">>;
  const activity = Object.fromEntries(
    Object.entries(payload.activity ?? {}).map(([key, seconds]) => [key, Number(seconds) || 0]),
  );
  const today = shanghaiDateKey(new Date());
  return {
    activity,
    completedTasks: Number(payload.completedTasks) || 0,
    completedTasksThisMonth: Number(payload.completedTasksThisMonth) || 0,
    focusSeconds: Number(payload.focusSeconds) || 0,
    focusSecondsThisMonth: Number(payload.focusSecondsThisMonth) || 0,
    focusSecondsThisWeek: Number(payload.focusSecondsThisWeek) || 0,
    streakDays: currentStreak(activity, today),
  };
}
