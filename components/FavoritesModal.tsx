import React from 'react';
import { FoodItem } from '../types';

interface FavoritesModalProps {
  favorites: FoodItem[];
  onQuickLog: (fav: FoodItem) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({ favorites, onQuickLog, onDelete, onCreate, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in-up">
     <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
         <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                 </svg>
                 Quick Add
             </h3>
             <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
             </button>
         </div>

         <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4">
             {favorites.length === 0 ? (
                 <div className="text-center py-8 text-slate-500">
                     <p className="text-sm">No favorites added yet.</p>
                     <p className="text-xs mt-1">Create shortcuts for foods you eat often.</p>
                 </div>
             ) : (
                 favorites.map(fav => (
                     <div key={fav.id} className="group flex items-center bg-slate-800 p-3 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => onQuickLog(fav)}>
                         <div className="flex-1">
                             <p className="font-bold text-slate-200">{fav.name}</p>
                             <p className="text-xs text-slate-500">{fav.calories} kcal • {fav.macros.protein}p {fav.macros.carbs}c {fav.macros.fat}f</p>
                         </div>
                         <button
                             onClick={(e) => { e.stopPropagation(); onDelete(fav.id); }}
                             className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                             </svg>
                         </button>
                     </div>
                 ))
             )}
         </div>

         <button
             onClick={onCreate}
             className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600 hover:border-emerald-500 text-slate-400 hover:text-white transition-all font-medium flex items-center justify-center gap-2"
         >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
             </svg>
             Add New Favorite
         </button>
     </div>
  </div>
);
