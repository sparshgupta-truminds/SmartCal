import React, { useState } from 'react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, onClose }) => {
  const [tempApiKey, setTempApiKey] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8v0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Enter Gemini API Key</h3>
                <p className="text-slate-400 text-sm">
                    To analyze your food, this app needs a Gemini API Key from Google AI Studio.
                </p>
            </div>

            <div className="mb-6">
                <label className="block text-xs font-medium text-slate-500 uppercase mb-2">API Key</label>
                <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <div className="mt-2 text-center">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:text-emerald-400 underline">
                        Get a free key here
                    </a>
                </div>
            </div>

            <button
                onClick={() => onSave(tempApiKey)}
                disabled={!tempApiKey.trim()}
                className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold transition-colors"
            >
                Save Key
            </button>
            <button
                onClick={onClose}
                className="w-full mt-3 px-4 py-2 text-sm text-slate-500 hover:text-slate-400"
            >
                Cancel
            </button>
        </div>
    </div>
  );
};
