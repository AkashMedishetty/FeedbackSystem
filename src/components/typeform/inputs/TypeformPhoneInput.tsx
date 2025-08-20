'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeformPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  onEnter?: () => void;
  countryCode?: string;
  format?: 'international' | 'national' | 'none';
}

export default function TypeformPhoneInput({
  value,
  onChange,
  placeholder = 'Enter your phone number',
  required = false,
  autoFocus = true,
  disabled = false,
  error,
  className = '',
  onEnter,
  countryCode = '+1',
  format = 'national',
}: TypeformPhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [formattedValue, setFormattedValue] = useState('');

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Format phone number
  const formatPhoneNumber = React.useCallback((phoneNumber: string, formatType: string) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (formatType === 'none') {
      return cleaned;
    }
    
    if (formatType === 'international') {
      if (cleaned.length === 0) return '';
      if (cleaned.length <= 3) return `${countryCode} ${cleaned}`;
      if (cleaned.length <= 6) return `${countryCode} ${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      if (cleaned.length <= 10) return `${countryCode} ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
      return `${countryCode} ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
    }
    
    // National format (US style)
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }, [countryCode]);

  // Validation
  useEffect(() => {
    if (!value) {
      setIsValid(!required);
      setFormattedValue('');
      return;
    }

    const cleaned = value.replace(/\D/g, '');
    const formatted = formatPhoneNumber(value, format);
    setFormattedValue(formatted);

    // Basic phone number validation (10 digits for US)
    const isValidPhone = cleaned.length >= 10 && cleaned.length <= 15;
    setIsValid(isValidPhone);
  }, [value, format, countryCode, formatPhoneNumber, required]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter && isValid && value.trim()) {
      e.preventDefault();
      onEnter();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Allow only digits, spaces, parentheses, hyphens, and plus signs
    const sanitized = newValue.replace(/[^\d\s\(\)\-\+]/g, '');
    
    onChange(sanitized);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleaned = pastedText.replace(/[^\d]/g, '');
    onChange(cleaned);
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
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="relative">
        {/* Country Code Display (for international format) */}
        {format === 'international' && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium">
            {countryCode}
          </div>
        )}

        {/* Phone Input */}
        <motion.input
          ref={inputRef}
          type="tel"
          value={format === 'none' ? value : formattedValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-4 text-lg bg-white dark:bg-gray-800 
            border-2 rounded-xl
            ${format === 'international' ? 'pl-16' : ''}
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

        {/* Validation Icon */}
        <AnimatePresence>
          {value && !error && (
            <motion.div
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
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

        {/* Phone Icon */}
        <motion.div
          className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: value ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </motion.div>
      </div>

      {/* Format Examples */}
      <AnimatePresence>
        {isFocused && !value && !error && (
          <motion.div
            className="mt-2 text-gray-500 dark:text-gray-400 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {format === 'international' && `Example: ${countryCode} 555 123 4567`}
            {format === 'national' && 'Example: (555) 123-4567'}
            {format === 'none' && 'Example: 5551234567'}
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

      {/* Validation Messages */}
      <AnimatePresence>
        {value && !isValid && !error && (
          <motion.div
            className="mt-2 text-red-500 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Please enter a valid phone number
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      <AnimatePresence>
        {isFocused && value && isValid && !error && (
          <motion.div
            className="mt-2 text-gray-500 dark:text-gray-400 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Press Enter to continue
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}