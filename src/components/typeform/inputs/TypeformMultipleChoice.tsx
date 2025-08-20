'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

interface TypeformMultipleChoiceProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: ChoiceOption[];
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  maxSelections?: number;
  showKeyboardHints?: boolean;
  onEnter?: () => void;
  variant?: 'cards' | 'buttons' | 'list';
}

export default function TypeformMultipleChoice({
  value,
  onChange,
  options,
  multiple = false,
  disabled = false,
  error,
  className = '',
  maxSelections,
  showKeyboardHints = true,
  onEnter,
  variant = 'cards',
}: TypeformMultipleChoiceProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const selectedValues = React.useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : [];
  }, [value]);

  const handleOptionClick = React.useCallback((optionId: string) => {
    if (disabled) return;

    if (multiple) {
      const currentSelections = Array.isArray(value) ? value : [];
      
      if (currentSelections.includes(optionId)) {
        // Remove selection
        const newSelections = currentSelections.filter(id => id !== optionId);
        onChange(newSelections);
      } else {
        // Add selection (check max limit)
        if (maxSelections && currentSelections.length >= maxSelections) {
          return;
        }
        const newSelections = [...currentSelections, optionId];
        onChange(newSelections);
      }
    } else {
      // Single selection
      onChange(optionId);
      
      // Auto-advance for single selection
      if (onEnter) {
        setTimeout(() => {
          onEnter();
        }, 500);
      }
    }
  }, [disabled, multiple, value, maxSelections, onChange, onEnter]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      // Letter shortcuts (A, B, C, etc.)
      const keyCode = e.key.toUpperCase().charCodeAt(0);
      const optionIndex = keyCode - 65; // A=0, B=1, C=2, etc.
      
      if (optionIndex >= 0 && optionIndex < options.length) {
        e.preventDefault();
        handleOptionClick(options[optionIndex].id);
      }
      
      // Number shortcuts (1, 2, 3, etc.)
      const num = parseInt(e.key);
      if (num >= 1 && num <= options.length) {
        e.preventDefault();
        handleOptionClick(options[num - 1].id);
      }
      
      // Enter to continue (for multiple selection)
      if (e.key === 'Enter' && multiple && selectedValues.length > 0 && onEnter) {
        e.preventDefault();
        onEnter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, options, multiple, selectedValues, onEnter, handleOptionClick]);

  const renderOption = (option: ChoiceOption, index: number) => {
    const isSelected = selectedValues.includes(option.id);
    const isHovered = hoverIndex === index;
    const letter = String.fromCharCode(65 + index); // A, B, C, etc.
    const number = index + 1;

    const baseClasses = `
      relative w-full p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-[1.02]'}
    `;

    const variantClasses = {
      cards: `
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg' 
          : isHovered
            ? 'border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-800 shadow-md'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `,
      buttons: `
        ${isSelected 
          ? 'border-blue-500 bg-blue-600 text-white shadow-lg' 
          : isHovered
            ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
        }
      `,
      list: `
        ${isSelected 
          ? 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-6' 
          : 'border-l-4 border-l-transparent hover:border-l-gray-300 dark:hover:border-l-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `,
    };

    return (
      <motion.button
        key={option.id}
        type="button"
        onClick={() => handleOptionClick(option.id)}
        onMouseEnter={() => setHoverIndex(index)}
        onMouseLeave={() => setHoverIndex(null)}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses[variant]}`}
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Selection Indicator */}
            <div className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center
              ${isSelected 
                ? 'border-blue-500 bg-blue-500' 
                : 'border-gray-300 dark:border-gray-600'
              }
            `}>
              {isSelected && (
                <motion.svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </motion.svg>
              )}
            </div>

            {/* Icon */}
            {option.icon && (
              <span className="text-2xl">{option.icon}</span>
            )}

            {/* Content */}
            <div className="text-left">
              <div className="font-medium text-lg">
                {option.label}
              </div>
              {option.description && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {option.description}
                </div>
              )}
            </div>
          </div>

          {/* Keyboard Hints */}
          {showKeyboardHints && (
            <div className="flex space-x-1">
              <motion.kbd
                className={`
                  px-2 py-1 text-xs rounded border
                  ${isSelected || isHovered
                    ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }
                `}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered || isSelected ? 1 : 0.7 }}
              >
                {letter}
              </motion.kbd>
              <motion.kbd
                className={`
                  px-2 py-1 text-xs rounded border
                  ${isSelected || isHovered
                    ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }
                `}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered || isSelected ? 1 : 0.7 }}
              >
                {number}
              </motion.kbd>
            </div>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {/* Options */}
      <div className={`space-y-3 mb-6 ${variant === 'list' ? 'space-y-2' : ''}`}>
        {options.map((option, index) => renderOption(option, index))}
      </div>

      {/* Selection Summary */}
      <AnimatePresence>
        {multiple && selectedValues.length > 0 && (
          <motion.div
            className="text-center text-gray-600 dark:text-gray-400 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {selectedValues.length} of {maxSelections || options.length} selected
            {maxSelections && selectedValues.length >= maxSelections && (
              <span className="text-orange-500 ml-2">(Maximum reached)</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="text-red-500 text-sm text-center mt-2"
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
        {selectedValues.length === 0 && !error && (
          <motion.div
            className="text-gray-500 dark:text-gray-400 text-sm text-center mt-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {showKeyboardHints && 'Press A-Z or 1-9 to select • '}
            Click to {multiple ? 'select multiple options' : 'choose one option'}
            {multiple && ' • Press Enter when done'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}