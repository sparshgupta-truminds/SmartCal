import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FoodItem } from '../types';

interface FoodDetailModalProps {
  item: FoodItem;
  onClose: () => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({ item, onClose }) => {
  const data = [
    { name: 'Carbs', value: item.macros.carbs, color: '#3b82f6' }, // Blue
    { name: 'Fat', value: item.macros.fat, color: '#eab308' },    // Yellow/Orange
    { name: 'Protein', value: item.macros.protein, color: '#10b981' }, // Green
  ];

  // Handle missing data for older logs
  const fiber = item.fiber ?? 0;
  const sugar = item.sugar ?? 0;
  const score = item.healthScore ?? 5;
  const insights = item.smartInsights ?? ["No insights available for this item."];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in-up">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 pb-2 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize leading-tight">{item.name}</h2>
            <p className="text-slate-400 text-sm mt-1">Input: {item.quantityStr}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-center min-w-[80px]">
            <span className="block text-xl font-bold text-emerald-400">{item.calories}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-600/80 tracking-wider">Calories</span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-6 space-y-6">
          
          {/* Main Stats Row */}
          <div className="flex flex-col sm:flex-row gap-6">
            
            {/* Donut Chart */}
            <div className="bg-slate-800/50 rounded-2xl p-4 flex-1 flex flex-col items-center justify-center border border-slate-700/50 relative min-h-[180px]">
              <h3 className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Breakdown</h3>
              <div className="h-32 w-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={55}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="text-center">
                         <span className="text-xs text-slate-500 font-medium block">Total</span>
                         <span className="text-sm font-bold text-white">{item.macros.protein + item.macros.carbs + item.macros.fat}g</span>
                     </div>
                 </div>
              </div>
              
              {/* Custom Legend */}
              <div className="flex gap-3 text-[10px] mt-2">
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div> Carbs
                 </div>
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Fat
                 </div>
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Prot
                 </div>
              </div>
            </div>

            {/* Nutrient Grid */}
            <div className="flex-1 grid grid-cols-2 gap-3">
               <NutrientCard label="Protein" value={`${item.macros.protein}g`} iconColor="text-emerald-400" bgColor="bg-emerald-500/10" 
                  icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />} 
               />
               <NutrientCard label="Carbs" value={`${item.macros.carbs}g`} iconColor="text-blue-400" bgColor="bg-blue-500/10" 
                  icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />} 
               />
               <NutrientCard label="Fats" value={`${item.macros.fat}g`} iconColor="text-yellow-400" bgColor="bg-yellow-500/10" 
                  icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />} 
               />
               
               {/* Health Score */}
               <div className="bg-slate-800 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-3xl"></div>
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Score</span>
                   </div>
                   <div className="flex items-end gap-1">
                      <span className={`text-xl font-bold ${score >= 7 ? 'text-green-400' : score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>{score}</span>
                      <span className="text-xs text-slate-500 mb-1">/10</span>
                   </div>
                   <div className="w-full bg-slate-700 h-1 rounded-full mt-2">
                      <div className={`h-full rounded-full ${score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${score * 10}%`}}></div>
                   </div>
               </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
                 <div className="p-2 bg-green-500/10 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
                    </svg>
                 </div>
                 <div>
                     <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fiber</p>
                     <p className="text-lg font-bold text-white">{fiber}g</p>
                 </div>
             </div>
             <div className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
                 <div className="p-2 bg-pink-500/10 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1V8a1 1 0 011-1zm5-5a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0V6h-1a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1V8a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                 </div>
                 <div>
                     <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sugar</p>
                     <p className="text-lg font-bold text-white">{sugar}g</p>
                 </div>
             </div>
          </div>

          {/* Smart Insights */}
          <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/30">
             <div className="flex items-center gap-2 mb-3">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                 </svg>
                 <h4 className="font-bold text-slate-200">Smart Insights</h4>
             </div>
             <ul className="space-y-2">
                 {insights.map((insight, idx) => (
                     <li key={idx} className="flex gap-3 text-sm text-slate-400 leading-relaxed">
                         <span className="text-emerald-500 mt-1.5">•</span>
                         <span>{insight}</span>
                     </li>
                 ))}
             </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
           <button 
             onClick={onClose}
             className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors"
           >
             Close Details
           </button>
        </div>
      </div>
    </div>
  );
};

interface NutrientCardProps {
    label: string;
    value: string;
    icon: React.ReactNode;
    iconColor: string;
    bgColor: string;
}

const NutrientCard: React.FC<NutrientCardProps> = ({ label, value, icon, iconColor, bgColor }) => (
    <div className="bg-slate-800 p-3 rounded-xl flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-md ${bgColor}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {icon}
                </svg>
            </div>
        </div>
        <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">{label}</span>
            <span className="text-lg font-bold text-white">{value}</span>
        </div>
    </div>
);