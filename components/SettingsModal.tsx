import React, { useState } from 'react';

interface SettingsModalProps {
  goal: number;
  onSave: (goal: number) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ goal, onSave, onClose }) => {
  const [tempGoal, setTempGoal] = useState(goal.toString());

  const handleSave = () => {
    const val = parseInt(tempGoal, 10);
    if (!isNaN(val) && val > 0) onSave(val);
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
