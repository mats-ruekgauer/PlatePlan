/**
 * Unit tests for Zod validation of Claude's plan generation response.
 * We replicate the schemas here (identical to what's in generate-plan/index.ts)
 * so they can run under Jest without Deno.
 */

import { z } from 'zod';

// ─── Schemas (mirror of generate-plan/index.ts) ───────────────────────────────

const IngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  unit: z.string().min(1),
  category: z.string().optional(),
});

const RecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  ingredients: z.array(IngredientSchema).min(1),
  steps: z.array(z.string()).min(1),
  caloriesPerServing: z.number().positive(),
  proteinPerServingG: z.number().nonnegative(),
  carbsPerServingG: z.number().nonnegative(),
  fatPerServingG: z.number().nonnegative(),
  servings: z.number().int().positive(),
  cookTimeMinutes: z.number().positive(),
  cuisine: z.string(),
  tags: z.array(z.string()),
  isSeasonal: z.boolean(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter', 'all']),
});

const PlanResponseSchema = z.object({
  days: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      meals: z.array(
        z.object({
          slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
          recipe: RecipeSchema,
          alternativeRecipe: RecipeSchema,
        }),
      ).min(1),
    }),
  ).min(1),
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validRecipe = {
  title: 'Grilled Chicken',
  description: 'A simple grilled chicken dish.',
  ingredients: [
    { name: 'chicken breast', amount: 200, unit: 'g', category: 'meat' },
    { name: 'lemon juice', amount: 30, unit: 'ml' },
  ],
  steps: ['Season chicken.', 'Grill for 15 minutes.'],
  caloriesPerServing: 350,
  proteinPerServingG: 42,
  carbsPerServingG: 5,
  fatPerServingG: 8,
  servings: 1,
  cookTimeMinutes: 20,
  cuisine: 'Mediterranean',
  tags: ['quick', 'high-protein'],
  isSeasonal: false,
  season: 'all' as const,
};

const validPlanResponse = {
  days: [
    {
      dayOfWeek: 0,
      meals: [
        {
          slot: 'dinner',
          recipe: validRecipe,
          alternativeRecipe: { ...validRecipe, title: 'Salmon Fillet' },
        },
      ],
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlanResponseSchema', () => {
  it('accepts a valid minimal plan response', () => {
    expect(() => PlanResponseSchema.parse(validPlanResponse)).not.toThrow();
  });

  it('accepts a full week (7 days) with multiple meal slots', () => {
    const fullWeek = {
      days: Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        meals: [
          { slot: 'breakfast', recipe: validRecipe, alternativeRecipe: validRecipe },
          { slot: 'dinner', recipe: validRecipe, alternativeRecipe: validRecipe },
        ],
      })),
    };
    expect(() => PlanResponseSchema.parse(fullWeek)).not.toThrow();
  });

  it('rejects a response with no days', () => {
    expect(() => PlanResponseSchema.parse({ days: [] })).toThrow();
  });

  it('rejects a day with no meals', () => {
    const bad = { days: [{ dayOfWeek: 0, meals: [] }] };
    expect(() => PlanResponseSchema.parse(bad)).toThrow();
  });

  it('rejects an invalid dayOfWeek (7)', () => {
    const bad = { days: [{ dayOfWeek: 7, meals: [{ slot: 'dinner', recipe: validRecipe, alternativeRecipe: validRecipe }] }] };
    expect(() => PlanResponseSchema.parse(bad)).toThrow();
  });

  it('rejects an invalid meal slot', () => {
    const bad = {
      days: [{
        dayOfWeek: 0,
        meals: [{ slot: 'brunch', recipe: validRecipe, alternativeRecipe: validRecipe }],
      }],
    };
    expect(() => PlanResponseSchema.parse(bad)).toThrow();
  });

  it('strips and parses a response wrapped in markdown code fences', () => {
    const raw = '```json\n' + JSON.stringify(validPlanResponse) + '\n```';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed: unknown = JSON.parse(cleaned);
    expect(() => PlanResponseSchema.parse(parsed)).not.toThrow();
  });

  it('rejects a recipe with empty title', () => {
    const bad = {
      days: [{
        dayOfWeek: 0,
        meals: [{
          slot: 'dinner',
          recipe: { ...validRecipe, title: '' },
          alternativeRecipe: validRecipe,
        }],
      }],
    };
    expect(() => PlanResponseSchema.parse(bad)).toThrow();
  });

  it('rejects a recipe with negative calories', () => {
    const bad = {
      days: [{
        dayOfWeek: 0,
        meals: [{
          slot: 'dinner',
          recipe: { ...validRecipe, caloriesPerServing: -100 },
          alternativeRecipe: validRecipe,
        }],
      }],
    };
    expect(() => PlanResponseSchema.parse(bad)).toThrow();
  });

  it('rejects a recipe with zero ingredients', () => {
    const bad = {
      days: [{
        dayOfWeek: 0,
        meals: [{
          slot: 'dinner',
          recipe: { ...validRecipe, ingredients: [] },
          alternativeRecipe: validRecipe,
        }],
      }],
    };
    expect(() => PlanResponseSchema.parse(bad)).toThrow();
  });

  it('rejects an invalid season value', () => {
    const bad = {
      days: [{
        dayOfWeek: 0,
        meals: [{
          slot: 'dinner',
          recipe: { ...validRecipe, season: 'monsoon' },
          alternativeRecipe: validRecipe,
        }],
      }],
    };
    expect(() => PlanResponseSchema.parse(bad)).toThrow();
  });

  it('accepts category as optional on ingredients', () => {
    const withoutCategory = {
      days: [{
        dayOfWeek: 0,
        meals: [{
          slot: 'dinner',
          recipe: {
            ...validRecipe,
            ingredients: [{ name: 'pasta', amount: 100, unit: 'g' }], // no category
          },
          alternativeRecipe: validRecipe,
        }],
      }],
    };
    expect(() => PlanResponseSchema.parse(withoutCategory)).not.toThrow();
  });

  it('rejects a plan response that is not an object', () => {
    expect(() => PlanResponseSchema.parse(null)).toThrow();
    expect(() => PlanResponseSchema.parse('string')).toThrow();
    expect(() => PlanResponseSchema.parse(42)).toThrow();
  });
});
