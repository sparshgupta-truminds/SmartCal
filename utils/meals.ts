import { MealType } from '../types';

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks' },
];

// Best guess from the time of day; the user can change it before saving
export const mealForTime = (date: Date): MealType => {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 18 && h < 22) return 'dinner';
  return 'snack';
};
