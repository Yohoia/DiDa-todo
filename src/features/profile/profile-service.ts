import "server-only";

import { requireWorkspaceSession } from "@/lib/server/workspace-session";
import { loadFocusStats, recentDateKeys } from "@/lib/data/focus-stats";

export type ProfilePlant = {
  id: string;
  symbol: string;
  plantedAt: string;
};

export type ProfileData = {
  isDemo: boolean;
  displayName: string;
  email: string | null;
  userId: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  level: number;
  levelTitle: string;
  xp: number;
  nextLevelXp: number;
  focusGarden: {
    weeklyMinutes: number;
    streakDays: number;
    weeklyGoal: number;
    minutesPerPlant: number;
    currentPlantMinutes: number;
    plants: ProfilePlant[];
  };
};

/**
 * 服务端档案边界：登录用户返回 profiles 表真实数据，并从任务与专注事实表
 * 派生等级和花园；未登录时拒绝访问，不回退到演示档案。
 */
export async function getProfile(): Promise<ProfileData> {
  const { supabase, user } = await requireWorkspaceSession();
  const [profile, stats] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    loadFocusStats(supabase),
  ]);
  if (profile.error) throw new Error("Profile could not be loaded");
  const row = profile.data;

  const minutesPerPlant = 120;
  const weeklyGoal = 8;
  const weeklyMinutes = Math.floor(stats.focusSecondsThisWeek / 60);
  const planted = Math.min(weeklyGoal, Math.floor(weeklyMinutes / minutesPerPlant));
  const symbols = ["🌲", "🌳", "🪴", "🌿"];
  const activeDates = recentDateKeys(7).filter((key) => (stats.activity[key] ?? 0) > 0);
  const totalXp = stats.completedTasks * 40 + Math.floor(stats.focusSeconds / 60);
  const level = Math.floor(totalXp / 1000) + 1;

  return {
    isDemo: false,
    displayName: row?.display_name?.trim() || user.email?.split("@")[0] || "Friend",
    email: user.email ?? null,
    userId: user.id,
    avatarUrl: row?.avatar_url ?? null,
    joinedAt: (row?.created_at ?? user.created_at).slice(0, 10),
    level,
    levelTitle: "Architect",
    xp: totalXp,
    nextLevelXp: level * 1000,
    focusGarden: {
      weeklyMinutes,
      streakDays: stats.streakDays,
      weeklyGoal,
      minutesPerPlant,
      currentPlantMinutes: planted >= weeklyGoal ? 0 : weeklyMinutes % minutesPerPlant,
      plants: Array.from({ length: planted }, (_, index) => ({
        id: `plant-${index + 1}`,
        symbol: symbols[index % symbols.length],
        plantedAt: activeDates[index % Math.max(1, activeDates.length)] ?? recentDateKeys(1)[0],
      })),
    },
  };
}
