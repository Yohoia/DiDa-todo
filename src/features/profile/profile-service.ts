import "server-only";

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
 * Server-side profile boundary. Replace the demo object with the authenticated
 * user repository when account persistence is connected.
 */
export async function getProfile(): Promise<ProfileData> {
  return {
    ...demoProfile,
    displayName: process.env.DIDA_PROFILE_NAME?.trim() || demoProfile.displayName,
    avatarUrl: process.env.DIDA_PROFILE_AVATAR_URL?.trim() || demoProfile.avatarUrl,
  };
}
