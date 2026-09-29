import { Macros } from '../types';

// Default split when the user hasn't set explicit targets: 30% protein, 40% carbs, 30% fat
export const defaultMacroGoals = (calories: number): Macros => ({
  protein: Math.round((calories * 0.3) / 4),
  carbs: Math.round((calories * 0.4) / 4),
  fat: Math.round((calories * 0.3) / 9),
});
