/**
 * Unit tests for shopping list ingredient aggregation and pantry subtraction.
 *
 * These functions live inside the Edge Function (generate-shopping-list/index.ts)
 * but are also easy to test in isolation. We replicate them here as pure
 * functions so Jest can run them without Deno.
 */

import type { ShoppingItem } from '../../types';

// ─── Pure functions extracted from the Edge Function for testability ──────────

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  category?: string;
}

interface RawMeal {
  recipe: { title: string; ingredients: Ingredient[] } | null;
}

/**
 * Aggregates ingredients from multiple meals into a deduplicated shopping list.
 * Merges same name+unit pairs by summing amounts.
 */
function aggregateIngredients(meals: RawMeal[]): Map<string, ShoppingItem> {
  const merged = new Map<string, ShoppingItem>();

  for (const meal of meals) {
    if (!meal.recipe) continue;
    for (const ing of meal.recipe.ingredients) {
      const key = `${ing.name.toLowerCase().trim()}||${ing.unit.toLowerCase().trim()}`;
      const existing = merged.get(key);
      if (existing) {
        existing.amount += ing.amount;
        if (!existing.forMeals!.includes(meal.recipe.title)) {
          existing.forMeals!.push(meal.recipe.title);
        }
      } else {
        merged.set(key, {
          name: ing.name.toLowerCase().trim(),
          amount: ing.amount,
          unit: ing.unit.toLowerCase().trim(),
          category: ing.category ?? 'other',
          checked: false,
          forMeals: [meal.recipe.title],
        });
      }
    }
  }
  return merged;
}

/**
 * Removes pantry staples from an aggregated shopping map.
 * Uses inclusive string matching in both directions.
 */
function subtractPantryStaples(
  merged: Map<string, ShoppingItem>,
  pantryStaples: string[],
): ShoppingItem[] {
  const normalised = pantryStaples.map((s) => s.toLowerCase().trim());
  const result: ShoppingItem[] = [];
  for (const item of merged.values()) {
    const isPantry = normalised.some(
      (staple) => item.name.includes(staple) || staple.includes(item.name),
    );
    if (!isPantry) result.push(item);
  }
  return result;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('aggregateIngredients', () => {
  it('merges two meals with the same ingredient and unit', () => {
    const meals: RawMeal[] = [
      { recipe: { title: 'Chicken stir-fry', ingredients: [{ name: 'chicken breast', amount: 200, unit: 'g' }] } },
      { recipe: { title: 'Chicken salad', ingredients: [{ name: 'chicken breast', amount: 150, unit: 'g' }] } },
    ];
    const result = aggregateIngredients(meals);
    const item = result.get('chicken breast||g');
    expect(item).toBeDefined();
    expect(item!.amount).toBe(350);
    expect(item!.forMeals).toEqual(['Chicken stir-fry', 'Chicken salad']);
  });

  it('keeps separate entries for the same ingredient with different units', () => {
    const meals: RawMeal[] = [
      { recipe: { title: 'Recipe A', ingredients: [{ name: 'olive oil', amount: 2, unit: 'tbsp' }] } },
      { recipe: { title: 'Recipe B', ingredients: [{ name: 'olive oil', amount: 100, unit: 'ml' }] } },
    ];
    const result = aggregateIngredients(meals);
    expect(result.size).toBe(2);
    expect(result.get('olive oil||tbsp')!.amount).toBe(2);
    expect(result.get('olive oil||ml')!.amount).toBe(100);
  });

  it('normalises ingredient names to lowercase', () => {
    const meals: RawMeal[] = [
      { recipe: { title: 'Pasta', ingredients: [{ name: 'Spaghetti', amount: 100, unit: 'g' }] } },
    ];
    const result = aggregateIngredients(meals);
    expect(result.has('spaghetti||g')).toBe(true);
  });

  it('skips meals with null recipe', () => {
    const meals: RawMeal[] = [
      { recipe: null },
      { recipe: { title: 'Real meal', ingredients: [{ name: 'egg', amount: 2, unit: 'pcs' }] } },
    ];
    const result = aggregateIngredients(meals);
    expect(result.size).toBe(1);
  });

  it('handles an empty meals array', () => {
    const result = aggregateIngredients([]);
    expect(result.size).toBe(0);
  });

  it('records forMeals without duplicates when the same recipe appears twice', () => {
    const meals: RawMeal[] = [
      { recipe: { title: 'Pasta', ingredients: [{ name: 'pasta', amount: 100, unit: 'g' }] } },
      { recipe: { title: 'Pasta', ingredients: [{ name: 'pasta', amount: 100, unit: 'g' }] } },
    ];
    const result = aggregateIngredients(meals);
    const item = result.get('pasta||g');
    expect(item!.amount).toBe(200);
    expect(item!.forMeals).toEqual(['Pasta']); // deduplicated
  });

  it('handles decimal amounts correctly', () => {
    const meals: RawMeal[] = [
      { recipe: { title: 'A', ingredients: [{ name: 'butter', amount: 0.5, unit: 'tbsp' }] } },
      { recipe: { title: 'B', ingredients: [{ name: 'butter', amount: 1.5, unit: 'tbsp' }] } },
    ];
    const result = aggregateIngredients(meals);
    expect(result.get('butter||tbsp')!.amount).toBeCloseTo(2.0);
  });
});

describe('subtractPantryStaples', () => {
  const PANTRY = ['olive oil', 'salt', 'pepper', 'garlic', 'onion', 'butter', 'eggs'];

  function buildMap(items: Array<{ name: string; unit: string; amount: number }>): Map<string, ShoppingItem> {
    const m = new Map<string, ShoppingItem>();
    for (const i of items) {
      m.set(`${i.name}||${i.unit}`, { ...i, checked: false, category: 'other', forMeals: [] });
    }
    return m;
  }

  it('removes exact pantry staple matches', () => {
    const merged = buildMap([
      { name: 'chicken breast', unit: 'g', amount: 300 },
      { name: 'olive oil', unit: 'tbsp', amount: 2 },
      { name: 'salt', unit: 'tsp', amount: 1 },
    ]);
    const result = subtractPantryStaples(merged, PANTRY);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('chicken breast');
  });

  it('removes staples via substring matching (staple contains item name)', () => {
    // 'garlic cloves' contains 'garlic'
    const merged = buildMap([{ name: 'garlic', unit: 'cloves', amount: 3 }]);
    const result = subtractPantryStaples(merged, PANTRY);
    expect(result).toHaveLength(0);
  });

  it('removes staples via reverse substring matching (item name contains staple)', () => {
    // item name 'black pepper' contains staple 'pepper'
    const merged = buildMap([{ name: 'black pepper', unit: 'tsp', amount: 0.5 }]);
    const result = subtractPantryStaples(merged, PANTRY);
    expect(result).toHaveLength(0);
  });

  it('keeps ingredients that are not pantry staples', () => {
    const merged = buildMap([
      { name: 'salmon fillet', unit: 'g', amount: 200 },
      { name: 'broccoli', unit: 'g', amount: 300 },
    ]);
    const result = subtractPantryStaples(merged, PANTRY);
    expect(result).toHaveLength(2);
  });

  it('handles empty pantry list (keeps everything)', () => {
    const merged = buildMap([
      { name: 'olive oil', unit: 'tbsp', amount: 2 },
      { name: 'pasta', unit: 'g', amount: 200 },
    ]);
    const result = subtractPantryStaples(merged, []);
    expect(result).toHaveLength(2);
  });

  it('handles empty merged map', () => {
    const result = subtractPantryStaples(new Map(), PANTRY);
    expect(result).toHaveLength(0);
  });
});
