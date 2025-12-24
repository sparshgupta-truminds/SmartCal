import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Macros } from '../types';

interface MacroChartProps {
  macros: Macros;
}

export const MacroChart: React.FC<MacroChartProps> = ({ macros }) => {
  const data = [
    { name: 'Protein', value: macros.protein, color: '#3b82f6' }, // Blue
    { name: 'Carbs', value: macros.carbs, color: '#f59e0b' },    // Amber
    { name: 'Fat', value: macros.fat, color: '#ec4899' },       // Pink
  ];

  // If no data, show a placeholder
  const isEmpty = data.every(d => d.value === 0);
  
  if (isEmpty) {
      return (
          <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
              No macro data yet
          </div>
      )
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 text-xs font-medium mt-2">
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-slate-300">{macros.protein}g Prot</span>
        </div>
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-slate-300">{macros.carbs}g Carb</span>
        </div>
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pink-500"></div>
            <span className="text-slate-300">{macros.fat}g Fat</span>
        </div>
      </div>
    </div>
  );
};
