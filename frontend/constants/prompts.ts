/**
 * All Claude system prompts and user prompt templates for PlatePlan.
 * Prompts are centralised here so they can be versioned and reviewed independently.
 */

// ─── Plan generation ─────────────────────────────────────────────────────────

export const PLAN_GENERATION_SYSTEM_PROMPT = `\
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
  "caloriesPerServing": number,
  "proteinPerServingG": number,
  "carbsPerServingG": number,
  "fatPerServingG": number,
  "servings": number,
  "cookTimeMinutes": number,
  "cuisine": string,
  "tags": string[],
  "isSeasonal": boolean,
  "season": "spring" | "summer" | "autumn" | "winter" | "all"
}

Rules:
- Only plan the meal slots specified in managedMealSlots
- Respect all dietary restrictions and disliked ingredients strictly
- Hit the calorie target for managed meals (total daily calories = target minus unmanagedSlotCalories)
- Respect maxCookTimeMinutes
- If batchCookDays > 1, group recipes so the same dish appears across consecutive days and scale servings accordingly
- Prefer liked cuisines
- If prefersSeasonalIngredients is true, favour seasonal produce for the current month
- Use cookFromScratchPreference (1=convenience food acceptable, 3=mix of fresh and pre-prepared, 5=always cook from raw ingredients) to guide ingredient processing level — at level 1 suggest pre-made sauces, pre-cut veg, ready-cooked grains; at level 5 use only whole raw ingredients
- Do not repeat any recipe that has a wouldRepeat=false feedback entry
- Prefer recipes with high taste ratings from feedback history
- Vary cuisines across the week — do not repeat the same cuisine on consecutive days
- Include pantryStaples implicitly (do not list them as ingredients in the shopping list)\
- preferredLanguage controls the output language for all user-facing recipe text (title, description, ingredient names, steps, cuisine labels and tags)\
`;

/**
 * Builds the user-turn prompt for plan generation.
 * All substitution is done in the Edge Function before calling Claude.
 */
export function buildPlanGenerationUserPrompt(params: {
  weekStart: string;
  preferences: object;
  feedbackHistory: object[];
  favoriteDishes: object[];
  manualRecipes: object[];
  currentMonth: string;
  memberCount?: number;
}): string {
  const householdNote =
    params.memberCount && params.memberCount > 1
      ? `\nThis plan is for a household of ${params.memberCount} people. Scale all recipe servings accordingly.`
      : '';

  const manualRecipesSection =
    params.manualRecipes.length > 0
      ? `
The user has added the following personal recipes to their collection. Include them in the plan where they fit the user's preferences and goals:
${JSON.stringify(params.manualRecipes, null, 2)}
`
      : '';

  return `\
Generate a weekly meal plan starting Monday ${params.weekStart} for a user with these preferences:${householdNote}

${JSON.stringify(params.preferences, null, 2)}

Feedback history (use this to avoid disliked meals and favour liked ones):
${JSON.stringify(params.feedbackHistory, null, 2)}

Favourite dishes (include these or very similar dishes at least 1-2 times this week):
${JSON.stringify(params.favoriteDishes, null, 2)}

${manualRecipesSection}

Current month: ${params.currentMonth} (use for seasonal logic)

Generate all user-facing recipe text in the preferred_language from the preferences JSON.\
`;
}

// ─── Shopping list (deterministic — no Claude call needed) ───────────────────
// Shopping list compilation is pure aggregation logic in the Edge Function.
// No prompt required.

// ─── Receipt OCR ─────────────────────────────────────────────────────────────

export const RECEIPT_OCR_SYSTEM_PROMPT = `\
You are a receipt parser. The user will provide an image of a supermarket receipt.
You must respond ONLY with a valid JSON array — no markdown, no explanation, no preamble.

Each element must conform to:
{
  "itemName": string,       // cleaned product name, lowercase
  "priceEur": number | null,
  "supermarket": string | null  // inferred from receipt header if visible
}

If you cannot parse an item, omit it rather than guessing.\
`;

export function buildReceiptOcrUserPrompt(): string {
  return 'Please parse all line items from this receipt image.';
}

// ─── Feedback / preference learning ─────────────────────────────────────────
// Feedback processing is deterministic (insert + update preferences).
// No Claude call required for MVP.
