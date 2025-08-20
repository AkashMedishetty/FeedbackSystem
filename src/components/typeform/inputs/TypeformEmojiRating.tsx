'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiOption {
  emoji: string;
  label: string;
  value: number;
}

interface TypeformEmojiRatingProps {
  value: number;
  onChange: (value: number) => void;
  emojis?: EmojiOption[];
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  error?: string;
  className?: string;
  showLabels?: boolean;
  onEnter?: () => void;
  variant?: 'satisfaction' | 'mood' | 'custom';
}

export default function TypeformEmojiRating({
  value,
  onChange,
  emojis,
  size = 'lg',
  disabled = false,
  error,
  className = '',
  showLabels = true,
  onEnter,
  variant = 'satisfaction',
}: TypeformEmojiRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const defaultEmojis = {
    satisfaction: [
      { emoji: '😞', label: 'Very Dissatisfied', value: 1 },
      { emoji: '😕', label: 'Dissatisfied', value: 2 },
      { emoji: '😐', label: 'Neutral', value: 3 },
      { emoji: '😊', label: 'Satisfied', value: 4 },
      { emoji: '😍', label: 'Very Satisfied', value: 5 },
    ],
    mood: [
      { emoji: '😢', label: 'Sad', value: 1 },
      { emoji: '😟', label: 'Worried', value: 2 },
      { emoji: '😐', label: 'Okay', value: 3 },
      { emoji: '😊', label: 'Happy', value: 4 },
      { emoji: '🤩', label: 'Excited', value: 5 },
    ],
    custom: emojis || [],
  };

  const emojiOptions = emojis || defaultEmojis[variant];

  const sizeClasses = {
    sm: 'text-4xl w-12 h-12',
    md: 'text-6xl w-16 h-16',
    lg: 'text-8xl w-20 h-20',
  };

  const handleEmojiClick = React.useCallback((emojiValue: number) => {
    if (disabled) return;
    
    onChange(emojiValue);
    
    // Auto-advance after selection
    if (onEnter) {
      setTimeout(() => {
        onEnter();
      }, 800);
    }
  }, [disabled, onChange, onEnter]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      const num = parseInt(e.key);
      if (num >= 1 && num <= emojiOptions.length) {
        e.preventDefault();
        const emoji = emojiOptions[num - 1];
        if (emoji) {
          handleEmojiClick(emoji.value);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, emojiOptions, handleEmojiClick]);

  const selectedEmoji = emojiOptions.find(emoji => emoji.value === value);
  const hoveredEmoji = hoverValue ? emojiOptions.find(emoji => emoji.value === hoverValue) : null;

  return (
    <div className={`w-full max-w-4xl mx-auto text-center ${className}`}>
      {/* Emoji Options */}
      <div className="flex justify-center items-center space-x-4 mb-8">
        {emojiOptions.map((emoji, index) => {
          const isSelected = value === emoji.value;
          const isHovered = hoverValue === emoji.value;
          
          return (
            <motion.button
              key={emoji.value}
              type="button"
              onClick={() => handleEmojiClick(emoji.value)}
              onMouseEnter={() => setHoverValue(emoji.value)}
              onMouseLeave={() => setHoverValue(null)}
              disabled={disabled}
              className={`
                ${sizeClasses[size]}
                flex items-center justify-center rounded-full
                transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2
                ${disabled 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'cursor-pointer hover:scale-125 active:scale-95'
                }
                ${isSelected 
                  ? 'scale-125 bg-blue-100 dark:bg-blue-900 shadow-lg' 
                  : isHovered
                    ? 'scale-110 bg-gray-100 dark:bg-gray-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }
              `}
              whileHover={!disabled ? { 
                scale: 1.25,
                rotate: [0, -5, 5, 0],
                transition: { duration: 0.3 }
              } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ 
                opacity: 1, 
                scale: isSelected ? 1.25 : 1,
                rotate: 0
              }}
              transition={{ 
                delay: index * 0.1, 
                duration: 0.5,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
            >
              <span className="select-none">
                {emoji.emoji}
              </span>
              
              {/* Keyboard shortcut number */}
              <motion.div
                className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered || isSelected ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {index + 1}
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Emoji Label */}
      <AnimatePresence mode="wait">
        {(selectedEmoji || hoveredEmoji) && showLabels && (
          <motion.div
            key={(hoveredEmoji || selectedEmoji)?.value}
            className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            {(hoveredEmoji || selectedEmoji)?.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Labels Row */}
      {showLabels && (
        <div className="flex justify-center items-center space-x-4 mb-6">
          {emojiOptions.map((emoji, index) => {
            const isActive = value === emoji.value || hoverValue === emoji.value;
            
            return (
              <motion.div
                key={emoji.value}
                className={`
                  text-sm transition-all duration-200 text-center
                  ${sizeClasses[size].includes('w-12') ? 'w-12' : 
                    sizeClasses[size].includes('w-16') ? 'w-16' : 'w-20'}
                  ${isActive 
                    ? 'text-gray-900 dark:text-gray-100 font-semibold scale-105' 
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                {emoji.label}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Current Selection Display */}
      <AnimatePresence>
        {selectedEmoji && (
          <motion.div
            className="flex items-center justify-center space-x-3 text-lg font-medium text-gray-900 dark:text-gray-100 mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <span className="text-2xl">{selectedEmoji.emoji}</span>
            <span>You selected: {selectedEmoji.label}</span>
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
        {!selectedEmoji && !error && (
          <motion.div
            className="text-gray-500 dark:text-gray-400 text-sm mt-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Click an emoji or press 1-{emojiOptions.length} to select
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}