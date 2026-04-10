jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { toWeekLabel } from '../../hooks/useCookedMeals';

describe('toWeekLabel', () => {
  it('formats a normal ISO week label', () => {
    expect(toWeekLabel('2026-04-06')).toBe('KW 15 · 2026');
  });

  it('handles ISO week year rollover correctly', () => {
    expect(toWeekLabel('2025-12-29')).toBe('KW 1 · 2026');
  });
});
