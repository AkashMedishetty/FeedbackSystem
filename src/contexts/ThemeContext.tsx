'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'patient-feedback-theme',
}) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey) as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
    setMounted(true);
  }, [storageKey]);

  // Update actual theme based on theme setting and system preference
  useEffect(() => {
    if (!mounted) return;

    const updateActualTheme = () => {
      let newActualTheme: 'light' | 'dark';
      
      if (theme === 'system') {
        newActualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        newActualTheme = theme;
      }
      
      setActualTheme(newActualTheme);
      
      // Update document class
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(newActualTheme);
      
      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content',
          newActualTheme === 'dark' ? '#1f2937' : '#ffffff'
        );
      }
    };

    updateActualTheme();

    // Listen for system theme changes when using 'system' theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateActualTheme();
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(storageKey, newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    );
  }

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to get theme-aware colors
export const useThemeColors = () => {
  const { actualTheme } = useTheme();
  
  return {
    background: actualTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    surface: actualTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    card: actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
    text: {
      primary: actualTheme === 'dark' ? 'text-white' : 'text-gray-900',
      secondary: actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
      muted: actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500',
    },
    border: actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    input: {
      background: actualTheme === 'dark' ? 'bg-gray-700' : 'bg-white',
      border: actualTheme === 'dark' ? 'border-gray-600' : 'border-gray-300',
      text: actualTheme === 'dark' ? 'text-white' : 'text-gray-900',
      placeholder: actualTheme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-500',
    },
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: actualTheme === 'dark' 
        ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' 
        : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
      ghost: actualTheme === 'dark'
        ? 'hover:bg-gray-800 text-gray-300'
        : 'hover:bg-gray-100 text-gray-600',
    },
  };
};

// Utility function to get CSS custom properties for dynamic theming
export const getThemeVariables = (actualTheme: 'light' | 'dark') => {
  const lightTheme = {
    '--color-background': '255 255 255',
    '--color-foreground': '15 23 42',
    '--color-card': '255 255 255',
    '--color-card-foreground': '15 23 42',
    '--color-popover': '255 255 255',
    '--color-popover-foreground': '15 23 42',
    '--color-primary': '59 130 246',
    '--color-primary-foreground': '248 250 252',
    '--color-secondary': '241 245 249',
    '--color-secondary-foreground': '15 23 42',
    '--color-muted': '241 245 249',
    '--color-muted-foreground': '100 116 139',
    '--color-accent': '241 245 249',
    '--color-accent-foreground': '15 23 42',
    '--color-destructive': '239 68 68',
    '--color-destructive-foreground': '248 250 252',
    '--color-border': '226 232 240',
    '--color-input': '226 232 240',
    '--color-ring': '59 130 246',
  };

  const darkTheme = {
    '--color-background': '15 23 42',
    '--color-foreground': '248 250 252',
    '--color-card': '15 23 42',
    '--color-card-foreground': '248 250 252',
    '--color-popover': '15 23 42',
    '--color-popover-foreground': '248 250 252',
    '--color-primary': '59 130 246',
    '--color-primary-foreground': '15 23 42',
    '--color-secondary': '30 41 59',
    '--color-secondary-foreground': '248 250 252',
    '--color-muted': '30 41 59',
    '--color-muted-foreground': '148 163 184',
    '--color-accent': '30 41 59',
    '--color-accent-foreground': '248 250 252',
    '--color-destructive': '239 68 68',
    '--color-destructive-foreground': '248 250 252',
    '--color-border': '30 41 59',
    '--color-input': '30 41 59',
    '--color-ring': '59 130 246',
  };

  return actualTheme === 'dark' ? darkTheme : lightTheme;
};