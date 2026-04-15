'use client';

import React from 'react';
import { useThemeValue } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const context = useThemeValue();
  const theme = context?.theme || 'dark';
  const toggleTheme = context?.toggleTheme || (() => {});

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center p-2 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <Moon size={16} className="text-emerald-600" />
      ) : (
        <Sun size={16} className="text-amber-400" />
      )}
    </button>
  );
}
