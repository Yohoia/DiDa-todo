import "server-only";

import { requireWorkspaceSession } from "@/lib/server/workspace-session";
import { loadFocusStats, recentDateKeys } from "@/lib/data/focus-stats";

export type InsightDay = { date: string; minutes: number; level: number };
export type InsightsData = {
  isDemo: boolean;
  completedTasks: number;
  focusMinutes: number;
  streakDays: number;
  days: InsightDay[];
};

export async function getInsights(): Promise<InsightsData> {
  const { supabase } = await requireWorkspaceSession();

  const stats = await loadFocusStats(supabase);
  return {
    isDemo: false,
    completedTasks: stats.completedTasksThisMonth,
    focusMinutes: Math.floor(stats.focusSecondsThisMonth / 60),
    streakDays: stats.streakDays,
    days: recentDateKeys(42).map((date) => {
      const minutes = Math.floor((stats.activity[date] ?? 0) / 60);
      return {
        date,
        minutes,
        level: minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 90 ? 2 : 3,
      };
    }),
  };
}
