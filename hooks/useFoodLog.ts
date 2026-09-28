import { useMemo } from 'react';
import { FoodItem, DailyStats } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { isSameDay } from '../utils/date';

// Simple UUID generator
export const generateId = () => Math.random().toString(36).substr(2, 9);

export const useFoodLog = (selectedDate: Date) => {
  const [logs, setLogs] = useLocalStorage<FoodItem[]>('smartcal_logs', []);
  const [favorites, setFavorites] = useLocalStorage<FoodItem[]>('smartcal_favorites', []);

  const displayedLogs = useMemo(
    () => logs.filter(item => isSameDay(new Date(item.timestamp), selectedDate)),
    [logs, selectedDate]
  );

  const dailyStats: DailyStats = useMemo(() => {
    return displayedLogs.reduce((acc, item) => ({
      totalCalories: acc.totalCalories + item.calories,
      totalProtein: acc.totalProtein + item.macros.protein,
      totalCarbs: acc.totalCarbs + item.macros.carbs,
      totalFat: acc.totalFat + item.macros.fat,
    }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
  }, [displayedLogs]);

  const addLog = (item: FoodItem) => setLogs(prev => [item, ...prev]);
  const updateLog = (item: FoodItem) => setLogs(prev => prev.map(l => l.id === item.id ? item : l));
  const deleteLog = (id: string) => setLogs(prev => prev.filter(l => l.id !== id));
  const addFavorite = (item: FoodItem) => setFavorites(prev => [...prev, item]);
  const deleteFavorite = (id: string) => setFavorites(prev => prev.filter(f => f.id !== id));

  return {
    logs, favorites, displayedLogs, dailyStats,
    addLog, updateLog, deleteLog, addFavorite, deleteFavorite,
  };
};
