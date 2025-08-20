'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';

interface Question {
  _id?: string;
  id?: string;
  title: string;
  type: 'text' | 'rating' | 'scale' | 'multipleChoice' | 'yesNo';
  description?: string;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  order: number;
  isActive?: boolean;
}

interface FeedbackResponse {
  questionId: string;
  value: string | number;
  type: string;
}

interface TypeformQuestionProps {
  question: Question;
  response?: FeedbackResponse;
  onChange: (questionId: string, response: Partial<FeedbackResponse>) => void;
  questionNumber: number;
  totalQuestions: number;
  autoFocus?: boolean;
}

export default function TypeformQuestion({
  question,
  response,
  onChange,
  questionNumber,
  totalQuestions,
  autoFocus = true,
}: TypeformQuestionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [localValue, setLocalValue] = useState<string | number>('');

  useEffect(() => {
    setIsVisible(true);
    if (response?.value !== undefined && response.value !== localValue) {
      setLocalValue(response.value);
    }
  }, [response?.value]);

  const handleChange = (value: string | number) => {
    setLocalValue(value);
    const questionId = question._id || question.id;
    if (questionId) {
      onChange(questionId, {
        value,
        type: question.type,
      });
    }
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

  const renderQuestionInput = () => {
    switch (question.type) {
      case 'rating':
        const maxRating = question.maxValue || 5;
        return (
          <div className="flex justify-center space-x-2">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <motion.button
                key={rating}
                type="button"
                onClick={() => handleChange(rating)}
                className={`p-3 rounded-full transition-all duration-200 ${
                  Number(localValue) >= rating
                    ? 'text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Star
                  className="w-8 h-8"
                  fill={Number(localValue) >= rating ? 'currentColor' : 'none'}
                />
              </motion.button>
            ))}
          </div>
        );

      case 'scale':
        const minValue = question.minValue || 1;
        const maxValue = question.maxValue || 10;
        return (
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              {Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i).map((value) => (
                <motion.button
                  key={value}
                  type="button"
                  onClick={() => handleChange(value)}
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                    Number(localValue) === value
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {value}
                </motion.button>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{minValue}</span>
              <span>{maxValue}</span>
            </div>
          </div>
        );

      case 'multipleChoice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <motion.button
                key={index}
                type="button"
                onClick={() => handleChange(option)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                  localValue === option
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    localValue === option
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {localValue === option && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                    )}
                  </div>
                  {option}
                </div>
              </motion.button>
            ))}
          </div>
        );

      case 'yesNo':
        return (
          <div className="flex justify-center space-x-4">
            {['Yes', 'No'].map((option) => (
              <motion.button
                key={option}
                type="button"
                onClick={() => handleChange(option)}
                className={`px-8 py-4 rounded-lg border-2 transition-all duration-200 ${
                  localValue === option
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {option}
              </motion.button>
            ))}
          </div>
        );

      case 'text':
      default:
        return (
          <div className="max-w-md mx-auto">
            <textarea
              value={localValue as string}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Type your answer here..."
              className="input-typeform w-full min-h-[120px] resize-none"
              autoFocus={autoFocus}
              rows={4}
            />
          </div>
        );
    }
  };

  return (
    <motion.div
      variants={contentVariants}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      transition={{
        duration: 0.4,
        ease: "easeOut",
        staggerChildren: 0.1,
      }}
      className="space-y-8 max-w-4xl mx-auto px-6"
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
        <div className="w-full">
          {renderQuestionInput()}
        </div>
      </motion.div>

      {/* Progress Indicator */}
      <motion.div
        variants={itemVariants}
        className="text-center text-sm text-gray-500 dark:text-gray-400"
      >
        Question {questionNumber} of {totalQuestions}
      </motion.div>
    </motion.div>
  );
}