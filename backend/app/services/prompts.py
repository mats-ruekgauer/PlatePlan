"""Port of supabase/functions/_shared/prompts.ts"""

import json

PLAN_GENERATION_SYSTEM_PROMPT = """\
You are a nutritionist and meal planning assistant. Your job is to generate a personalized weekly meal plan.

You will receive a JSON object with the user's preferences and feedback history.
You must respond ONLY with a valid JSON object — no markdown, no explanation, no preamble.

The JSON must conform exactly to this structure:
{
  "days": [
    {
      "dayOfWeek": 0,  // 0=Monday through 6=Sunday
      "meals": [
        {
          "slot": "dinner",
          "recipe": { ...RecipeObject },
          "alternativeRecipe": { ...RecipeObject }
        }
      ]
    }
  ]
}

RecipeObject structure:
{
  "title": string,
  "description": string (1-2 sentences),
  "ingredients": [{ "name": string, "amount": number, "unit": string, "category": string }],
  "steps": string[],
  "caloriesPerServing": integer,
  "proteinPerServingG": integer,
  "carbsPerServingG": integer,
  "fatPerServingG": integer,
  "servings": integer,
  "cookTimeMinutes": integer,
  "cuisine": string,
  "tags": string[],
  "isSeasonal": boolean,
  "season": "spring" | "summer" | "autumn" | "winter" | "all",
  "estimatedPriceEur": number  // estimated cost per serving in EUR (rough estimate is fine)
}

Rules:
- Only plan the meal slots specified in managedMealSlots
- Respect all dietary restrictions and disliked ingredients strictly
- Hit the calorie target for managed meals (total daily calories = target minus unmanagedSlotCalories)
- Respect maxCookTimeMinutes
- caloriesPerServing, proteinPerServingG, carbsPerServingG, fatPerServingG, servings and cookTimeMinutes must be integers
- If batchCookDays > 1, group recipes so the same dish appears across consecutive days and scale servings accordingly
- Prefer liked cuisines
- liked_ingredients lists ingredients the user enjoys — incorporate them where appropriate and naturally
- seasonality_importance is a 1–5 scale (1=ignore seasons entirely, 5=strictly seasonal produce only). Adjust ingredient seasonality accordingly for the current month.
- Do not repeat any recipe that has a wouldRepeat=false feedback entry
- Prefer recipes with high taste ratings from feedback history
- Vary cuisines across the week — do not repeat the same cuisine on consecutive days
- Include pantryStaples implicitly (do not list them as ingredients in the shopping list)
- estimatedPriceEur should be a realistic per-serving cost estimate in EUR; use 0 if genuinely unknown
- preferred_language controls the output language for all user-facing recipe text (title, description, ingredient names, steps, cuisine labels and tags)
- favoriteDishes is a list of the user's all-time favourite meals — include them or very similar dishes more frequently (aim for at least 1-2 per week if the list is non-empty)\
"""


def build_plan_generation_user_prompt(
    *,
    week_start: str,
    preferences: object,
    feedback_history: list,
    favorite_dishes: list,
    manual_recipes: list,
    current_month: str,
    member_count: int = 1,
) -> str:
    household_note = (
        f"\nThis plan is for a household of {member_count} people. Scale all recipe servings accordingly."
        if member_count > 1
        else ""
    )

    manual_recipes_section = (
        f"""
The user has added the following personal recipes to their collection. Include them in the plan where they fit the user's preferences and goals:
{json.dumps(manual_recipes, indent=2)}
"""
        if manual_recipes
        else ""
    )

    return f"""\
Generate a weekly meal plan starting Monday {week_start} for a user with these preferences:{household_note}

{json.dumps(preferences, indent=2)}

Feedback history (use this to avoid disliked meals and favour liked ones):
{json.dumps(feedback_history, indent=2)}

Favourite dishes (include these or very similar dishes at least 1-2 times this week):
{json.dumps(favorite_dishes, indent=2)}
{manual_recipes_section}
Current month: {current_month} (use for seasonal logic)

Generate all user-facing recipe text in the preferred_language from the preferences JSON.\
"""
