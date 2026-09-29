export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  quantityStr: string;
  calories: number;
  macros: Macros;
  // New fields for detailed view (optional for backward compatibility)
  fiber?: number;
  sugar?: number;
  healthScore?: number; // 1-10
  smartInsights?: string[]; 
  mealType?: MealType; // older entries don't have one; they're grouped by time of day
  aiModel?: string; // Gemini model that produced the estimate, if AI-analyzed
  timestamp: number;
}

export interface DailyStats {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}