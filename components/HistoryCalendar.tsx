import React, { useState, useMemo } from 'react';
import { FoodItem } from '../types';

interface HistoryCalendarProps {
    logs: FoodItem[];
    onSelectDate: (date: Date) => void;
    onClose: () => void;
    dailyGoal: number;
    currentSelectedDate: Date;
}

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({ logs, onSelectDate, onClose, dailyGoal, currentSelectedDate }) => {
    const [viewDate, setViewDate] = useState(new Date(currentSelectedDate));

    // Get basic month info
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

    const monthName = viewDate.toLocaleString('default', { month: 'long' });

    // Calculate status for each day in the month
    const dayStatuses = useMemo(() => {
        const statuses: Record<number, { calories: number, status: 'none' | 'good' | 'over' }> = {};
        
        // Filter logs for this month/year
        const relevantLogs = logs.filter(log => {
            const d = new Date(log.timestamp);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        // Aggregate calories per day
        relevantLogs.forEach(log => {
            const day = new Date(log.timestamp).getDate();
            if (!statuses[day]) {
                statuses[day] = { calories: 0, status: 'none' };
            }
            statuses[day].calories += log.calories;
        });

        // Determine status
        Object.keys(statuses).forEach(dayKey => {
            const day = parseInt(dayKey);
            const data = statuses[day];
            if (data.calories === 0) {
                data.status = 'none';
            } else if (data.calories <= dailyGoal) {
                data.status = 'good';
            } else {
                data.status = 'over';
            }
        });

        return statuses;
    }, [logs, year, month, dailyGoal]);

    const handlePrevMonth = () => {
        setViewDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(year, month + 1, 1));
    };

    const handleDayClick = (day: number) => {
        const newDate = new Date(year, month, day);
        onSelectDate(newDate);
        onClose();
    };

    // Render Grid
    const renderCalendarGrid = () => {
        const slots = [];
        const totalSlots = 42; // 6 rows * 7 cols

        // Empty slots for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            slots.push(<div key={`empty-${i}`} className="h-10"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = 
                currentSelectedDate.getDate() === day &&
                currentSelectedDate.getMonth() === month &&
                currentSelectedDate.getFullYear() === year;
            
            const isToday = 
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

            const dayData = dayStatuses[day];
            let dotColor = 'bg-transparent';
            
            if (dayData) {
                if (dayData.status === 'good') dotColor = 'bg-emerald-500';
                if (dayData.status === 'over') dotColor = 'bg-red-500';
            }

            slots.push(
                <button 
                    key={`day-${day}`}
                    onClick={() => handleDayClick(day)}
                    className={`h-10 w-10 rounded-full flex flex-col items-center justify-center relative transition-colors
                        ${isSelected ? 'bg-slate-700 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'}
                        ${isToday && !isSelected ? 'border border-slate-600' : ''}
                    `}
                >
                    <span className="text-sm z-10">{day}</span>
                    {dayData && (
                        <div className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                    )}
                </button>
            );
        }

        return slots;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <h3 className="text-lg font-bold text-white">{monthName} {year}</h3>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Day Names */}
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-xs font-bold text-slate-500">{d}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 place-items-center">
                    {renderCalendarGrid()}
                </div>

                {/* Legend */}
                <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span>Under Goal</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>Over Goal</span>
                    </div>
                </div>

                <div className="mt-6">
                    <button 
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};