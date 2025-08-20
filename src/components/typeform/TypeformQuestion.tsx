'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TypeformNavigation from './TypeformNavigation';

interface TypeformQuestionProps {
  question: {
    id: string;
    title: string;
    description?: string;
    type: string;
    required?: boolean;
    placeholder?: string;
  };
  value: unknown;
  onChange: (value: unknown) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
  questionNumber: number;
  totalQuestions: number;
  theme?: 'light' | 'dark' | 'high-contrast';
  direction?: 'forward' | 'backward';
  children?: React.ReactNode;
  error?: string;
  isValid?: boolean;
  autoFocus?: boolean;
}

export default function TypeformQuestion({
  question,
  value,
  onChange,
  onNext,
  onPrevious,
  isFirst,
  isLast,
  questionNumber,
  direction = 'forward',
  children,
  error,
  isValid = true,
  autoFocus = true,
}: TypeformQuestionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setHasValue(value !== undefined && value !== null && value !== '');
  }, [value]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key === 'Enter' && hasValue && isValid) {
        event.preventDefault();
        onNext();
      } else if (event.key === 'Backspace' && !isFirst) {
        event.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasValue, isValid, isFirst, onNext, onPrevious]);

  const slideVariants = {
    enter: (direction: string) => ({
      x: direction === 'forward' ? 1000 : -1000,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: string) => ({
      zIndex: 0,
      x: direction === 'forward' ? -1000 : 1000,
      opacity: 0,
      scale: 0.95,
    }),
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0
    },
  };

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={question.id}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 },
        }}
        className="w-full h-full flex flex-col justify-center"
      >
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
          transition={{
            duration: 0.4,
            ease: "easeOut",
            staggerChildren: 0.1,
          }}
          className="space-y-8 max-w-3xl mx-auto px-6"
        >
          {/* Question Header */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            {/* Question Number */}
            <motion.div
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-medium"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {questionNumber}
            </motion.div>

            {/* Question Title */}
            <h1 className="text-typeform-question leading-tight">
              {question.title}
              {question.required && (
                <span className="text-red-500 ml-1" aria-label="required">*</span>
              )}
            </h1>

            {/* Question Description */}
            {question.description && (
              <p className="text-typeform-description max-w-2xl mx-auto">
                {question.description}
              </p>
            )}
          </motion.div>

          {/* Question Input Area */}
          <motion.div variants={itemVariants} className="space-y-6">
            {children ? (
              <div className="w-full">
                {children}
              </div>
            ) : (
              <div className="card-typeform p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Question component for type &quot;{question.type}&quot; will be implemented in subsequent tasks.
                </p>
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder={question.placeholder || "Type your answer here..."}
                    className="input-typeform text-center"
                    value={value as string || ''}
                    onChange={(e) => onChange(e.target.value)}
                    autoFocus={autoFocus}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-red-500 text-center text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Navigation */}
          <motion.div variants={itemVariants}>
            <TypeformNavigation
              canGoBack={!isFirst}
              canGoNext={hasValue && isValid}
              onBack={onPrevious}
              onNext={onNext}
              isLast={isLast}
              className="justify-center"
            />
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            variants={itemVariants}
            className="text-center text-sm text-gray-500 dark:text-gray-400"
          >
            Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd> to continue
            {!isFirst && (
              <>
                {' or '}
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Backspace</kbd> to go back
              </>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}