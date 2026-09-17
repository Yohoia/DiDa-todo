import "server-only";

import { requireWorkspaceSession } from "@/lib/server/workspace-session";
import { loadFocusStats, recentDateKeys } from "@/lib/data/focus-stats";
import { getTodayKey } from "@/lib/date-utils";

export type InsightDay = { date: string; minutes: number; level: number };
export type InsightsData = {
  isDemo: boolean;
  completedTasks: number;
  focusMinutes: number;
  focusMinutesThisMonth: number;
  dailyFocusGoalMinutes: number;
  estimatedMinutesThisMonth: number;
  actualTaskMinutesThisMonth: number;
  unlinkedFocusMinutesThisMonth: number;
  listDistribution: Record<string, number>;
  checkInDaysThisMonth: number;
  streakDays: number;
  days: InsightDay[];
};

export async function getInsights(): Promise<InsightsData> {
  const { supabase, user } = await requireWorkspaceSession();

  const { data: preference, error: preferenceError } = await supabase
    .from("user_preferences")
    .select("time_zone")
    .eq("user_id", user.id)
    .maybeSingle();
  if (preferenceError && preferenceError.code !== "PGRST204") {
    throw new Error("Date preferences could not be loaded");
  }
  const timeZone = preference?.time_zone ?? "Asia/Shanghai";
  const stats = await loadFocusStats(supabase, timeZone);
  return {
    isDemo: false,
    completedTasks: stats.completedTasksThisMonth,
    focusMinutes: Math.floor(stats.focusSecondsThisMonth / 60),
    focusMinutesThisMonth: Math.floor(stats.focusSecondsThisMonth / 60),
    dailyFocusGoalMinutes: stats.dailyFocusGoalMinutes,
    estimatedMinutesThisMonth: Math.round(stats.estimatedSecondsThisMonth / 60),
    actualTaskMinutesThisMonth: Math.round(stats.actualTaskSecondsThisMonth / 60),
    unlinkedFocusMinutesThisMonth: Math.round(stats.unlinkedTaskSecondsThisMonth / 60),
    listDistribution: stats.listDistributionThisMonth,
    checkInDaysThisMonth: stats.checkInDaysThisMonth,
    streakDays: stats.streakDays,
    days: recentDateKeys(42, getTodayKey(new Date(), timeZone)).map((date) => {
      const minutes = Math.floor((stats.activity[date] ?? 0) / 60);
      return {
        date,
        minutes,
        level: minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 90 ? 2 : 3,
      };
    }),
  };
}
