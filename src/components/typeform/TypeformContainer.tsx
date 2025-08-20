'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TypeformProgressBar from './TypeformProgressBar';
import useThemeStore from '@/stores/themeStore';

interface TypeformContainerProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  theme?: 'light' | 'dark' | 'high-contrast';
  showProgress?: boolean;
  className?: string;
  hospitalSettings?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    welcomeMessage?: string;
    hospitalName?: string;
  };
}

export default function TypeformContainer({
  children,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  theme,
  showProgress = true,
  className = '',
  hospitalSettings,
}: TypeformContainerProps) {
  const { theme: globalTheme, setTheme } = useThemeStore();
  const [isVisible, setIsVisible] = useState(true);
  
  // Use provided theme or global theme
  const activeTheme = theme || globalTheme;
  
  // Type-safe theme variants
  type ThemeVariant = 'light' | 'dark' | 'high-contrast';

  // Apply theme to document
  useEffect(() => {
    if (theme && theme !== globalTheme) {
      setTheme(theme);
    }
  }, [theme, globalTheme, setTheme]);

  // Apply custom hospital colors if provided
  useEffect(() => {
    if (hospitalSettings?.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', hospitalSettings.primaryColor);
    }
    if (hospitalSettings?.secondaryColor) {
      document.documentElement.style.setProperty('--secondary-color', hospitalSettings.secondaryColor);
    }
    if (hospitalSettings?.accentColor) {
      document.documentElement.style.setProperty('--accent-color', hospitalSettings.accentColor);
    }
  }, [hospitalSettings]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        onNext();
      } else if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
        event.preventDefault();
        onPrevious();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious]);

  const containerVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      y: -20
    }
  };

  const backgroundVariants: Record<ThemeVariant, string> = {
    light: 'bg-gradient-to-br from-white to-gray-50',
    dark: 'bg-gradient-to-br from-gray-900 to-gray-800',
    'high-contrast': 'bg-black text-white'
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className={`kiosk-container min-h-screen flex items-center justify-center p-4 ${activeTheme === 'dark' ? 'dark' : ''} ${backgroundVariants[activeTheme]} ${className} transition-colors duration-300`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{
            duration: 0.4,
            ease: "easeOut"
          }}
          key="typeform-container"
        >
          {/* Progress Bar */}
          {showProgress && totalSteps > 1 && (
            <motion.div
              className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700"
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {hospitalSettings?.hospitalName || 'Patient Feedback'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-500">
                    {currentStep} of {totalSteps}
                  </span>
                </div>
                <TypeformProgressBar 
                  current={currentStep} 
                  total={totalSteps}
                  className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"
                />
              </div>
            </motion.div>
          )}

          {/* Main Content Area */}
          <div className={`question-container ${showProgress && totalSteps > 1 ? 'pt-24' : ''}`}>
            <motion.div
              className="w-full max-w-2xl mx-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {children}
            </motion.div>
          </div>

          {/* Accessibility Announcements */}
          <div 
            className="sr-only" 
            aria-live="polite" 
            aria-atomic="true"
          >
            Step {currentStep} of {totalSteps}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}