'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeformTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  type?: 'text' | 'email' | 'tel' | 'url';
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  onEnter?: () => void;
  showCharacterCount?: boolean;
}

export default function TypeformTextInput({
  value,
  onChange,
  placeholder = 'Type your answer here...',
  required = false,
  maxLength,
  minLength,
  pattern,
  type = 'text',
  autoFocus = true,
  disabled = false,
  error,
  className = '',
  onEnter,
  showCharacterCount = false,
}: TypeformTextInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

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

    if (pattern) {
      const regex = new RegExp(pattern);
      valid = regex.test(value);
    }

    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      valid = emailRegex.test(value);
    }

    if (type === 'tel') {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      valid = phoneRegex.test(value.replace(/\s/g, ''));
    }

    if (type === 'url') {
      try {
        new URL(value);
        valid = true;
      } catch {
        valid = false;
      }
    }

    setIsValid(valid);
  }, [value, required, minLength, maxLength, pattern, type]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter && isValid && value.trim()) {
      e.preventDefault();
      onEnter();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Respect maxLength
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    onChange(newValue);
  };

  const getInputType = () => {
    switch (type) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      default:
        return 'text';
    }
  };

  const borderColor = error 
    ? 'border-red-400' 
    : isFocused 
      ? 'border-indigo-500' 
      : value 
        ? isValid 
          ? 'border-emerald-400' 
          : 'border-red-400'
        : 'border-gray-200 dark:border-gray-700';

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      <div className="relative">
        {/* Input Field */}
        <motion.input
          ref={inputRef}
          type={getInputType()}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 text-lg rounded-xl border-2 transition-all duration-300
            bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-gray-700
            hover:bg-white dark:hover:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed
            ${borderColor}
            ${isFocused ? 'transform scale-105' : ''}
          `}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Animated Border */}
        <motion.div
          className={`absolute bottom-0 left-0 h-0.5 bg-blue-500`}
          initial={{ width: 0 }}
          animate={{ width: isFocused ? '100%' : '0%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />

        {/* Character Count */}
        <AnimatePresence>
          {showCharacterCount && (maxLength || value.length > 0) && (
            <motion.div
              className="absolute -bottom-8 right-0 text-sm text-gray-400 dark:text-gray-500"
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
              className="absolute right-0 top-1/2 transform -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              {isValid ? (
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-2 text-red-400 text-sm"
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
            className="mt-2 text-red-400 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {type === 'email' && 'Please enter a valid email address'}
            {type === 'tel' && 'Please enter a valid phone number'}
            {type === 'url' && 'Please enter a valid URL'}
            {minLength && value.length < minLength && `Minimum ${minLength} characters required`}
            {pattern && 'Please match the required format'}
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
            transition={{ duration: 0.2 }}
          >
            Press Enter to continue
            {maxLength && ` • ${maxLength - value.length} characters remaining`}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}