import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ProfilePlant = {
  id: string;
  symbol: string;
  plantedAt: string;
};

export type ProfileData = {
  displayName: string;
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
  displayName: "Alex",
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
 * 服务端档案边界：登录用户返回 profiles 表真实数据（昵称/头像/加入日期），
 * 等级与专注花园仍为演示值，待 focus_sessions 落库后改为聚合计算。
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

  const { data: row } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return {
    ...demoProfile,
    displayName: row?.display_name?.trim() || user.email?.split("@")[0] || "Friend",
    avatarUrl: row?.avatar_url ?? null,
    joinedAt: (row?.created_at ?? user.created_at ?? demoProfile.joinedAt).slice(0, 10),
  };
}
