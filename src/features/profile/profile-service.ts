import "server-only";

import { requireWorkspaceSession } from "@/lib/server/workspace-session";
import { loadFocusStats } from "@/lib/data/focus-stats";

export type ProfilePlant = {
  id: string;
  symbol: string;
  plantedAt: string;
};

export type ProfileAchievement = {
  key: string;
  xp: number;
  coins: number;
  earnedAt: string;
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
  gamificationEnabled: boolean;
  coins: number;
  achievements: ProfileAchievement[];
  focusGarden: {
    weeklyMinutes: number;
    streakDays: number;
    plants: ProfilePlant[];
  };
};

const LEVEL_TITLES = [
  "Beginner",
  "Explorer",
  "Builder",
  "Architect",
  "Guardian",
  "Legend",
] as const;

function levelTitle(level: number) {
  return LEVEL_TITLES[Math.min(Math.max(level, 1), LEVEL_TITLES.length) - 1];
}

function plantSymbol(value: string) {
  return (
    {
      tree: "\u{1F332}",
      forest: "\u{1F333}",
      potted: "\u{1FAB4}",
      leaf: "\u{1F33F}",
    }[value] ?? "\u{1F332}"
  );
}

/**
 * 服务端档案边界：登录用户返回 profiles 表真实数据，并从任务与专注事实表
 * 派生等级和花园；未登录时拒绝访问，不回退到演示档案。
 */
export async function getProfile(): Promise<ProfileData> {
  const { supabase, user } = await requireWorkspaceSession();
  const [profile, preference] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("gamification_enabled,time_zone")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (profile.error) throw new Error("Profile could not be loaded");
  if (preference.error && preference.error.code !== "PGRST204") {
    throw new Error("Growth preferences could not be loaded");
  }
  const row = profile.data;
  const timeZone = preference.data?.time_zone ?? "Asia/Shanghai";
  const stats = await loadFocusStats(supabase, timeZone);

  const weeklyMinutes = Math.floor(stats.focusSecondsThisWeek / 60);
  const gamificationEnabled = preference.data?.gamification_enabled ?? true;
  let plants: ProfilePlant[] = [];
  let achievements: ProfileAchievement[] = [];
  let rewardXp = 0;
  let coins = 0;
  if (gamificationEnabled) {
    const synced = await supabase.rpc("sync_growth_rewards");
    // A missing RPC means migration 0010 has not reached this environment. The
    // profile remains readable, but no permanent rewards are fabricated.
    if (synced.error && synced.error.code !== "PGRST202") {
      throw new Error("Growth rewards could not be synchronized");
    }
    if (!synced.error) {
      const [plantResult, eventResult] = await Promise.all([
        supabase
          .from("growth_plants")
          .select("id, symbol, planted_at")
          .eq("user_id", user.id)
          .order("planted_at", { ascending: true }),
        supabase
          .from("growth_events")
          .select("event_key, event_type, xp, coins, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
      ]);
      if (plantResult.error) throw new Error("Growth plants could not be loaded");
      if (eventResult.error) throw new Error("Growth events could not be loaded");
      plants = (plantResult.data ?? []).map((item) => ({
        id: item.id,
        symbol: plantSymbol(item.symbol),
        plantedAt: item.planted_at,
      }));
      achievements = (eventResult.data ?? [])
        .filter((item) => item.event_type === "achievement")
        .map((item) => ({
          key: item.event_key,
          xp: item.xp,
          coins: item.coins,
          earnedAt: item.created_at,
        }));
      for (const event of eventResult.data ?? []) {
        rewardXp += event.xp;
        coins += event.coins;
      }
    }
  }
  const totalXp = stats.completedTasks * 40 + Math.floor(stats.focusSeconds / 60) + rewardXp;
  const level = Math.floor(totalXp / 1000) + 1;

  return {
    isDemo: false,
    displayName: row?.display_name?.trim() || user.email?.split("@")[0] || "Friend",
    email: user.email ?? null,
    userId: user.id,
    avatarUrl: row?.avatar_url ?? null,
    joinedAt: (row?.created_at ?? user.createdAt ?? new Date().toISOString()).slice(0, 10),
    level,
    levelTitle: levelTitle(level),
    xp: totalXp,
    nextLevelXp: level * 1000,
    gamificationEnabled,
    coins,
    achievements,
    focusGarden: {
      weeklyMinutes,
      streakDays: stats.streakDays,
      plants,
    },
  };
}
