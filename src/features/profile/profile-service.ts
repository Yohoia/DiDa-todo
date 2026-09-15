import "server-only";

import { createClient } from "@/lib/supabase/server";
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

/** 未登录（预览模式）的演示档案；level/xp/专注花园为演示数据。 */
const demoProfile: ProfileData = {
  isDemo: true,
  displayName: "Alex",
  email: null,
  userId: null,
  avatarUrl: null,
  joinedAt: "2026-09-01",
  level: 5,
  levelTitle: "Architect",
  xp: 3450,
  nextLevelXp: 5000,
  focusGarden: {
    weeklyMinutes: 680,
    streakDays: 4,
    weeklyGoal: 8,
    minutesPerPlant: 120,
    currentPlantMinutes: 80,
    plants: [
      { id: "pine-1", symbol: "🌲", plantedAt: "2026-09-02" },
      { id: "oak-1", symbol: "🌳", plantedAt: "2026-09-03" },
      { id: "plant-1", symbol: "🪴", plantedAt: "2026-09-05" },
      { id: "pine-2", symbol: "🌲", plantedAt: "2026-09-07" },
      { id: "sprout-1", symbol: "🌿", plantedAt: "2026-09-09" },
    ],
  },
};

/**
 * 服务端档案边界：登录用户返回 profiles 表真实数据，并从任务与专注事实表
 * 派生等级和花园；未登录时才使用明确标注的演示数据。
 */
export async function getProfile(): Promise<ProfileData> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return {
      ...demoProfile,
      displayName: process.env.DIDA_PROFILE_NAME?.trim() || demoProfile.displayName,
      avatarUrl: process.env.DIDA_PROFILE_AVATAR_URL?.trim() || demoProfile.avatarUrl,
    };
  }
  const [{ data: row }, stats] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    loadFocusStats(supabase).catch((error: unknown) => {
      console.error("load profile stats failed:", error);
      return null;
    }),
  ]);

  const minutesPerPlant = 120;
  const weeklyGoal = 8;
  const weeklyMinutes = Math.floor((stats?.focusSecondsThisWeek ?? 0) / 60);
  const planted = Math.min(weeklyGoal, Math.floor(weeklyMinutes / minutesPerPlant));
  const symbols = ["🌲", "🌳", "🪴", "🌿"];
  const activeDates = recentDateKeys(7).filter((key) => (stats?.activity[key] ?? 0) > 0);
  const totalXp = (stats?.completedTasks ?? 0) * 40 + Math.floor((stats?.focusSeconds ?? 0) / 60);
  const level = Math.floor(totalXp / 1000) + 1;

  return {
    isDemo: false,
    displayName: row?.display_name?.trim() || user.email?.split("@")[0] || "Friend",
    email: user.email ?? null,
    userId: user.id,
    avatarUrl: row?.avatar_url ?? null,
    joinedAt: (row?.created_at ?? user.created_at ?? demoProfile.joinedAt).slice(0, 10),
    level,
    levelTitle: "Architect",
    xp: totalXp,
    nextLevelXp: level * 1000,
    focusGarden: {
      weeklyMinutes,
      streakDays: stats?.streakDays ?? 0,
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
