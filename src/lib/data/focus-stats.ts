import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type FocusRow = {
  started_at: string;
  duration_seconds: number;
};

type CompletedTaskRow = {
  completed_at: string | null;
};

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

function startOfWeekKey(today: string) {
  const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  return shiftDateKey(today, -(day === 0 ? 6 : day - 1));
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

/** 从不可变事实表聚合统计；页面不再维护一份会漂移的演示计数。 */
export async function loadFocusStats(client: SupabaseClient, userId: string): Promise<FocusStats> {
  const [focusResult, tasksResult] = await Promise.all([
    client
      .from("focus_sessions")
      .select("started_at, duration_seconds")
      .eq("user_id", userId)
      .eq("mode", "focus"),
    client.from("tasks").select("completed_at").eq("user_id", userId).eq("completed", true),
  ]);
  if (focusResult.error) throw new Error(focusResult.error.message);
  if (tasksResult.error) throw new Error(tasksResult.error.message);

  const activity: Record<string, number> = {};
  let focusSeconds = 0;
  for (const row of (focusResult.data ?? []) as FocusRow[]) {
    const seconds = Math.max(0, row.duration_seconds ?? 0);
    const key = shanghaiDateKey(row.started_at);
    activity[key] = (activity[key] ?? 0) + seconds;
    focusSeconds += seconds;
  }

  const today = shanghaiDateKey(new Date());
  const weekStart = startOfWeekKey(today);
  const monthPrefix = today.slice(0, 7);
  const focusSecondsThisWeek = Object.entries(activity).reduce(
    (total, [key, seconds]) => total + (key >= weekStart && key <= today ? seconds : 0),
    0,
  );
  const focusSecondsThisMonth = Object.entries(activity).reduce(
    (total, [key, seconds]) => total + (key.startsWith(monthPrefix) ? seconds : 0),
    0,
  );
  const completedRows = (tasksResult.data ?? []) as CompletedTaskRow[];

  return {
    activity,
    completedTasks: completedRows.length,
    completedTasksThisMonth: completedRows.filter(
      (row) => row.completed_at && shanghaiDateKey(row.completed_at).startsWith(monthPrefix),
    ).length,
    focusSeconds,
    focusSecondsThisMonth,
    focusSecondsThisWeek,
    streakDays: currentStreak(activity, today),
  };
}
