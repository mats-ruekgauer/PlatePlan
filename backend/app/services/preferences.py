"""Port of supabase/functions/_shared/mergePreferences.ts"""


def merge_preferences(members: list[dict]) -> dict:
    """Merge preferences for all household members into a single set.

    - Sums calorie/protein targets (with defaults)
    - Takes the minimum max_cook_time_minutes
    - Averages and rounds seasonality_importance
    - Unions all list-type preference fields
    """
    if not members:
        raise ValueError("merge_preferences requires at least one member")

    calorie_target = sum(m.get("calorie_target") or 2000 for m in members)
    protein_target_g = sum(m.get("protein_target_g") or 150 for m in members)
    max_cook_time = min(
        m.get("max_cook_time_minutes") or 60 for m in members
    )
    avg_seasonality = sum(m.get("seasonality_importance") or 3 for m in members) / len(members)
    seasonality_importance = round(avg_seasonality)

    def union(key: str) -> list:
        seen: set = set()
        result = []
        for m in members:
            for v in m.get(key) or []:
                if v not in seen:
                    seen.add(v)
                    result.append(v)
        return result

    return {
        "calorieTarget": calorie_target,
        "proteinTargetG": protein_target_g,
        "maxCookTimeMinutes": max_cook_time,
        "seasonalityImportance": seasonality_importance,
        "dietaryRestrictions": union("dietary_restrictions"),
        "likedIngredients": union("liked_ingredients"),
        "dislikedIngredients": union("disliked_ingredients"),
        "likedCuisines": union("liked_cuisines"),
        "pantryStaples": union("pantry_staples"),
        "managedMealSlots": union("managed_meal_slots"),
        "memberCount": len(members),
    }
