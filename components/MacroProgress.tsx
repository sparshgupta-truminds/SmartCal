import React from 'react';
import { Macros } from '../types';

interface MacroProgressProps {
  current: Macros;
  goals: Macros;
}

const ROWS: { key: keyof Macros; label: string; color: string }[] = [
  { key: 'protein', label: 'Protein', color: 'bg-blue-500' },
  { key: 'carbs', label: 'Carbs', color: 'bg-amber-500' },
  { key: 'fat', label: 'Fat', color: 'bg-pink-500' },
];

export const MacroProgress: React.FC<MacroProgressProps> = ({ current, goals }) => (
  <div className="space-y-3 mt-4">
    {ROWS.map(({ key, label, color }) => {
      const value = current[key];
      const goal = goals[key];
      const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
      const over = goal > 0 && value > goal;
      return (
        <div key={key}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium">{label}</span>
            <span className={over ? 'text-red-400' : 'text-slate-400'}>
              {value} / {goal}g
            </span>
          </div>
          <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-400' : color}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);
