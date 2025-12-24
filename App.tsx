import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalorieGauge } from './components/CalorieGauge';
import { MacroChart } from './components/MacroChart';
import { HistoryCalendar } from './components/HistoryCalendar';
import { FoodDetailModal } from './components/FoodDetailModal'; // Import new modal
import { analyzeFoodInput } from './services/geminiService';
import { exportToExcel } from './services/exportService';
import { FoodItem, Macros, DailyStats, AppStatus } from './types';

// Simple UUID generator since we can't install packages easily in this prompt context
const generateId = () => Math.random().toString(36).substr(2, 9);

// Date Helpers
const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const App: React.FC = () => {
  // --- State ---
  const [maintenanceCalories, setMaintenanceCalories] = useState<number>(2000);
  const [logs, setLogs] = useState<FoodItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Settings/Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempGoal, setTempGoal] = useState<string>('2000');
  
  // Modal Management
  const [editingLog, setEditingLog] = useState<FoodItem | null>(null);
  const [selectedFoodDetail, setSelectedFoodDetail] = useState<FoodItem | null>(null);

  // Visual Feedback State
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // --- Effects (Persistence) ---
  useEffect(() => {
    const savedGoal = localStorage.getItem('smartcal_goal');
    if (savedGoal) setMaintenanceCalories(parseInt(savedGoal, 10));

    const savedLogs = localStorage.getItem('smartcal_logs');
    if (savedLogs) {
        try {
            setLogs(JSON.parse(savedLogs));
        } catch (e) {
            console.error("Failed to parse logs", e);
        }
    }

    setTempGoal(savedGoal || '2000');
  }, []);

  useEffect(() => {
    localStorage.setItem('smartcal_goal', maintenanceCalories.toString());
  }, [maintenanceCalories]);

  useEffect(() => {
    localStorage.setItem('smartcal_logs', JSON.stringify(logs));
  }, [logs]);

  // Clear toast after a few seconds
  useEffect(() => {
      if (showSuccessToast) {
          const timer = setTimeout(() => setShowSuccessToast(false), 3000);
          return () => clearTimeout(timer);
      }
  }, [showSuccessToast]);

  // --- Date Navigation ---
  const handlePrevDay = () => {
      const prev = new Date(selectedDate);
      prev.setDate(prev.getDate() - 1);
      setSelectedDate(prev);
  };

  const handleNextDay = () => {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + 1);
      setSelectedDate(next);
  };

  const displayDate = useMemo(() => {
      const today = new Date();
      if (isSameDay(selectedDate, today)) return 'Today';
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (isSameDay(selectedDate, yesterday)) return 'Yesterday';

      return selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [selectedDate]);

  const isToday = isSameDay(selectedDate, new Date());

  // --- Computed Stats (Filtered by Date) ---
  const displayedLogs = useMemo(() => {
      return logs.filter(item => isSameDay(new Date(item.timestamp), selectedDate));
  }, [logs, selectedDate]);

  const dailyStats: DailyStats = useMemo(() => {
    return displayedLogs.reduce((acc, item) => ({
      totalCalories: acc.totalCalories + item.calories,
      totalProtein: acc.totalProtein + item.macros.protein,
      totalCarbs: acc.totalCarbs + item.macros.carbs,
      totalFat: acc.totalFat + item.macros.fat,
    }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
  }, [displayedLogs]);

  const remainingCalories = maintenanceCalories - dailyStats.totalCalories;
  const progressRatio = dailyStats.totalCalories / maintenanceCalories;

  const motivationalMessage = useMemo(() => {
    if (progressRatio >= 1) return "Daily target hit! You're crushing it.";
    if (progressRatio > 0.8) return "Almost there! Finish strong.";
    if (progressRatio > 0.5) return "You're doing well! Keep it balanced.";
    return "Off to a great start! Fuel your body.";
  }, [progressRatio]);

  // --- Handlers ---
  const handleAddFood = useCallback(async () => {
    if (!inputText.trim()) return;

    setStatus(AppStatus.ANALYZING);
    setShowSuccessToast(false);
    
    const analysis = await analyzeFoodInput(inputText);
    
    if (analysis) {
      const timestampDate = new Date(selectedDate);
      const now = new Date();
      if (isSameDay(selectedDate, now)) {
          timestampDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      } else {
          timestampDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      }

      const newId = generateId();
      const newItem: FoodItem = {
        id: newId,
        name: analysis.name,
        quantityStr: inputText,
        calories: analysis.calories,
        macros: analysis.macros,
        timestamp: timestampDate.getTime(),
        // New fields
        fiber: analysis.fiber,
        sugar: analysis.sugar,
        healthScore: analysis.healthScore,
        smartInsights: analysis.smartInsights
      };
      
      setLogs(prev => [newItem, ...prev]);
      setLastAddedId(newId);
      setStatus(AppStatus.SUCCESS);
      setShowSuccessToast(true);
      setInputText('');
      setTimeout(() => setStatus(AppStatus.IDLE), 2000);
    } else {
      setStatus(AppStatus.ERROR);
    }
  }, [inputText, selectedDate]);

  const handleDeleteLog = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening detail modal
    setLogs(prev => prev.filter(item => item.id !== id));
    if (selectedFoodDetail?.id === id) setSelectedFoodDetail(null);
  };

  const handleEditClick = (e: React.MouseEvent, item: FoodItem) => {
    e.stopPropagation(); // Prevent opening detail modal
    setEditingLog(item);
  }

  const handleUpdateSettings = () => {
    const val = parseInt(tempGoal, 10);
    if (!isNaN(val) && val > 0) {
      setMaintenanceCalories(val);
      setIsSettingsOpen(false);
    }
  };

  const handleSaveEditedLog = () => {
    if (editingLog) {
      setLogs(prev => prev.map(item => item.id === editingLog.id ? editingLog : item));
      setEditingLog(null);
    }
  };

  const updateEditingLogField = (field: keyof FoodItem | keyof Macros, value: string | number) => {
    if (!editingLog) return;
    
    if (field === 'protein' || field === 'carbs' || field === 'fat') {
       setEditingLog({
         ...editingLog,
         macros: {
           ...editingLog.macros,
           [field]: Number(value)
         }
       });
    } else {
      setEditingLog({
        ...editingLog,
        [field]: field === 'name' || field === 'quantityStr' ? value : Number(value)
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-900" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
            </div>
            <h1 className="font-bold text-lg tracking-tight">SmartCal</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
                onClick={() => setIsCalendarOpen(true)}
                className="text-slate-400 hover:text-cyan-400 transition-colors p-2 rounded-full hover:bg-slate-800"
                title="View History"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
            </button>

            <button
                onClick={() => exportToExcel(logs)}
                className="text-slate-400 hover:text-emerald-400 transition-colors p-2 rounded-full hover:bg-slate-800"
                title="Download Excel File"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-xs font-medium bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-slate-700"
            >
                Goal: {maintenanceCalories}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto pb-24 relative">
        
        {/* Date Navigator */}
        <div className="flex items-center justify-between px-4 py-4">
             <button 
                onClick={handlePrevDay}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label="Previous Day"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                 </svg>
             </button>
             
             <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsCalendarOpen(true)}>
                 <h2 className="text-white font-semibold text-lg">{displayDate}</h2>
                 {!isToday && <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Viewing History</span>}
             </div>

             <button 
                onClick={handleNextDay}
                className={`p-2 rounded-full transition-colors ${isToday ? 'opacity-30 cursor-not-allowed text-slate-600' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                disabled={isToday}
                aria-label="Next Day"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                 </svg>
             </button>
        </div>

        {/* Dashboard Card */}
        <section className="px-4 py-2">
          <div className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700/50 shadow-xl backdrop-blur-sm transition-all duration-300">
             <div className="flex flex-col items-center relative">
                 <CalorieGauge current={dailyStats.totalCalories} target={maintenanceCalories} />
             </div>

             {/* Summary & Motivation */}
             <div className="text-center mt-6 mb-6">
               <div className="flex justify-center items-center gap-2 mb-1">
                 <span className={`text-2xl font-bold ${remainingCalories < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                   {Math.abs(remainingCalories).toLocaleString()}
                 </span>
                 <span className="text-slate-400 font-medium">
                   {remainingCalories < 0 ? 'kcal over' : 'kcal left'}
                 </span>
               </div>
               <p className="text-sm text-slate-300 italic">"{motivationalMessage}"</p>
             </div>
             
             <div className="border-t border-slate-700/50 pt-6">
                 <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center mb-4">Daily Macro Split</h3>
                 <MacroChart macros={{
                     protein: dailyStats.totalProtein,
                     carbs: dailyStats.totalCarbs,
                     fat: dailyStats.totalFat
                 }} />
             </div>
          </div>
        </section>

        {/* Input Area */}
        <section className="px-4 mb-6 sticky top-[73px] z-40 mt-6">
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur ${status === AppStatus.ANALYZING ? 'animate-pulse opacity-75' : ''}`}></div>
            <div className={`relative bg-slate-900 rounded-xl p-1 flex gap-2 border border-slate-700 shadow-lg ${status === AppStatus.SUCCESS ? 'animate-success-pulse' : ''}`}>
                <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFood()}
                    placeholder={isToday ? "e.g., '2 eggs and avocado toast'" : `Add food to ${displayDate}...`}
                    className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 px-4 py-3"
                    disabled={status === AppStatus.ANALYZING}
                />
                <button 
                    onClick={handleAddFood}
                    disabled={status === AppStatus.ANALYZING || !inputText.trim()}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center min-w-[60px]
                        ${status === AppStatus.ANALYZING 
                            ? 'bg-slate-800 text-slate-400 cursor-wait' 
                            : status === AppStatus.SUCCESS
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                >
                    {status === AppStatus.ANALYZING ? (
                         <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                    ) : status === AppStatus.SUCCESS ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-slide-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
            </div>
            {status === AppStatus.ERROR && (
                <p className="text-red-400 text-xs mt-2 ml-1">Could not analyze food. Please try again.</p>
            )}
          </div>
        </section>

        {/* Food Log List */}
        <section className="px-4 space-y-4">
            <h2 className="text-slate-100 font-semibold text-lg flex items-center gap-2">
                <span>{isToday ? "Today's Log" : "Daily Log"}</span>
                <span className="bg-slate-800 text-slate-400 text-xs py-0.5 px-2 rounded-full">{displayedLogs.length}</span>
            </h2>
            
            {displayedLogs.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-500 mb-2">No food logged for this day.</p>
                    <p className="text-slate-600 text-sm">Type what you ate above to add it!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayedLogs.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => setSelectedFoodDetail(item)}
                            className={`group bg-slate-800 hover:bg-slate-800/80 cursor-pointer transition-colors p-4 rounded-2xl flex justify-between items-center border border-slate-700/50 ${item.id === lastAddedId ? 'animate-slide-in border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : ''}`}
                        >
                            <div className="flex-1">
                                <h4 className="font-medium text-slate-200 capitalize">{item.name}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{item.quantityStr}</p>
                                <div className="flex gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                                    <span className="bg-slate-900 px-1.5 py-0.5 rounded">P: {item.macros.protein}g</span>
                                    <span className="bg-slate-900 px-1.5 py-0.5 rounded">C: {item.macros.carbs}g</span>
                                    <span className="bg-slate-900 px-1.5 py-0.5 rounded">F: {item.macros.fat}g</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-4">
                                <span className="text-emerald-400 font-bold text-lg">{item.calories} <span className="text-xs font-normal text-slate-500">kcal</span></span>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={(e) => handleEditClick(e, item)}
                                        className="text-slate-600 hover:text-cyan-400 transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                                        aria-label="Edit log"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteLog(e, item.id)}
                                        className="text-slate-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                                        aria-label="Delete log"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>

        {/* Success Toast Notification */}
        {showSuccessToast && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[60] animate-fade-in-up">
                <div className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-full font-bold shadow-2xl flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Food Added Successfully!</span>
                </div>
            </div>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
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
                        onClick={() => setIsSettingsOpen(false)}
                        className="flex-1 px-4 py-2 rounded-lg text-slate-400 font-medium hover:bg-slate-800 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleUpdateSettings}
                        className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-colors"
                      >
                          Save
                      </button>
                  </div>
              </div>
          </div>
      )}

       {/* Calendar Modal */}
       {isCalendarOpen && (
           <HistoryCalendar 
                logs={logs}
                onSelectDate={setSelectedDate}
                onClose={() => setIsCalendarOpen(false)}
                dailyGoal={maintenanceCalories}
                currentSelectedDate={selectedDate}
           />
       )}

       {/* Food Detail Modal */}
       {selectedFoodDetail && (
           <FoodDetailModal 
              item={selectedFoodDetail} 
              onClose={() => setSelectedFoodDetail(null)} 
           />
       )}

      {/* Edit Log Modal */}
      {editingLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                  <h3 className="text-xl font-bold mb-1">Edit Food Details</h3>
                  <p className="text-slate-400 text-sm mb-6">Update nutrition information manually.</p>
                  
                  <div className="space-y-4 mb-8">
                      <div>
                          <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Food Name</label>
                          <input 
                            type="text" 
                            value={editingLog.name}
                            onChange={(e) => updateEditingLogField('name', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Calories</label>
                            <input 
                              type="number" 
                              value={editingLog.calories}
                              onChange={(e) => updateEditingLogField('calories', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Protein (g)</label>
                             <input 
                               type="number" 
                               value={editingLog.macros.protein}
                               onChange={(e) => updateEditingLogField('protein', e.target.value)}
                               className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                             />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Carbs (g)</label>
                            <input 
                              type="number" 
                              value={editingLog.macros.carbs}
                              onChange={(e) => updateEditingLogField('carbs', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Fat (g)</label>
                             <input 
                               type="number" 
                               value={editingLog.macros.fat}
                               onChange={(e) => updateEditingLogField('fat', e.target.value)}
                               className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                             />
                        </div>
                      </div>
                  </div>
                  
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setEditingLog(null)}
                        className="flex-1 px-4 py-2 rounded-lg text-slate-400 font-medium hover:bg-slate-800 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleSaveEditedLog}
                        className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-colors"
                      >
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;