import "server-only";

import { createClient } from "@/lib/supabase/server";
import { loadFocusStats, recentDateKeys } from "@/lib/data/focus-stats";

const demoLevels = [
  0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 0, 2, 1, 0, 1, 2, 1, 0, 2, 2, 1, 0, 1, 2, 1, 1, 0, 2, 1, 2, 0, 3, 2,
  1, 3, 0, 2, 3, 1, 3, 2, 3,
];

export type InsightDay = { date: string; minutes: number; level: number };
export type InsightsData = {
  isDemo: boolean;
  completedTasks: number;
  focusMinutes: number;
  streakDays: number;
  days: InsightDay[];
};

export async function getInsights(): Promise<InsightsData> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      isDemo: true,
      completedTasks: 42,
      focusMinutes: 18 * 60,
      streakDays: 5,
      days: recentDateKeys(42).map((date, index) => ({
        date,
        minutes: demoLevels[index] * 30,
        level: demoLevels[index],
      })),
    };
  }

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
