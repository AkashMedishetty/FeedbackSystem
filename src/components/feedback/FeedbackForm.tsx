'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TypeformQuestion from './TypeformQuestion';
import useFeedbackForm from '@/hooks/useFeedbackForm';

interface PatientInfo {
  id: string;
  name: string;
  mobileNumber: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt: string;
}

interface FeedbackFormProps {
  patient: PatientInfo;
  consultationNumber: number;
  onComplete: () => void;
}

export default function FeedbackForm({ patient, consultationNumber, onComplete }: FeedbackFormProps) {
  const {
    questions,
    responses,
    currentQuestion: currentQuestionIndex,
    loading: isLoading,
    isSubmitting,
    error,
    loadQuestions,
    updateResponse,
    nextQuestion,
    previousQuestion,
    submitFeedback,
    reset: resetSession
  } = useFeedbackForm();

  const currentQuestionData = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  
  // Check if user can proceed based on question requirements and response
  const canProceed = (() => {
    if (!currentQuestionData) return false;
    if (!currentQuestionData.required) return true;
    
    const questionId = currentQuestionData._id || currentQuestionData.id;
    const response = questionId ? responses[questionId] : undefined;
    if (!response) return false;
    
    switch (currentQuestionData.type) {
      case 'rating':
      case 'scale':
        return response.responseNumber !== undefined && response.responseNumber !== null;
      case 'text':
        return response.responseText && response.responseText.trim().length > 0;
      case 'multipleChoice':
        return response.selectedOptions && response.selectedOptions.length > 0;
      case 'yesNo':
        return response.responseText !== undefined;
      default:
        return true;
    }
  })();

  useEffect(() => {
    // Load questions and reset session when component mounts
    resetSession();
    loadQuestions(consultationNumber, patient.id, 'general');
  }, [resetSession, loadQuestions, consultationNumber, patient.id]);

  const handleNext = () => {
    if (canProceed && !isLastQuestion) {
      nextQuestion();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      previousQuestion();
    }
  };

  const handleSubmit = async () => {
    if (!canProceed) return;

    try {
      const result = await submitFeedback(patient.id, consultationNumber, patient.mobileNumber);
      if (result) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    const question = questions.find(q => (q._id || q.id) === questionId);
    if (!question) return;

    const responseData: any = {
      questionId,
      questionTitle: question.title,
      questionType: question.type
    };

    if (question.type === 'rating' || question.type === 'scale') {
      responseData.responseNumber = parseInt(value);
    } else if (question.type === 'multipleChoice') {
      responseData.selectedOptions = [value];
    } else {
      responseData.responseText = value;
    }

    updateResponse(questionId, responseData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">No questions available for this consultation.</p>
          <button 
            onClick={() => loadQuestions(consultationNumber, patient.id, 'general')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry Loading Questions
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading questions: {error}</p>
          <button 
            onClick={() => loadQuestions(consultationNumber, patient.id, 'general')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">No questions available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          <div className="mb-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Patient Feedback
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {patient.name} • Consultation #{consultationNumber}
              </p>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {currentQuestionIndex + 1} of {questions.length}
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-8">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <TypeformQuestion
                 question={currentQuestionData}
                 response={(() => {
                   const questionId = currentQuestionData._id || currentQuestionData.id;
                   if (!questionId || !responses[questionId]) return undefined;
                   
                   return {
                     questionId,
                     value: responses[questionId]?.responseText || 
                            responses[questionId]?.responseNumber?.toString() || 
                            (responses[questionId]?.selectedOptions && responses[questionId]?.selectedOptions[0]) || 
                            '',
                     type: currentQuestionData.type
                   };
                 })()}
                 onChange={(questionId, response) => {
                   if (response.value !== undefined) {
                     handleResponseChange(questionId, response.value.toString());
                   }
                 }}
                 questionNumber={currentQuestionIndex + 1}
                 totalQuestions={questions.length}
               />
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="flex items-center px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Previous
            </button>

            {!isLastQuestion ? (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || isSubmitting}
                className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}