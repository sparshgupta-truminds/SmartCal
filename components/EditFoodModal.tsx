import React from 'react';
import { FoodItem, Macros, MealType } from '../types';
import { MEAL_TYPES } from '../utils/meals';

export const NEW_ENTRY_ID = 'NEW_ENTRY';
export const NEW_FAVORITE_ID = 'NEW_FAVORITE';
// An AI estimate waiting for the user to confirm it
export const REVIEW_ENTRY_ID = 'REVIEW_ENTRY';

interface EditFoodModalProps {
  item: FoodItem;
  onChange: (item: FoodItem) => void;
  onAutoFill: () => void;
  isAnalyzing: boolean;
  error?: string;
  onSave: () => void;
  onClose: () => void;
}

export const EditFoodModal: React.FC<EditFoodModalProps> = ({ item, onChange, onAutoFill, isAnalyzing, error, onSave, onClose }) => {
  const isNew = item.id === NEW_ENTRY_ID || item.id === NEW_FAVORITE_ID;

  const updateField = (field: keyof FoodItem | keyof Macros, value: string | number) => {
    // Allow empty string for temporary editing state, but store numbers as numbers
    const numValue = value === '' ? 0 : Number(value);

    if (field === 'protein' || field === 'carbs' || field === 'fat') {
      onChange({ ...item, macros: { ...item.macros, [field]: numValue } });
    } else {
      onChange({ ...item, [field]: field === 'name' || field === 'quantityStr' ? value : numValue });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-1">
              {item.id === REVIEW_ENTRY_ID ? 'Review Estimate' :
               item.id === NEW_ENTRY_ID ? 'Add Custom Food' :
               item.id === NEW_FAVORITE_ID ? 'Add Common Food' : 'Edit Food Details'}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              {item.id === REVIEW_ENTRY_ID ? 'Check the AI estimate and adjust anything that looks off.' :
               item.id === NEW_ENTRY_ID ? 'Enter info manually or use Auto-Fill.' :
               item.id === NEW_FAVORITE_ID ? 'Create a shortcut. Type a name and Auto-Fill.' :
               'Update nutrition information manually.'}
            </p>

            <div className="space-y-4 mb-8">
                <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Food Description</label>
                    <div className="flex gap-2">
                      <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          placeholder="e.g. 200g Chicken Breast"
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                      />
                      {/* Auto-Fill Button for New Items */}
                      {isNew && (
                          <button
                              onClick={onAutoFill}
                              disabled={!item.name || isAnalyzing}
                              className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Auto-Fill Macros from Description"
                          >
                              {isAnalyzing ? (
                                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                              ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                  </svg>
                              )}
                          </button>
                      )}
                    </div>
                    {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
                </div>

                {/* Favorites are logged into whatever meal is current, so they don't get one */}
                {item.id !== NEW_FAVORITE_ID && (
                  <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Meal</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {MEAL_TYPES.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => onChange({ ...item, mealType: value as MealType })}
                            className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${item.mealType === value
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Calories</label>
                      <input
                        type="number"
                        value={item.calories}
                        onChange={(e) => updateField('calories', e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                      />
                  </div>
                  <div>
                       <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Protein (g)</label>
                       <input
                         type="number"
                         value={item.macros.protein}
                         onChange={(e) => updateField('protein', e.target.value)}
                         placeholder="0"
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
                       />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Carbs (g)</label>
                      <input
                        type="number"
                        value={item.macros.carbs}
                        onChange={(e) => updateField('carbs', e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-600"
                      />
                  </div>
                  <div>
                       <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Fat (g)</label>
                       <input
                         type="number"
                         value={item.macros.fat}
                         onChange={(e) => updateField('fat', e.target.value)}
                         placeholder="0"
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-slate-600"
                       />
                  </div>
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
                  onClick={onSave}
                  disabled={!item.name || isAnalyzing}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold transition-colors"
                >
                    {item.id === REVIEW_ENTRY_ID ? 'Log Food' :
                     item.id === NEW_ENTRY_ID ? 'Add Item' :
                     item.id === NEW_FAVORITE_ID ? 'Save Favorite' : 'Save Changes'}
                </button>
            </div>
        </div>
    </div>
  );
};
