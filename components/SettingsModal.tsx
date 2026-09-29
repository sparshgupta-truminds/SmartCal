import React, { useState } from 'react';
import { Macros } from '../types';
import { defaultMacroGoals } from '../utils/macros';

interface SettingsModalProps {
  goal: number;
  macroGoals: Macros | null;
  onSave: (goal: number, macroGoals: Macros | null) => void;
  onClose: () => void;
}

const MACRO_FIELDS: { key: keyof Macros; label: string; ring: string }[] = [
  { key: 'protein', label: 'Protein', ring: 'focus:ring-blue-500' },
  { key: 'carbs', label: 'Carbs', ring: 'focus:ring-amber-500' },
  { key: 'fat', label: 'Fat', ring: 'focus:ring-pink-500' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ goal, macroGoals, onSave, onClose }) => {
  const [tempGoal, setTempGoal] = useState(goal.toString());
  const [tempMacros, setTempMacros] = useState<Record<keyof Macros, string>>({
    protein: macroGoals ? macroGoals.protein.toString() : '',
    carbs: macroGoals ? macroGoals.carbs.toString() : '',
    fat: macroGoals ? macroGoals.fat.toString() : '',
  });

  const parsedGoal = parseInt(tempGoal, 10);
  const placeholders = defaultMacroGoals(!isNaN(parsedGoal) && parsedGoal > 0 ? parsedGoal : goal);

  const handleSave = () => {
    if (isNaN(parsedGoal) || parsedGoal <= 0) return;

    // All three blank = auto (derived from calorie goal); otherwise blanks fall back to the auto value
    const allBlank = MACRO_FIELDS.every(({ key }) => !tempMacros[key].trim());
    let macros: Macros | null = null;
    if (!allBlank) {
      const auto = defaultMacroGoals(parsedGoal);
      macros = { ...auto };
      for (const { key } of MACRO_FIELDS) {
        const v = parseInt(tempMacros[key], 10);
        if (!isNaN(v) && v >= 0) macros[key] = v;
      }
    }
    onSave(parsedGoal, macros);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-2">App Settings</h3>

            <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Daily Goal (kcal)</label>
                  <input
                    type="number"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Macro Targets (g)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {MACRO_FIELDS.map(({ key, label, ring }) => (
                      <div key={key}>
                        <input
                          type="number"
                          value={tempMacros[key]}
                          onChange={(e) => setTempMacros(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholders[key].toString()}
                          className={`w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 ${ring} placeholder-slate-600`}
                        />
                        <span className="block text-[10px] text-slate-500 mt-1 text-center">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Leave blank to use a 30/40/30 split of your calorie goal.</p>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg text-slate-400 font-medium hover:bg-slate-800 transition-colors"
                >
                    Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-colors"
                >
                    Save
                </button>
            </div>
        </div>
    </div>
  );
};
