'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeformRatingProps {
  value: number;
  onChange: (value: number) => void;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  emptyColor?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  showLabels?: boolean;
  labels?: string[];
  allowHalf?: boolean;
  onEnter?: () => void;
}

export default function TypeformRating({
  value,
  onChange,
  maxRating = 5,
  size = 'lg',
  color = '#fbbf24', // yellow-400
  emptyColor = '#d1d5db', // gray-300
  disabled = false,
  error,
  className = '',
  showLabels = true,
  labels,
  allowHalf = false,
  onEnter,
}: TypeformRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const defaultLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  const ratingLabels = labels || defaultLabels.slice(0, maxRating);

  const handleStarClick = React.useCallback((rating: number) => {
    if (disabled) return;
    
    onChange(rating);
    
    // Auto-advance after selection
    if (onEnter) {
      setTimeout(() => {
        onEnter();
      }, 500);
    }
  }, [disabled, onChange, onEnter]);

  const handleStarHover = (rating: number) => {
    if (disabled) return;
    setHoverValue(rating);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverValue(0);
  };

  const getStarFill = (starIndex: number) => {
    const currentValue = isHovering ? hoverValue : value;
    
    if (allowHalf) {
      if (starIndex <= Math.floor(currentValue)) {
        return 1; // Full star
      } else if (starIndex === Math.ceil(currentValue) && currentValue % 1 !== 0) {
        return 0.5; // Half star
      }
      return 0; // Empty star
    } else {
      return starIndex <= currentValue ? 1 : 0;
    }
  };

  const renderStar = (index: number) => {
    const starIndex = index + 1;
    const fill = getStarFill(starIndex);
    const isActive = (isHovering ? hoverValue : value) >= starIndex;

    return (
      <motion.button
        key={index}
        type="button"
        onClick={() => handleStarClick(starIndex)}
        onMouseEnter={() => handleStarHover(starIndex)}
        disabled={disabled}
        className={`
          ${sizeClasses[size]} 
          relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
          rounded-full transition-transform duration-200
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
        `}
        whileHover={!disabled ? { scale: 1.1 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
      >
        {/* Star SVG */}
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          style={{ filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none' }}
        >
          <defs>
            <linearGradient id={`star-gradient-${index}`}>
              <stop offset={`${fill * 100}%`} stopColor={color} />
              <stop offset={`${fill * 100}%`} stopColor={emptyColor} />
            </linearGradient>
          </defs>
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={`url(#star-gradient-${index})`}
            stroke={isActive ? color : emptyColor}
            strokeWidth="1"
          />
        </svg>

        {/* Keyboard shortcut number */}
        <motion.div
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 dark:text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovering || value === starIndex ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {starIndex}
        </motion.div>
      </motion.button>
    );
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      const num = parseInt(e.key);
      if (num >= 1 && num <= maxRating) {
        e.preventDefault();
        handleStarClick(num);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, maxRating, handleStarClick]);

  return (
    <div className={`w-full max-w-2xl mx-auto text-center ${className}`}>
      {/* Rating Stars */}
      <div 
        className="flex justify-center items-center space-x-2 mb-6"
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
      </div>

      {/* Rating Labels */}
      {showLabels && (
        <AnimatePresence>
          <motion.div
            className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {ratingLabels.map((label, index) => (
              <motion.span
                key={index}
                className={`
                  transition-all duration-200 
                  ${(isHovering ? hoverValue : value) === index + 1 
                    ? 'text-gray-900 dark:text-gray-100 font-medium scale-110' 
                    : ''
                  }
                `}
                whileHover={{ scale: 1.05 }}
              >
                {label}
              </motion.span>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Current Rating Display */}
      <AnimatePresence>
        {value > 0 && (
          <motion.div
            className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {value} out of {maxRating} stars
            {showLabels && ratingLabels[value - 1] && (
              <span className="text-gray-600 dark:text-gray-400 ml-2">
                ({ratingLabels[value - 1]})
              </span>
            )}
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
        {!value && !error && (
          <motion.div
            className="text-gray-500 dark:text-gray-400 text-sm mt-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Click a star or press 1-{maxRating} to rate
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}