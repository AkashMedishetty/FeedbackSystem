'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeformTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  rows?: number;
  maxRows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  onEnter?: () => void;
  showCharacterCount?: boolean;
  autoResize?: boolean;
}

export default function TypeformTextArea({
  value,
  onChange,
  placeholder = 'Type your answer here...',
  required = false,
  maxLength,
  minLength,
  rows = 3,
  maxRows = 8,
  autoFocus = true,
  disabled = false,
  error,
  className = '',
  onEnter,
  showCharacterCount = true,
  autoResize = true,
}: TypeformTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [currentRows, setCurrentRows] = useState(rows);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Auto-resize functionality
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      
      // Reset height to calculate new height
      textarea.style.height = 'auto';
      
      // Calculate new height based on scroll height
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const newRows = Math.min(
        Math.max(Math.ceil(textarea.scrollHeight / lineHeight), rows),
        maxRows
      );
      
      setCurrentRows(newRows);
      textarea.style.height = `${newRows * lineHeight}px`;
    }
  }, [value, autoResize, rows, maxRows]);

  // Validation
  useEffect(() => {
    if (!value) {
      setIsValid(!required);
      return;
    }

    let valid = true;

    if (minLength && value.length < minLength) {
      valid = false;
    }

    if (maxLength && value.length > maxLength) {
      valid = false;
    }

    setIsValid(valid);
  }, [value, required, minLength, maxLength]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onEnter && isValid && value.trim()) {
      e.preventDefault();
      onEnter();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Respect maxLength
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    onChange(newValue);
  };

  const borderColor = error 
    ? 'border-red-500' 
    : isFocused 
      ? 'border-blue-500' 
      : value 
        ? isValid 
          ? 'border-green-500' 
          : 'border-red-500'
        : 'border-gray-300 dark:border-gray-600';

  return (
    <div className={`w-full max-w-3xl mx-auto ${className}`}>
      <div className="relative">
        {/* Textarea Field */}
        <motion.textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={autoResize ? currentRows : rows}
          className={`
            w-full px-4 py-4 text-lg bg-white dark:bg-gray-800 
            border-2 rounded-xl resize-none
            ${borderColor}
            placeholder-gray-400 dark:placeholder-gray-500
            text-gray-900 dark:text-gray-100
            transition-all duration-300 ease-out
            focus:outline-none focus:ring-0 focus:shadow-lg
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isFocused ? 'transform scale-[1.02] shadow-xl' : 'shadow-md'}
          `}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Character Count */}
        <AnimatePresence>
          {showCharacterCount && (maxLength || value.length > 0) && (
            <motion.div
              className="absolute -bottom-8 right-0 text-sm text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {value.length}
              {maxLength && `/${maxLength}`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation Icon */}
        <AnimatePresence>
          {value && !error && (
            <motion.div
              className="absolute top-4 right-4"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              {isValid ? (
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto-resize indicator */}
        {autoResize && currentRows >= maxRows && (
          <motion.div
            className="absolute bottom-2 left-4 text-xs text-gray-400 dark:text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Scroll for more space
          </motion.div>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-2 text-red-500 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Messages */}
      <AnimatePresence>
        {value && !isValid && !error && (
          <motion.div
            className="mt-2 text-red-500 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {minLength && value.length < minLength && `Minimum ${minLength} characters required`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      <AnimatePresence>
        {isFocused && !error && (
          <motion.div
            className="mt-2 text-gray-500 dark:text-gray-400 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Press Ctrl+Enter to continue
            {maxLength && ` • ${maxLength - value.length} characters remaining`}
            {autoResize && ` • Text area will expand as you type`}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}