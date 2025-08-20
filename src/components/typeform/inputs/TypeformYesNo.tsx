'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeformYesNoProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  yesLabel?: string;
  noLabel?: string;
  yesColor?: string;
  noColor?: string;
  showKeyboardHints?: boolean;
  onEnter?: () => void;
  variant?: 'buttons' | 'toggle' | 'cards';
}

export default function TypeformYesNo({
  value,
  onChange,
  disabled = false,
  error,
  className = '',
  yesLabel = 'Yes',
  noLabel = 'No',
  yesColor = 'green',
  noColor = 'red',
  showKeyboardHints = true,
  onEnter,
  variant = 'buttons',
}: TypeformYesNoProps) {
  const [hoverValue, setHoverValue] = useState<boolean | null>(null);

  const handleSelection = React.useCallback((selection: boolean) => {
    if (disabled) return;
    
    onChange(selection);
    
    // Auto-advance after selection
    if (onEnter) {
      setTimeout(() => {
        onEnter();
      }, 500);
    }
  }, [disabled, onChange, onEnter]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      if (e.key.toLowerCase() === 'y' || e.key === '1') {
        e.preventDefault();
        handleSelection(true);
      } else if (e.key.toLowerCase() === 'n' || e.key === '0' || e.key === '2') {
        e.preventDefault();
        handleSelection(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleSelection]);

  const getColorClasses = (isYes: boolean, isSelected: boolean, isHovered: boolean) => {
    const colorMap = {
      green: {
        selected: 'bg-green-600 text-white border-green-600 shadow-lg',
        hovered: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-600',
        default: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600',
      },
      red: {
        selected: 'bg-red-600 text-white border-red-600 shadow-lg',
        hovered: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600',
        default: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600',
      },
    };

    const color = isYes ? yesColor : noColor;
    const colorClasses = colorMap[color as keyof typeof colorMap] || colorMap.green;

    if (isSelected) return colorClasses.selected;
    if (isHovered) return colorClasses.hovered;
    return colorClasses.default;
  };

  const renderButtons = () => (
    <div className="flex justify-center items-center space-x-6">
      {/* Yes Button */}
      <motion.button
        type="button"
        onClick={() => handleSelection(true)}
        onMouseEnter={() => setHoverValue(true)}
        onMouseLeave={() => setHoverValue(null)}
        disabled={disabled}
        className={`
          px-12 py-6 text-2xl font-semibold rounded-xl border-2 transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-offset-2
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
          ${getColorClasses(true, value === true, hoverValue === true)}
        `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{yesLabel}</span>
        </div>
        
        {showKeyboardHints && (
          <motion.div
            className="mt-2 text-sm opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: hoverValue === true || value === true ? 1 : 0.7 }}
          >
            Press Y or 1
          </motion.div>
        )}
      </motion.button>

      {/* No Button */}
      <motion.button
        type="button"
        onClick={() => handleSelection(false)}
        onMouseEnter={() => setHoverValue(false)}
        onMouseLeave={() => setHoverValue(null)}
        disabled={disabled}
        className={`
          px-12 py-6 text-2xl font-semibold rounded-xl border-2 transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-offset-2
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
          ${getColorClasses(false, value === false, hoverValue === false)}
        `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{noLabel}</span>
        </div>
        
        {showKeyboardHints && (
          <motion.div
            className="mt-2 text-sm opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: hoverValue === false || value === false ? 1 : 0.7 }}
          >
            Press N or 2
          </motion.div>
        )}
      </motion.button>
    </div>
  );

  const renderToggle = () => (
    <div className="flex justify-center">
      <motion.button
        type="button"
        onClick={() => handleSelection(!value)}
        disabled={disabled}
        className={`
          relative w-24 h-12 rounded-full border-2 transition-all duration-300
          focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${value === true 
            ? 'bg-green-600 border-green-600' 
            : value === false
              ? 'bg-red-600 border-red-600'
              : 'bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-600'
          }
        `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Toggle Slider */}
        <motion.div
          className="absolute top-1 w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow-lg flex items-center justify-center"
          animate={{
            x: value === true ? 12 : value === false ? -12 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {value === true && (
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {value === false && (
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </motion.div>
        
        {/* Labels */}
        <div className="absolute inset-0 flex items-center justify-between px-2 text-sm font-medium text-white">
          <span className={value === true ? 'opacity-100' : 'opacity-50'}>{yesLabel}</span>
          <span className={value === false ? 'opacity-100' : 'opacity-50'}>{noLabel}</span>
        </div>
      </motion.button>
    </div>
  );

  const renderCards = () => (
    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
      {/* Yes Card */}
      <motion.button
        type="button"
        onClick={() => handleSelection(true)}
        onMouseEnter={() => setHoverValue(true)}
        onMouseLeave={() => setHoverValue(null)}
        disabled={disabled}
        className={`
          p-6 rounded-xl border-2 transition-all duration-200 text-center
          focus:outline-none focus:ring-4 focus:ring-offset-2
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
          ${getColorClasses(true, value === true, hoverValue === true)}
        `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <div className="text-xl font-semibold">{yesLabel}</div>
        {showKeyboardHints && (
          <div className="text-sm mt-2 opacity-70">Press Y</div>
        )}
      </motion.button>

      {/* No Card */}
      <motion.button
        type="button"
        onClick={() => handleSelection(false)}
        onMouseEnter={() => setHoverValue(false)}
        onMouseLeave={() => setHoverValue(null)}
        disabled={disabled}
        className={`
          p-6 rounded-xl border-2 transition-all duration-200 text-center
          focus:outline-none focus:ring-4 focus:ring-offset-2
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
          ${getColorClasses(false, value === false, hoverValue === false)}
        `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <div className="text-xl font-semibold">{noLabel}</div>
        {showKeyboardHints && (
          <div className="text-sm mt-2 opacity-70">Press N</div>
        )}
      </motion.button>
    </div>
  );

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {/* Render based on variant */}
      {variant === 'buttons' && renderButtons()}
      {variant === 'toggle' && renderToggle()}
      {variant === 'cards' && renderCards()}

      {/* Selection Display */}
      <AnimatePresence>
        {value !== null && (
          <motion.div
            className="text-center mt-6 text-lg font-medium text-gray-900 dark:text-gray-100"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            You selected: <span className={value ? 'text-green-600' : 'text-red-600'}>
              {value ? yesLabel : noLabel}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="text-red-500 text-sm text-center mt-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      <AnimatePresence>
        {value === null && !error && showKeyboardHints && (
          <motion.div
            className="text-gray-500 dark:text-gray-400 text-sm text-center mt-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Press Y for Yes or N for No
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}