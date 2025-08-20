'use client';

import React from 'react';
import { IQuestion, ITemplateQuestion } from '@/types';

interface QuestionPreviewProps {
  question: IQuestion | ITemplateQuestion;
  onClose: () => void;
}

export default function QuestionPreview({ question, onClose }: QuestionPreviewProps) {
  const renderQuestionInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={question.placeholder || 'Enter your answer...'}
            className="input-typeform"
            disabled
          />
        );

      case 'rating':
        const maxRating = question.maxValue || 5;
        return (
          <div className="flex gap-2">
            {Array.from({ length: maxRating }, (_, i) => (
              <button
                key={i}
                className="text-3xl text-gray-300 hover:text-yellow-400 transition-colors"
                disabled
              >
                ⭐
              </button>
            ))}
          </div>
        );

      case 'scale':
        const minValue = question.minValue || 1;
        const maxValue = question.maxValue || 5;
        return (
          <div className="flex gap-2">
            {Array.from({ length: maxValue - minValue + 1 }, (_, i) => (
              <button
                key={i}
                className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-colors flex items-center justify-center font-medium"
                disabled
              >
                {minValue + i}
              </button>
            ))}
          </div>
        );

      case 'multipleChoice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <button
                key={index}
                className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                disabled
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full border-2 border-gray-300"></span>
                  <span>{option}</span>
                </div>
              </button>
            )) || (
              <div className="text-gray-500 italic">No options configured</div>
            )}
          </div>
        );

      case 'yesNo':
        return (
          <div className="flex gap-4">
            <button
              className="flex-1 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors font-medium"
              disabled
            >
              ✅ Yes
            </button>
            <button
              className="flex-1 p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors font-medium"
              disabled
            >
              ❌ No
            </button>
          </div>
        );

      case 'email':
        return (
          <input
            type="email"
            placeholder="Enter your email address..."
            className="input-typeform"
            disabled
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            placeholder="Enter your phone number..."
            className="input-typeform"
            disabled
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className="input-typeform"
            disabled
          />
        );

      default:
        return (
          <div className="text-gray-500 italic">
            Preview not available for this question type
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Question Preview
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-6">
          {/* Typeform-style preview */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg p-8 min-h-[400px] flex flex-col justify-center">
            <div className="max-w-2xl mx-auto w-full">
              {/* Question Number */}
              <div className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">
                Question Preview
              </div>

              {/* Question Title */}
              <h2 className="text-typeform-question text-gray-900 dark:text-white mb-4">
                {question.title}
                {question.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </h2>

              {/* Question Description */}
              {question.description && (
                <p className="text-typeform-description text-gray-600 dark:text-gray-400 mb-8">
                  {question.description}
                </p>
              )}

              {/* Question Input */}
              <div className="mb-8">
                {renderQuestionInput()}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center">
                <button className="btn-typeform btn-secondary" disabled>
                  ← Previous
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Press Enter ↵
                </div>
                <button className="btn-typeform btn-primary" disabled>
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Question Details */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Question Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="font-medium capitalize">{question.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Required:</span>
                  <span className="font-medium">{question.required ? 'Yes' : 'No'}</span>
                </div>
                {question.placeholder && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Placeholder:</span>
                    <span className="font-medium">{question.placeholder}</span>
                  </div>
                )}
                {(question.type === 'rating' || question.type === 'scale') && (
                  <>
                    {question.minValue && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Min Value:</span>
                        <span className="font-medium">{question.minValue}</span>
                      </div>
                    )}
                    {question.maxValue && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Max Value:</span>
                        <span className="font-medium">{question.maxValue}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {question.type === 'multipleChoice' && question.options && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Options ({question.options.length})
                </h4>
                <div className="space-y-2">
                  {question.options.map((option, index) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
                    >
                      {index + 1}. {option}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {question.validation && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Validation Rules
                </h4>
                <div className="space-y-2 text-sm">
                  {question.validation.minLength && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Min Length:</span>
                      <span className="font-medium">{question.validation.minLength}</span>
                    </div>
                  )}
                  {question.validation.maxLength && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Max Length:</span>
                      <span className="font-medium">{question.validation.maxLength}</span>
                    </div>
                  )}
                  {question.validation.pattern && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Pattern:</span>
                      <span className="font-medium font-mono text-xs">{question.validation.pattern}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}