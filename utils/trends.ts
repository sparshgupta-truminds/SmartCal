import { FoodItem } from '../types';

export interface DayTotal {
  date: Date;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged: boolean;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const totalsByDay = (logs: FoodItem[]) => {
  const map = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
  for (const log of logs) {
    const key = dayKey(new Date(log.timestamp));
    const t = map.get(key) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    t.calories += log.calories;
    t.protein += log.macros.protein;
    t.carbs += log.macros.carbs;
    t.fat += log.macros.fat;
    map.set(key, t);
  }
  return map;
};

// One entry per day for the last `days` days, oldest first, ending today
export const lastNDays = (logs: FoodItem[], days: number, today = new Date()): DayTotal[] => {
  const map = totalsByDay(logs);
  const result: DayTotal[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const t = map.get(dayKey(date));
    result.push({
      date,
      label: days <= 7
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      calories: t?.calories ?? 0,
      protein: t?.protein ?? 0,
      carbs: t?.carbs ?? 0,
      fat: t?.fat ?? 0,
      logged: !!t,
    });
  }
  return result;
};

// Consecutive days with at least one entry, counting back from today
// (or from yesterday if nothing is logged today yet)
export const loggingStreak = (logs: FoodItem[], today = new Date()): number => {
  const map = totalsByDay(logs);
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!map.has(dayKey(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (map.has(dayKey(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
};
