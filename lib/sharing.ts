// lib/sharing.ts — full implementation in step 13 (sharing/export utilities)
// Stub exported here so detail screens compile before that step is complete.

import { Share } from 'react-native';
import type { Recipe } from '../types';

/**
 * Opens the native share sheet with a formatted recipe text.
 * On iOS this includes the WhatsApp option automatically.
 */
export async function shareRecipe(recipe: Recipe): Promise<void> {
  const lines: string[] = [
    `🍽️ *${recipe.title}*`,
    '',
    recipe.description ?? '',
    '',
    `⏱ ${recipe.cookTimeMinutes ?? '?'} min  •  ${recipe.caloriesPerServing ?? '?'} kcal  •  ${recipe.proteinPerServingG ?? '?'}g protein`,
    '',
    '📝 *Ingredients*',
    ...recipe.ingredients.map(
      (i) => `• ${i.amount % 1 === 0 ? i.amount : i.amount.toFixed(1)} ${i.unit} ${i.name}`,
    ),
    '',
    '👨‍🍳 *Steps*',
    ...recipe.steps.map((step, idx) => `${idx + 1}. ${step}`),
    '',
    '_Shared from PlatePlan_',
  ];

  await Share.share({ message: lines.filter(Boolean).join('\n') });
}

/**
 * Opens WhatsApp directly with the recipe text pre-filled.
 * Falls back to the native share sheet if WhatsApp is not installed.
 */
export async function shareRecipeViaWhatsApp(recipe: Recipe): Promise<void> {
  const { Linking } = await import('react-native');
  const lines: string[] = [
    `🍽️ *${recipe.title}*`,
    '',
    recipe.description ?? '',
    '',
    `⏱ ${recipe.cookTimeMinutes ?? '?'} min`,
    '',
    '📝 *Ingredients*',
    ...recipe.ingredients.map(
      (i) => `• ${i.amount % 1 === 0 ? i.amount : i.amount.toFixed(1)} ${i.unit} ${i.name}`,
    ),
  ];

  const text = encodeURIComponent(lines.filter(Boolean).join('\n'));
  const url = `whatsapp://send?text=${text}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    await shareRecipe(recipe);
  }
}
