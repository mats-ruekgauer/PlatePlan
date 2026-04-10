import { buildPlanGenerationUserPrompt } from '../../supabase/functions/_shared/prompts';

describe('buildPlanGenerationUserPrompt', () => {
  const baseParams = {
    weekStart: '2026-04-13',
    preferences: { preferred_language: 'de' },
    feedbackHistory: [],
    favoriteDishes: [],
    currentMonth: 'April',
  };

  it('includes manual recipes when present', () => {
    const prompt = buildPlanGenerationUserPrompt({
      ...baseParams,
      manualRecipes: [
        { title: 'Linsenbolognese', description: 'Tomatig und proteinreich.' },
      ],
    });

    expect(prompt).toContain('personal recipes');
    expect(prompt).toContain('Linsenbolognese');
  });

  it('omits the manual recipe section when none exist', () => {
    const prompt = buildPlanGenerationUserPrompt({
      ...baseParams,
      manualRecipes: [],
    });

    expect(prompt).not.toContain('personal recipes');
  });
});
