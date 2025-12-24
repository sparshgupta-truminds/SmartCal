import React, { useMemo } from 'react';
import * as d3 from 'd3';

interface CalorieGaugeProps {
  current: number;
  target: number;
  size?: number;
}

export const CalorieGauge: React.FC<CalorieGaugeProps> = ({ 
  current, 
  target, 
  size = 280 
}) => {
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  
  // Calculate percentage, capped at 100% for the main arc, but we can show overage differently
  const percentage = Math.min(1, Math.max(0, current / target));
  const isOverLimit = current > target;
  
  // D3 Arc Generator
  const backgroundArc = useMemo(() => {
    return d3.arc()
      .innerRadius(radius - strokeWidth)
      .outerRadius(radius)
      .startAngle(0)
      .endAngle(2 * Math.PI)({} as any);
  }, [radius, strokeWidth]);

  const progressArc = useMemo(() => {
    const angle = 2 * Math.PI * percentage;
    return d3.arc()
      .innerRadius(radius - strokeWidth)
      .outerRadius(radius)
      .startAngle(0)
      .endAngle(angle)
      .cornerRadius(10)({} as any);
  }, [radius, strokeWidth, percentage]);

  const color = isOverLimit ? "#ef4444" : "#10b981"; // Red if over, Emerald if under
  
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90 transition-all duration-500">
        {/* Background Track */}
        <path d={backgroundArc || ""} fill="#1e293b" />
        
        {/* Progress Track */}
        <path 
          d={progressArc || ""} 
          fill={color} 
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Center Text (Absolute positioned to not rotate with SVG) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-bold text-white tracking-tight">
          {current.toLocaleString()}
        </span>
        <span className="text-sm text-slate-400 font-medium uppercase tracking-wider mt-1">
          of {target.toLocaleString()} kcal
        </span>
        {isOverLimit && (
            <span className="text-xs text-red-400 font-semibold mt-2 px-2 py-1 bg-red-900/30 rounded-full">
                Over Limit
            </span>
        )}
      </div>
    </div>
  );
};