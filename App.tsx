import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CalorieGauge } from './components/CalorieGauge';
import { MacroChart } from './components/MacroChart';
import { MacroProgress } from './components/MacroProgress';
import { TrendsModal } from './components/TrendsModal';
import { HistoryCalendar } from './components/HistoryCalendar';
import { FoodDetailModal } from './components/FoodDetailModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SettingsModal } from './components/SettingsModal';
import { FavoritesModal } from './components/FavoritesModal';
import { EditFoodModal, NEW_ENTRY_ID, NEW_FAVORITE_ID, REVIEW_ENTRY_ID } from './components/EditFoodModal';
import { analyzeFoodInput, analyzeFoodImage, FoodAnalysis, PRIMARY_MODEL } from './services/geminiService';
import { imageFileToBase64 } from './utils/image';
import { useApiKey } from './hooks/useApiKey';
import { useFoodLog, generateId } from './hooks/useFoodLog';
import { useLocalStorage } from './hooks/useLocalStorage';
import { isSameDay, timestampForDay } from './utils/date';
import { defaultMacroGoals } from './utils/macros';
import { MEAL_TYPES, mealForTime } from './utils/meals';
import { downloadBackup, parseBackup, restoreBackup } from './utils/backup';
import { FoodItem, Macros, AppStatus } from './types';

const blankItem = (id: string, insight: string): FoodItem => ({
  id,
  name: '',
  quantityStr: '1 serving',
  calories: 0,
  macros: { protein: 0, carbs: 0, fat: 0 },
  timestamp: Date.now(),
  healthScore: 5,
  smartInsights: [insight],
  mealType: mealForTime(new Date()),
});

const App: React.FC = () => {
  // --- State ---
  const [maintenanceCalories, setMaintenanceCalories] = useLocalStorage<number>('smartcal_goal', 2000);
  // null = derive from the calorie goal
  const [customMacroGoals, setCustomMacroGoals] = useLocalStorage<Macros | null>('smartcal_macro_goals', null);
  const macroGoals = customMacroGoals ?? defaultMacroGoals(maintenanceCalories);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { favorites, displayedLogs, logs, dailyStats, addLog, updateLog, deleteLog, addFavorite, deleteFavorite } = useFoodLog(selectedDate);
  const { apiKey: userApiKey, saveApiKey, showApiKeyModal, setShowApiKeyModal } = useApiKey();

  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Settings/Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isTrendsOpen, setIsTrendsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Modal Management
  const [editingLog, setEditingLog] = useState<FoodItem | null>(null);
  const [selectedFoodDetail, setSelectedFoodDetail] = useState<FoodItem | null>(null);
  const [isModalAnalyzing, setIsModalAnalyzing] = useState(false);
  const [autoFillError, setAutoFillError] = useState('');

  // Visual Feedback State
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Day's log grouped by meal; entries without a meal type are placed by time of day
  const mealGroups = useMemo(() => MEAL_TYPES.map(({ value, label }) => {
      const items = displayedLogs
          .filter(item => (item.mealType ?? mealForTime(new Date(item.timestamp))) === value)
          .sort((a, b) => a.timestamp - b.timestamp);
      return { value, label, items, calories: items.reduce((sum, i) => sum + i.calories, 0) };
  }).filter(g => g.items.length > 0), [displayedLogs]);

  const remainingCalories = maintenanceCalories - dailyStats.totalCalories;
  const progressRatio = dailyStats.totalCalories / maintenanceCalories;

  const motivationalMessage = useMemo(() => {
    if (progressRatio >= 1) return "Daily target hit! You're crushing it.";
    if (progressRatio > 0.8) return "Almost there! Finish strong.";
    if (progressRatio > 0.5) return "You're doing well! Keep it balanced.";
    return "Off to a great start! Fuel your body.";
  }, [progressRatio]);

  // --- Handlers ---
  const logNewItem = (item: FoodItem) => {
    addLog(item);
    setLastAddedId(item.id);
    setShowSuccessToast(true);
  };

  // Shared path for text and photo analysis: run the analysis, then log the result
  const analyzeAndLog = useCallback(async (analyze: () => Promise<FoodAnalysis>, quantityStr: string) => {
    setStatus(AppStatus.ANALYZING);
    setErrorMessage('');
    setShowSuccessToast(false);

    try {
      const analysis = await analyze();

      if (analysis.name === "Unknown Item") {
         setErrorMessage("Could not identify this food. Please try a different description or photo.");
         setStatus(AppStatus.ERROR);
         return;
      }

      // Let the user confirm or adjust the estimate before it's logged
      setEditingLog({
        id: REVIEW_ENTRY_ID,
        name: analysis.name,
        quantityStr,
        calories: analysis.calories,
        macros: analysis.macros,
        timestamp: timestampForDay(selectedDate),
        fiber: analysis.fiber,
        sugar: analysis.sugar,
        healthScore: analysis.healthScore,
        smartInsights: analysis.smartInsights,
        aiModel: analysis.model,
        mealType: mealForTime(new Date())
      });
      setStatus(AppStatus.IDLE);
      setInputText('');

    } catch (error: any) {
      console.error("Analysis failed", error);
      setErrorMessage(error.message || "Could not analyze food. Please check your API key.");
      setStatus(AppStatus.ERROR);
    }
  }, [selectedDate]);

  const handleAddFood = useCallback(() => {
    if (!inputText.trim()) return;
    analyzeAndLog(() => analyzeFoodInput(inputText, userApiKey), inputText);
  }, [inputText, userApiKey, analyzeAndLog]);

  // Any text in the input box is sent along as context for the photo (e.g. "large portion")
  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    const note = inputText.trim();
    analyzeAndLog(async () => {
      const { data, mimeType } = await imageFileToBase64(file);
      return analyzeFoodImage(data, mimeType, note, userApiKey);
    }, note || 'From photo');
  };

  const handleManualAddClick = () => setEditingLog(blankItem(NEW_ENTRY_ID, "Manually added item"));

  const handleCreateFavoriteClick = () => setEditingLog(blankItem(NEW_FAVORITE_ID, "Quick add item"));

  const handleQuickLog = (fav: FoodItem) => {
    logNewItem({ ...fav, id: generateId(), timestamp: timestampForDay(selectedDate), mealType: mealForTime(new Date()) });
    setIsFavoritesOpen(false); // Close modal on selection
  };

  const handleDeleteLog = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteLog(id);
    if (selectedFoodDetail?.id === id) setSelectedFoodDetail(null);
  };

  const handleEditClick = (e: React.MouseEvent, item: FoodItem) => {
    e.stopPropagation();
    setEditingLog(item);
  }

  const handleAutoFill = async () => {
    if (!editingLog || !editingLog.name) return;
    setIsModalAnalyzing(true);
    setAutoFillError('');
    try {
        const analysis = await analyzeFoodInput(editingLog.name, userApiKey);
        if (analysis.name !== "Unknown Item") {
            setEditingLog(prev => prev ? ({
                ...prev,
                name: analysis.name,
                calories: analysis.calories,
                macros: analysis.macros,
                smartInsights: analysis.smartInsights,
                healthScore: analysis.healthScore,
                sugar: analysis.sugar,
                fiber: analysis.fiber,
                aiModel: analysis.model
            }) : null);
        } else {
             setAutoFillError("Could not identify food. Please try a clearer description.");
        }
    } catch(e: any) {
        setAutoFillError(e.message || "Analysis failed. Check connection/API key.");
    } finally {
        setIsModalAnalyzing(false);
    }
  };

  const handleSaveEditedLog = () => {
    if (!editingLog) return;

    if (editingLog.id === NEW_ENTRY_ID || editingLog.id === REVIEW_ENTRY_ID) {
      logNewItem({
        ...editingLog,
        id: generateId(),
        timestamp: timestampForDay(selectedDate),
        name: editingLog.name || 'Custom Food',
      });
    } else if (editingLog.id === NEW_FAVORITE_ID) {
      addFavorite({ ...editingLog, id: generateId(), name: editingLog.name || 'Custom Favorite' });
    } else {
      updateLog(editingLog);
    }

    setEditingLog(null);
    setAutoFillError('');
  };

  const handleBackupSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { data, logCount } = parseBackup(await file.text());
      if (!window.confirm(`Replace all current data with this backup (${logCount} entries)? This can't be undone.`)) return;
      restoreBackup(data);
      // Reload so every piece of state is re-read from storage
      window.location.reload();
    } catch (err: any) {
      window.alert(err.message || 'Could not read the backup file.');
    }
  };

  const renderLogItem = (item: FoodItem) => (
    <div 
        key={item.id} 
        onClick={() => setSelectedFoodDetail(item)}
        className={`group bg-slate-800 hover:bg-slate-800/80 cursor-pointer transition-colors p-4 rounded-2xl flex justify-between items-center border border-slate-700/50 ${item.id === lastAddedId ? 'animate-slide-in border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : ''}`}
    >
        <div className="flex-1">
            <h4 className="font-medium text-slate-200 capitalize">{item.name}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{item.quantityStr}</p>
            {item.aiModel && item.aiModel !== PRIMARY_MODEL && (
                <p className="text-[10px] text-amber-400/80 mt-0.5" title={`Estimated with ${item.aiModel}`}>Estimated with backup model</p>
            )}
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
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                </button>
                <button 
                    onClick={(e) => handleDeleteLog(e, item.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center relative">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-900" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
            </div>
            <h1 className="font-bold text-lg tracking-tight">SmartCal</h1>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-xs font-medium bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-slate-700"
            >
                Goal: {maintenanceCalories}
            </button>
            
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {isMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-50 animate-fade-in-up">
                        <button 
                            onClick={() => { setIsCalendarOpen(true); setIsMenuOpen(false); }}
                            className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                             </svg>
                             History Calendar
                        </button>
                        <button 
                            onClick={() => { setIsFavoritesOpen(true); setIsMenuOpen(false); }}
                            className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Favorites / Quick Add
                        </button>
                        <button 
                            onClick={() => { setIsTrendsOpen(true); setIsMenuOpen(false); }}
                            className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Trends
                        </button>
                        <div className="h-px bg-slate-700 my-1 mx-3"></div>
                        <button 
                            onClick={() => { downloadBackup(); setIsMenuOpen(false); }}
                            className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export Backup
                        </button>
                        <button 
                            onClick={() => { backupInputRef.current?.click(); setIsMenuOpen(false); }}
                            className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Restore Backup
                        </button>
                        <div className="h-px bg-slate-700 my-1 mx-3"></div>
                        <button 
                            onClick={() => { setShowApiKeyModal(true); setIsMenuOpen(false); }}
                            className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${userApiKey ? 'text-emerald-400' : 'text-slate-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 000-2z" clipRule="evenodd" />
                            </svg>
                            API Key Settings
                        </button>
                    </div>
                )}
            </div>
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
             
             <div className="border-t border-slate-700/50 pt-6 pb-4">
                 <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider text-center mb-4">Daily Macro Split</h3>
                 <MacroChart macros={{
                     protein: dailyStats.totalProtein,
                     carbs: dailyStats.totalCarbs,
                     fat: dailyStats.totalFat
                 }} />
                 <MacroProgress
                     current={{ protein: dailyStats.totalProtein, carbs: dailyStats.totalCarbs, fat: dailyStats.totalFat }}
                     goals={macroGoals}
                 />
             </div>
          </div>
        </section>

        {/* Input Area */}
        <section className="px-4 mb-6 sticky top-[73px] z-40 mt-6">
          <div className="flex gap-2">
            <div className="relative group flex-1">
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur ${status === AppStatus.ANALYZING ? 'animate-pulse opacity-75' : ''}`}></div>
                <div className={`relative bg-slate-900 rounded-xl p-1 flex gap-2 border border-slate-700 shadow-lg ${status === AppStatus.SUCCESS ? 'animate-success-pulse' : ''}`}>
                    <input 
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFood()}
                        placeholder={isToday ? "e.g., '2 eggs and toast'" : `Add food to ${displayDate}...`}
                        className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 px-4 py-3 min-w-0"
                        disabled={status === AppStatus.ANALYZING}
                    />
                    <button 
                        onClick={handleAddFood}
                        disabled={status === AppStatus.ANALYZING || !inputText.trim()}
                        className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-center min-w-[50px]
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
            </div>
            
            {/* Photo Button */}
            <button
                onClick={() => photoInputRef.current?.click()}
                disabled={status === AppStatus.ANALYZING}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl px-3 flex items-center justify-center transition-all shadow-lg disabled:opacity-50 disabled:cursor-wait"
                title="Log from Photo"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
            <input
                ref={backupInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleBackupSelected}
                className="hidden"
            />
            <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelected}
                className="hidden"
            />

            {/* Manual Entry Button */}
            <button
                onClick={handleManualAddClick}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl px-3 flex items-center justify-center transition-all shadow-lg"
                title="Add Manually"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
          </div>
          
          {status === AppStatus.ERROR && (
                <p className="text-red-400 text-xs mt-2 ml-1 animate-fade-in-up">
                  {errorMessage || "Could not analyze food. Please try again."}
                </p>
          )}
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
                <div className="space-y-5">
                    {mealGroups.map(group => (
                        <div key={group.value}>
                            <div className="flex justify-between items-baseline mb-2 px-1">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{group.label}</h3>
                                <span className="text-xs text-slate-500">{group.calories} kcal</span>
                            </div>
                            <div className="space-y-3">
                                {group.items.map(renderLogItem)}
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
                    <span>{lastAddedId === 'NEW' ? 'Food Logged Successfully!' : 'Food Added Successfully!'}</span>
                </div>
            </div>
        )}
      </main>

      {showApiKeyModal && (
          <ApiKeyModal onSave={saveApiKey} onClose={() => setShowApiKeyModal(false)} />
      )}

      {isSettingsOpen && (
          <SettingsModal
              goal={maintenanceCalories}
              macroGoals={customMacroGoals}
              onSave={(goal, macros) => { setMaintenanceCalories(goal); setCustomMacroGoals(macros); setIsSettingsOpen(false); }}
              onClose={() => setIsSettingsOpen(false)}
          />
      )}

       {isCalendarOpen && (
           <HistoryCalendar
                logs={logs}
                onSelectDate={setSelectedDate}
                onClose={() => setIsCalendarOpen(false)}
                dailyGoal={maintenanceCalories}
                currentSelectedDate={selectedDate}
           />
       )}

      {isFavoritesOpen && (
          <FavoritesModal
              favorites={favorites}
              onQuickLog={handleQuickLog}
              onDelete={deleteFavorite}
              onCreate={handleCreateFavoriteClick}
              onClose={() => setIsFavoritesOpen(false)}
          />
      )}

      {isTrendsOpen && (
          <TrendsModal logs={logs} dailyGoal={maintenanceCalories} onClose={() => setIsTrendsOpen(false)} />
      )}

       {selectedFoodDetail && (
           <FoodDetailModal
              item={selectedFoodDetail}
              onClose={() => setSelectedFoodDetail(null)}
           />
       )}

      {editingLog && (
          <EditFoodModal
              item={editingLog}
              onChange={setEditingLog}
              onAutoFill={handleAutoFill}
              isAnalyzing={isModalAnalyzing}
              error={autoFillError}
              onSave={handleSaveEditedLog}
              onClose={() => { setEditingLog(null); setAutoFillError(''); }}
          />
      )}
    </div>
  );
};

export default App;
