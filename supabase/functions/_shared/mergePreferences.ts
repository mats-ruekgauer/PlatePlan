// Pure TypeScript — no Deno APIs. Importable by both Edge Functions and Jest tests.

export interface MemberPrefs {
  calorieTarget: number | null;
  proteinTargetG: number | null;
  dietaryRestrictions: string[];
  likedIngredients: string[];
  dislikedIngredients: string[];
  likedCuisines: string[];
  seasonalityImportance: number;
  maxCookTimeMinutes: number;
  pantryStaples: string[];
}

export interface MergedPreferences {
  calorieTarget: number;
  proteinTargetG: number;
  dietaryRestrictions: string[];
  likedIngredients: string[];
  dislikedIngredients: string[];
  likedCuisines: string[];
  seasonalityImportance: number;
  maxCookTimeMinutes: number;
  pantryStaples: string[];
  memberCount: number;
}

function union<T>(arrays: T[][]): T[] {
  return [...new Set(arrays.flat())];
}

export function mergePreferences(members: MemberPrefs[]): MergedPreferences {
  if (members.length === 0) {
    throw new Error('mergePreferences requires at least one member');
  }

  const calorieTarget = members.reduce(
    (sum, m) => sum + (m.calorieTarget ?? 2000),
    0,
  );
  const proteinTargetG = members.reduce(
    (sum, m) => sum + (m.proteinTargetG ?? 150),
    0,
  );
  const maxCookTimeMinutes = Math.min(
    ...members.map((m) => m.maxCookTimeMinutes),
  );
  const avgSeasonality =
    members.reduce((sum, m) => sum + m.seasonalityImportance, 0) / members.length;
  const seasonalityImportance = Math.round(avgSeasonality);

  return {
    calorieTarget,
    proteinTargetG,
    dietaryRestrictions: union(members.map((m) => m.dietaryRestrictions)),
    likedIngredients: union(members.map((m) => m.likedIngredients)),
    dislikedIngredients: union(members.map((m) => m.dislikedIngredients)),
    likedCuisines: union(members.map((m) => m.likedCuisines)),
    seasonalityImportance,
    maxCookTimeMinutes,
    pantryStaples: union(members.map((m) => m.pantryStaples)),
    memberCount: members.length,
  };
}
