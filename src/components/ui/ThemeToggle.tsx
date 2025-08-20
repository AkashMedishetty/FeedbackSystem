'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'dropdown';
  showLabel?: boolean;
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'default', 
  showLabel = false,
  className = ''
}) => {
  const { theme, actualTheme, setTheme } = useTheme();

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  const currentTheme = themes.find(t => t.value === theme);
  const CurrentIcon = currentTheme?.icon || Sun;

  if (variant === 'compact') {
    return (
      <button
        onClick={() => {
          const currentIndex = themes.findIndex(t => t.value === theme);
          const nextIndex = (currentIndex + 1) % themes.length;
          setTheme(themes[nextIndex].value);
        }}
        className={`
          relative p-2 rounded-lg transition-all duration-200
          bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-300
          ${className}
        `}
        title={`Current theme: ${currentTheme?.label} (click to cycle)`}
      >
        <motion.div
          key={theme}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <CurrentIcon className="w-4 h-4" />
        </motion.div>
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="
            appearance-none bg-transparent border border-gray-300 dark:border-gray-600
            rounded-lg px-3 py-2 pr-8 text-sm
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            cursor-pointer
          "
        >
          {themes.map((themeOption) => (
            <option key={themeOption.value} value={themeOption.value}>
              {themeOption.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <CurrentIcon className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    );
  }

  // Default variant - button group
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-3">
          Theme:
        </span>
      )}
      
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isActive = theme === themeOption.value;
          
          return (
            <button
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={`
                relative flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium
                transition-all duration-200 min-w-[80px]
                ${
                  isActive
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
              title={`Switch to ${themeOption.label.toLowerCase()} theme`}
            >
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    layoutId="theme-indicator"
                    className="absolute inset-0 bg-white dark:bg-gray-700 rounded-md shadow-sm"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </AnimatePresence>
              
              <div className="relative flex items-center space-x-2">
                <Icon className="w-4 h-4" />
                <span>{themeOption.label}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Current theme indicator */}
      <div className="flex items-center space-x-2 ml-3 text-xs text-gray-500 dark:text-gray-400">
        <div className={`w-2 h-2 rounded-full ${
          actualTheme === 'dark' ? 'bg-gray-800' : 'bg-yellow-400'
        }`} />
        <span>Active: {actualTheme}</span>
      </div>
    </div>
  );
};

export default ThemeToggle;