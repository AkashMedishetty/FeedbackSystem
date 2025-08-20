'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface TypeformProgressBarProps {
  current: number;
  total: number;
  className?: string;
  showPercentage?: boolean;
  animated?: boolean;
  color?: string;
  backgroundColor?: string;
  height?: 'sm' | 'md' | 'lg';
}

export default function TypeformProgressBar({
  current,
  total,
  className = '',
  showPercentage = false,
  animated = true,
  color,
  backgroundColor,
  height = 'md',
}: TypeformProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const progress = Math.min(Math.max((current / total) * 100, 0), 100);
  
  // Smooth spring animation for progress
  const springProgress = useSpring(displayProgress, {
    stiffness: 100,
    damping: 30,
    mass: 1,
  });

  const progressWidth = useTransform(springProgress, [0, 100], ['0%', '100%']);

  useEffect(() => {
    if (animated) {
      // Delay the animation slightly for better UX
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const progressBarStyle = {
    backgroundColor: backgroundColor || undefined,
  };

  const progressFillStyle = {
    backgroundColor: color || undefined,
  };

  return (
    <div className={`relative ${className}`}>
      {/* Progress Bar Container */}
      <div 
        className={`progress-typeform ${heightClasses[height]} relative overflow-hidden`}
        style={progressBarStyle}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${Math.round(progress)}% complete`}
      >
        {animated ? (
          <motion.div
            className="progress-typeform-fill h-full relative"
            style={{ 
              width: progressWidth,
              ...progressFillStyle 
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </motion.div>
        ) : (
          <div
            className="progress-typeform-fill h-full"
            style={{ 
              width: `${progress}%`,
              ...progressFillStyle 
            }}
          />
        )}
      </div>

      {/* Percentage Display */}
      {showPercentage && (
        <motion.div
          className="absolute -top-8 right-0 text-sm font-medium text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {Math.round(progress)}%
        </motion.div>
      )}

      {/* Step Indicators */}
      {total <= 10 && (
        <div className="flex justify-between mt-2">
          {Array.from({ length: total }, (_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index < current
                  ? 'bg-blue-600 dark:bg-blue-400'
                  : index === current - 1
                  ? 'bg-blue-400 dark:bg-blue-300'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.2 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}