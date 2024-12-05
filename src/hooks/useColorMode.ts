'use client';

import { useState, useEffect } from 'react';
import { useMediaQuery } from '@mui/material';

export function useColorMode() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  // Initialize on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('colorMode') as 'light' | 'dark' | null;
    if (savedMode) {
      setMode(savedMode);
    } else {
      const initialMode = prefersDarkMode ? 'dark' : 'light';
      setMode(initialMode);
      localStorage.setItem('colorMode', initialMode);
    }
  }, [prefersDarkMode]);

  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('colorMode', newMode);
    // Dispatch a custom event to ensure immediate update
    window.dispatchEvent(new CustomEvent('color-mode-change', { detail: newMode }));
  };

  // Listen for changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'colorMode') {
        const newMode = e.newValue as 'light' | 'dark';
        if (newMode && newMode !== mode) {
          setMode(newMode);
        }
      }
    };

    const handleCustomChange = (e: CustomEvent<'light' | 'dark'>) => {
      if (e.detail !== mode) {
        setMode(e.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('color-mode-change', handleCustomChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('color-mode-change', handleCustomChange as EventListener);
    };
  }, [mode]);

  return { mode, toggleColorMode };
} 