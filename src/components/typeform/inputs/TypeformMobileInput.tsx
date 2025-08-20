'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeformMobileInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (mobileNumber: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  isLoading?: boolean;
  countryCode?: string;
  showCountryCode?: boolean;
}

export default function TypeformMobileInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Enter your mobile number',
  autoFocus = true,
  disabled = false,
  error,
  className = '',
  isLoading = false,
  countryCode = '+1',
  showCountryCode = true,
}: TypeformMobileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(false);
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

  // Format mobile number (US format)
  const formatMobileNumber = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // Validation
  useEffect(() => {
    if (!value) {
      setIsValid(false);
      setFormattedValue('');
      return;
    }

    const cleaned = value.replace(/\D/g, '');
    const formatted = formatMobileNumber(value);
    setFormattedValue(formatted);

    // Mobile number validation (10 digits for US)
    const isValidMobile = cleaned.length === 10;
    setIsValid(isValidMobile);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Allow only digits, spaces, parentheses, and hyphens
    const sanitized = newValue.replace(/[^\d\s\(\)\-]/g, '');
    
    // Limit to 10 digits
    const digitsOnly = sanitized.replace(/\D/g, '');
    if (digitsOnly.length <= 10) {
      onChange(sanitized);
    }
  };

  const handleSubmit = () => {
    if (isValid && !isLoading) {
      const cleaned = value.replace(/\D/g, '');
      onSubmit(cleaned);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleaned = pastedText.replace(/[^\d]/g, '');
    if (cleaned.length <= 10) {
      onChange(cleaned);
    }
  };

  const borderColor = error 
    ? 'border-red-500' 
    : isFocused 
      ? 'border-blue-500' 
      : value 
        ? isValid 
          ? 'border-green-500' 
          : 'border-orange-500'
        : 'border-gray-300 dark:border-gray-600';

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="relative">
        {/* Country Code Display */}
        {showCountryCode && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium text-lg">
            {countryCode}
          </div>
        )}

        {/* Mobile Input */}
        <motion.input
          ref={inputRef}
          type="tel"
          value={formattedValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`
            w-full py-6 text-2xl bg-white dark:bg-gray-800 
            border-2 rounded-xl font-medium
            ${showCountryCode ? 'pl-16 pr-16' : 'px-6'}
            ${borderColor}
            placeholder-gray-400 dark:placeholder-gray-500
            text-gray-900 dark:text-gray-100
            transition-all duration-300 ease-out
            focus:outline-none focus:ring-0 focus:shadow-xl
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isFocused ? 'transform scale-[1.02] shadow-xl' : 'shadow-lg'}
          `}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        />

        {/* Loading Spinner */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation Icon */}
        <AnimatePresence>
          {value && !error && !isLoading && (
            <motion.div
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              {isValid ? (
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phone Icon */}
        <motion.div
          className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: value || isLoading ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </motion.div>
      </div>

      {/* Submit Button */}
      <AnimatePresence>
        {isValid && !isLoading && (
          <motion.button
            type="button"
            onClick={handleSubmit}
            className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Continue
          </motion.button>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="text-red-500 text-sm mt-3 text-center"
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
        {value && !isValid && !error && !isLoading && (
          <motion.div
            className="mt-3 text-orange-500 text-sm text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Please enter a valid 10-digit mobile number
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      <AnimatePresence>
        {!value && !error && !isLoading && (
          <motion.div
            className="text-gray-500 dark:text-gray-400 text-sm mt-3 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            We&apos;ll use this to track your consultation history
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Message */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="text-blue-600 dark:text-blue-400 text-sm mt-3 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Checking your information...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}