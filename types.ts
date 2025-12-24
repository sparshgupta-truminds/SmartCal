export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

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