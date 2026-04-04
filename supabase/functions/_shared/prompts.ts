// supabase/functions/_shared/prompts.ts
// Deno-compatible copy of constants/prompts.ts for use inside Edge Functions.
// Keep in sync with constants/prompts.ts in the app.

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
- Do not repeat any recipe that has a wouldRepeat=false feedback entry
- Prefer recipes with high taste ratings from feedback history
- Vary cuisines across the week — do not repeat the same cuisine on consecutive days
- Include pantryStaples implicitly (do not list them as ingredients in the shopping list)\
`;

export function buildPlanGenerationUserPrompt(params: {
  weekStart: string;
  preferences: object;
  feedbackHistory: object[];
  currentMonth: string;
}): string {
  return `\
Generate a weekly meal plan starting Monday ${params.weekStart} for a user with these preferences:

${JSON.stringify(params.preferences, null, 2)}

Feedback history (use this to avoid disliked meals and favour liked ones):
${JSON.stringify(params.feedbackHistory, null, 2)}

Current month: ${params.currentMonth} (use for seasonal logic)\
`;
}

export const RECEIPT_OCR_SYSTEM_PROMPT = `\
You are a receipt parser. The user will provide an image of a supermarket receipt.
You must respond ONLY with a valid JSON array — no markdown, no explanation, no preamble.

Each element must conform to:
{
  "itemName": string,
  "priceEur": number | null,
  "supermarket": string | null
}

If you cannot parse an item, omit it rather than guessing.\
`;

export function buildReceiptOcrUserPrompt(): string {
  return 'Please parse all line items from this receipt image.';
}
