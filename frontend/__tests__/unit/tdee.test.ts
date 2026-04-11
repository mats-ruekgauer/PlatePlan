import { calculateTdee } from '../../stores/onboardingStore';

describe('calculateTdee — Mifflin-St Jeor', () => {
  // ── Male examples ─────────────────────────────────────────────────────────

  it('calculates BMR for a standard male', () => {
    const result = calculateTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'male',
      activityLevel: 'sedentary',
    });
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(result.bmr).toBe(1780);
  });

  it('applies the sedentary multiplier (1.2) for a male', () => {
    const result = calculateTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'male',
      activityLevel: 'sedentary',
    });
    // TDEE = round(1780 * 1.2) = round(2136) = 2136
    expect(result.tdee).toBe(2136);
  });

  it('applies the moderate multiplier (1.55) for a male', () => {
    const result = calculateTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'male',
      activityLevel: 'moderate',
    });
    // TDEE = round(1780 * 1.55) = round(2759) = 2759
    expect(result.tdee).toBe(2759);
  });

  it('applies the very_active multiplier (1.9) for a male', () => {
    const result = calculateTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'male',
      activityLevel: 'very_active',
    });
    // TDEE = round(1780 * 1.9) = round(3382) = 3382
    expect(result.tdee).toBe(3382);
  });

  // ── Female examples ───────────────────────────────────────────────────────

  it('calculates BMR for a standard female', () => {
    const result = calculateTdee({
      weightKg: 65,
      heightCm: 165,
      age: 28,
      sex: 'female',
      activityLevel: 'light',
    });
    // BMR = 10*65 + 6.25*165 - 5*28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25 → 1380
    expect(result.bmr).toBe(1380);
  });

  it('applies light multiplier (1.375) for a female', () => {
    const result = calculateTdee({
      weightKg: 65,
      heightCm: 165,
      age: 28,
      sex: 'female',
      activityLevel: 'light',
    });
    // TDEE = round(1380 * 1.375) = round(1897.5) = 1898
    expect(result.tdee).toBe(1898);
  });

  // ── Calorie target & protein ──────────────────────────────────────────────

  it('subtracts the default 300 kcal deficit from TDEE', () => {
    const result = calculateTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'male',
      activityLevel: 'moderate',
    });
    expect(result.calorieTarget).toBe(result.tdee - 300);
  });

  it('subtracts a custom deficit', () => {
    const result = calculateTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'male',
      activityLevel: 'moderate',
      deficit: 500,
    });
    expect(result.calorieTarget).toBe(result.tdee - 500);
  });

  it('never returns a calorieTarget below 1200 kcal', () => {
    // Extreme case: tiny person + large deficit
    const result = calculateTdee({
      weightKg: 40,
      heightCm: 140,
      age: 80,
      sex: 'female',
      activityLevel: 'sedentary',
      deficit: 9999,
    });
    expect(result.calorieTarget).toBeGreaterThanOrEqual(1200);
  });

  it('sets protein target at 1.8g per kg bodyweight', () => {
    const result = calculateTdee({
      weightKg: 70,
      heightCm: 175,
      age: 25,
      sex: 'male',
      activityLevel: 'active',
    });
    expect(result.proteinTargetG).toBe(Math.round(70 * 1.8));
  });

  // ── "Other" sex uses female formula ──────────────────────────────────────

  it('treats sex=other identically to female for BMR', () => {
    const female = calculateTdee({
      weightKg: 70,
      heightCm: 170,
      age: 35,
      sex: 'female',
      activityLevel: 'moderate',
    });
    // "other" is not defined in Mifflin-St Jeor; our implementation uses female.
    // This test documents the behaviour so it doesn't silently change.
    const other = calculateTdee({
      weightKg: 70,
      heightCm: 170,
      age: 35,
      sex: 'other',
      activityLevel: 'moderate',
    });
    expect(other.bmr).toBe(female.bmr);
  });
});
