import { useState, useEffect } from 'react';
import { hasEnvApiKey } from '../services/geminiService';

const STORAGE_KEY = 'smartcal_api_key';

// The user's Gemini key lives in sessionStorage only (cleared when the tab closes).
export const useApiKey = () => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  useEffect(() => {
    // Drop any persistent copy left by older versions
    localStorage.removeItem(STORAGE_KEY);
    const storedKey = sessionStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    } else if (!hasEnvApiKey()) {
      setShowApiKeyModal(true);
    }
  }, []);

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    sessionStorage.setItem(STORAGE_KEY, trimmed);
    setShowApiKeyModal(false);
  };

  return { apiKey, saveApiKey, showApiKeyModal, setShowApiKeyModal };
};
