'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';

interface TypeformNavigationProps {
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  className?: string;
  isLast?: boolean;
  isSubmitting?: boolean;
  showKeyboardHints?: boolean;
  backLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
}

export default function TypeformNavigation({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  className = '',
  isLast = false,
  isSubmitting = false,
  showKeyboardHints = true,
  backLabel = 'Previous',
  nextLabel = 'Next',
  submitLabel = 'Submit',
}: TypeformNavigationProps) {
  const [keyPressed, setKeyPressed] = useState<string | null>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input or any focusable element
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        (activeElement as HTMLElement).isContentEditable ||
        activeElement.getAttribute('contenteditable') === 'true' ||
        activeElement.getAttribute('role') === 'textbox' ||
        activeElement.closest('[contenteditable="true"]') ||
        activeElement.closest('input') ||
        activeElement.closest('textarea')
      )) {
        return;
      }

      if (event.key === 'Enter' && canGoNext) {
        event.preventDefault();
        setKeyPressed('enter');
        onNext();
      } else if (event.key === 'Backspace' && canGoBack) {
        event.preventDefault();
        setKeyPressed('backspace');
        onBack();
      } else if (event.key === 'ArrowRight' && canGoNext) {
        event.preventDefault();
        setKeyPressed('right');
        onNext();
      } else if (event.key === 'ArrowLeft' && canGoBack) {
        event.preventDefault();
        setKeyPressed('left');
        onBack();
      }
    };

    const handleKeyUp = () => {
      setKeyPressed(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canGoBack, canGoNext, onBack, onNext]);

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1
    },
    pressed: {
      scale: 0.95
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`flex justify-between items-center mt-8 ${className}`}
    >
      {/* Back Button */}
      <AnimatePresence>
        {canGoBack ? (
          <motion.div
            variants={buttonVariants}
            initial="hidden"
            animate={keyPressed === 'backspace' || keyPressed === 'left' ? 'pressed' : 'visible'}
            exit="hidden"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="secondary"
              onClick={onBack}
              className="btn-touch group relative"
              disabled={isSubmitting}
            >
              <motion.span
                className="flex items-center"
                animate={keyPressed === 'backspace' || keyPressed === 'left' ? { x: -2 } : { x: 0 }}
              >
                <svg 
                  className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {backLabel}
              </motion.span>
              
              {showKeyboardHints && (
                <motion.div
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                >
                  ← or Backspace
                </motion.div>
              )}
            </Button>
          </motion.div>
        ) : (
          <div className="w-24" /> // Spacer to maintain layout
        )}
      </AnimatePresence>

      {/* Next/Submit Button */}
      <motion.div
        variants={buttonVariants}
        initial="hidden"
        animate={keyPressed === 'enter' || keyPressed === 'right' ? 'pressed' : 'visible'}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
        }}
        whileHover={{ scale: canGoNext ? 1.05 : 1 }}
        whileTap={{ scale: canGoNext ? 0.95 : 1 }}
      >
        <Button
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          className="btn-touch group relative"
          variant={isLast ? 'primary' : 'primary'}
        >
          <motion.span
            className="flex items-center"
            animate={keyPressed === 'enter' || keyPressed === 'right' ? { x: 2 } : { x: 0 }}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                {isLast ? submitLabel : nextLabel}
                {!isLast && (
                  <svg 
                    className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {isLast && (
                  <svg 
                    className="w-4 h-4 ml-2" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </>
            )}
          </motion.span>

          {showKeyboardHints && !isSubmitting && (
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              Enter or →
            </motion.div>
          )}
        </Button>
      </motion.div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}