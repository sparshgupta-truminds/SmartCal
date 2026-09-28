import { useState, useEffect } from 'react';

// useState that is initialised from, and persisted to, localStorage as JSON.
export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? (JSON.parse(saved) as T) : initialValue;
    } catch (e) {
      console.error(`Failed to parse ${key}`, e);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save ${key}`, e);
    }
  }, [key, value]);

  return [value, setValue] as const;
};
