'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeformEmailInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  onEnter?: () => void;
  showSuggestions?: boolean;
  allowedDomains?: string[];
}

export default function TypeformEmailInput({
  value,
  onChange,
  placeholder = 'Enter your email address',
  required = false,
  autoFocus = true,
  disabled = false,
  error,
  className = '',
  onEnter,
  showSuggestions = true,
  allowedDomains,
}: TypeformEmailInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);

  const commonDomains = React.useMemo(() => [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
    'protonmail.com',
  ], []);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const generateSuggestions = useCallback((email: string) => {
    if (!email.includes('@')) return;
    
    const [localPart, domainPart] = email.split('@');
    if (!domainPart) return;

    const newSuggestions: string[] = [];
    const domainsToCheck = allowedDomains && allowedDomains.length > 0 ? allowedDomains : commonDomains;
    
    if (domainPart.length > 0) {
      for (const domain of domainsToCheck) {
        if (domain.startsWith(domainPart.toLowerCase())) {
          newSuggestions.push(`${localPart}@${domain}`);
        }
      }
    }

    setSuggestions(newSuggestions.slice(0, 3)); // Limit to 3 suggestions
    setShowSuggestionsList(newSuggestions.length > 0);
  }, [allowedDomains, commonDomains]);

  // Email validation
  useEffect(() => {
    if (!value) {
      setIsValid(!required);
      setSuggestions([]);
      setShowSuggestionsList(false);
      return;
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(value);
    
    // Check allowed domains if specified
    let isDomainAllowed = true;
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = value.split('@')[1];
      isDomainAllowed = allowedDomains.includes(domain);
    }

    setIsValid(isValidEmail && isDomainAllowed);

    // Generate suggestions
    if (showSuggestions && value.includes('@') && !isValidEmail) {
      generateSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestionsList(false);
    }
  }, [value, required, allowedDomains, showSuggestions, generateSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter && isValid && value.trim()) {
      e.preventDefault();
      onEnter();
    }
    
    // Hide suggestions on Escape
    if (e.key === 'Escape') {
      setShowSuggestionsList(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().trim();
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestionsList(false);
    inputRef.current?.focus();
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
        {/* Email Input */}
        <motion.input
          ref={inputRef}
          type="email"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay hiding suggestions to allow clicking
            setTimeout(() => setIsFocused(false), 200);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-4 text-lg bg-white dark:bg-gray-800 
            border-2 rounded-xl
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

        {/* Email Icon */}
        <motion.div
          className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: value ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
        </motion.div>
      </div>

      {/* Email Suggestions */}
      <AnimatePresence>
        {showSuggestionsList && suggestions.length > 0 && (isFocused || showSuggestionsList) && (
          <motion.div
            className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 font-medium">
                Did you mean?
              </div>
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
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
            {allowedDomains && !allowedDomains.includes(value.split('@')[1]) 
              ? `Please use an email from: ${allowedDomains.join(', ')}`
              : 'Please enter a valid email address'
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      <AnimatePresence>
        {isFocused && !value && !error && (
          <motion.div
            className="mt-2 text-gray-500 dark:text-gray-400 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Example: john@example.com • Press Enter to continue
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}