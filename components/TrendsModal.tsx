import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { FoodItem } from '../types';
import { lastNDays, loggingStreak } from '../utils/trends';

interface TrendsModalProps {
  logs: FoodItem[];
  dailyGoal: number;
  onClose: () => void;
}

const RANGES = [7, 30];

export const TrendsModal: React.FC<TrendsModalProps> = ({ logs, dailyGoal, onClose }) => {
  const [range, setRange] = useState(7);

  const days = useMemo(() => lastNDays(logs, range), [logs, range]);
  const streak = useMemo(() => loggingStreak(logs), [logs]);

  // Averages only count days that have entries, so empty days don't drag them down
  const loggedDays = days.filter(d => d.logged);
  const avg = (key: 'calories' | 'protein' | 'carbs' | 'fat') =>
    loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d[key], 0) / loggedDays.length) : 0;
  const daysOnTarget = loggedDays.filter(d => d.calories <= dailyGoal).length;

  const stats = [
    { label: 'Avg calories', value: avg('calories').toLocaleString(), sub: `goal ${dailyGoal.toLocaleString()}` },
    { label: 'On target', value: `${daysOnTarget}/${loggedDays.length}`, sub: 'logged days' },
    { label: 'Streak', value: `${streak}`, sub: streak === 1 ? 'day' : 'days' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Trends</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg mb-5">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${range === r ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {r} days
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {stats.map(s => (
            <div key={s.label} className="bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{s.label}</p>
              <p className="text-lg font-bold text-white mt-1">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.sub}</p>
            </div>
          ))}
        </div>

        {loggedDays.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No entries in the last {range} days.</div>
        ) : (
          <>
            <div className="h-48 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days}>
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={range > 7 ? 4 : 0} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(v: number) => [`${v} kcal`, 'Calories']}
                  />
                  <ReferenceLine y={dailyGoal} stroke="#10b981" strokeDasharray="4 4" />
                  <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                    {days.map(d => (
                      <Cell key={d.label} fill={d.calories > dailyGoal ? '#f87171' : '#22d3ee'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-1">Dashed line: daily goal. Red bars: over goal.</p>

            <div className="mt-5 border-t border-slate-800 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Average macros per logged day</p>
              <div className="flex justify-around text-sm">
                <span className="text-blue-400">{avg('protein')}g protein</span>
                <span className="text-amber-400">{avg('carbs')}g carbs</span>
                <span className="text-pink-400">{avg('fat')}g fat</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
