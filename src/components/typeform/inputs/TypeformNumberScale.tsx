'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeformNumberScaleProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  showLabels?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  centerLabel?: string;
  onEnter?: () => void;
  variant?: 'buttons' | 'slider';
}

export default function TypeformNumberScale({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  disabled = false,
  error,
  className = '',
  showLabels = true,
  leftLabel = 'Not likely',
  rightLabel = 'Very likely',
  centerLabel,
  onEnter,
  variant = 'buttons',
}: TypeformNumberScaleProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const numbers: number[] = [];
  for (let i = min; i <= max; i += step) {
    numbers.push(i);
  }

  const handleNumberClick = React.useCallback((num: number) => {
    if (disabled) return;
    
    onChange(num);
    
    // Auto-advance after selection
    if (onEnter) {
      setTimeout(() => {
        onEnter();
      }, 500);
    }
  }, [disabled, onChange, onEnter]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange(Number(e.target.value));
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      const num = parseInt(e.key);
      if (num >= min && num <= max) {
        e.preventDefault();
        handleNumberClick(num);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, min, max, handleNumberClick]);

  const renderButtons = () => (
    <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
      {numbers.map((num, index) => {
        const isSelected = value === num;
        const isHovered = hoverValue === num;
        
        return (
          <motion.button
            key={num}
            type="button"
            onClick={() => handleNumberClick(num)}
            onMouseEnter={() => setHoverValue(num)}
            onMouseLeave={() => setHoverValue(null)}
            disabled={disabled}
            className={`
              w-12 h-12 rounded-full font-semibold text-lg
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${disabled 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer hover:scale-110'
              }
              ${isSelected 
                ? 'bg-blue-600 text-white shadow-lg scale-110' 
                : isHovered
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            whileHover={!disabled ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: isSelected ? 1.1 : 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            {num}
          </motion.button>
        );
      })}
    </div>
  );

  const renderSlider = () => (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="relative">
        {/* Slider Track */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value || min}
          onChange={handleSliderChange}
          disabled={disabled}
          className={`
            w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((value - min) / (max - min)) * 100}%, #e5e7eb ${((value - min) / (max - min)) * 100}%, #e5e7eb 100%)`
          }}
        />
        
        {/* Slider Thumb (custom styling) */}
        <style jsx>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
        `}</style>

        {/* Scale Numbers */}
        <div className="flex justify-between mt-2 px-1">
          {numbers.map((num) => (
            <span
              key={num}
              className={`
                text-sm transition-all duration-200
                ${value === num 
                  ? 'text-blue-600 dark:text-blue-400 font-semibold scale-110' 
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}
            >
              {num}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full max-w-3xl mx-auto text-center ${className}`}>
      {/* Scale Input */}
      {variant === 'buttons' ? renderButtons() : renderSlider()}

      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
          <motion.span
            className="text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {leftLabel}
          </motion.span>
          
          {centerLabel && (
            <motion.span
              className="text-center font-medium"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {centerLabel}
            </motion.span>
          )}
          
          <motion.span
            className="text-right"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {rightLabel}
          </motion.span>
        </div>
      )}

      {/* Current Value Display */}
      <AnimatePresence>
        {value !== undefined && value >= min && (
          <motion.div
            className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {value}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="text-red-500 text-sm mt-2"
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
        {(value === undefined || value < min) && !error && (
          <motion.div
            className="text-gray-500 dark:text-gray-400 text-sm mt-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {variant === 'buttons' 
              ? `Click a number or press ${min}-${max} to select`
              : 'Drag the slider or use arrow keys to select'
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}