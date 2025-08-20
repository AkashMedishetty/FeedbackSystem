'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypeformDatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  onEnter?: () => void;
  showCalendar?: boolean;
}

export default function TypeformDatePicker({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  className = '',
  minDate,
  maxDate,
  placeholder = 'Select a date',
  onEnter,
  showCalendar = true,
}: TypeformDatePickerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Validation
  useEffect(() => {
    if (!value) {
      setIsValid(!required);
      return;
    }

    const date = new Date(value);
    let valid = !isNaN(date.getTime());

    if (valid && minDate) {
      valid = date >= new Date(minDate);
    }

    if (valid && maxDate) {
      valid = date <= new Date(maxDate);
    }

    setIsValid(valid);
  }, [value, required, minDate, maxDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter && isValid && value) {
      e.preventDefault();
      onEnter();
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateSelect = (date: Date) => {
    const isoString = date.toISOString().split('T')[0];
    onChange(isoString);
    setShowPicker(false);
    
    if (onEnter) {
      setTimeout(() => {
        onEnter();
      }, 300);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < new Date(minDate)) return true;
    if (maxDate && date > new Date(maxDate)) return true;
    return false;
  };

  const isDateSelected = (date: Date) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return date.toDateString() === selectedDate.toDateString();
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
        {/* Date Input */}
        <motion.input
          type="date"
          value={value}
          onChange={handleDateChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          min={minDate}
          max={maxDate}
          className={`
            w-full px-4 py-4 text-lg bg-white dark:bg-gray-800 
            border-2 rounded-xl
            ${borderColor}
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

        {/* Custom Calendar Toggle */}
        {showCalendar && (
          <motion.button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            disabled={disabled}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </motion.button>
        )}

        {/* Validation Icon */}
        <AnimatePresence>
          {value && !error && (
            <motion.div
              className="absolute right-12 top-1/2 transform -translate-y-1/2"
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
      </div>

      {/* Custom Calendar Picker */}
      <AnimatePresence>
        {showPicker && showCalendar && (
          <motion.div
            className="absolute z-50 mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <h3 className="text-lg font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((date, index) => (
                <div key={index} className="aspect-square">
                  {date && (
                    <motion.button
                      type="button"
                      onClick={() => handleDateSelect(date)}
                      disabled={isDateDisabled(date)}
                      className={`
                        w-full h-full rounded-lg text-sm font-medium transition-all duration-200
                        ${isDateSelected(date)
                          ? 'bg-blue-600 text-white'
                          : isDateDisabled(date)
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'hover:bg-blue-100 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300'
                        }
                      `}
                      whileHover={!isDateDisabled(date) ? { scale: 1.1 } : {}}
                      whileTap={!isDateDisabled(date) ? { scale: 0.95 } : {}}
                    >
                      {date.getDate()}
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Date Display */}
      <AnimatePresence>
        {value && isValid && (
          <motion.div
            className="mt-4 text-center text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Selected: <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatDisplayDate(value)}
            </span>
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
            {minDate && new Date(value) < new Date(minDate) && `Date must be after ${new Date(minDate).toLocaleDateString()}`}
            {maxDate && new Date(value) > new Date(maxDate) && `Date must be before ${new Date(maxDate).toLocaleDateString()}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      <AnimatePresence>
        {!value && !error && (
          <motion.div
            className="text-gray-500 dark:text-gray-400 text-sm mt-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {placeholder} • Press Enter to continue
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}