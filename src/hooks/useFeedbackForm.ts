'use client';

import { useState, useCallback } from 'react';

export interface Question {
  _id?: string; // For database questions
  id?: string;  // For template questions
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

export interface FeedbackResponse {
  questionId: string;
  questionTitle: string;
  questionType: string;
  responseText?: string;
  responseNumber?: number;
  selectedOptions?: string[];
}

export interface FeedbackSubmissionData {
  patientId: string;
  consultationNumber: number;
  mobileNumber: string;
  responses: FeedbackResponse[];
}

export default function useFeedbackForm() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, FeedbackResponse>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(async (consultationNumber?: number, patientId?: string, department?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let url = '/api/questions';
      
      if (consultationNumber) {
        url = `/api/questions/consultation?consultationNumber=${consultationNumber}`;
        if (patientId) url += `&patientId=${patientId}`;
        if (department) url += `&department=${department}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok && data.success) {
        const questions = data.data?.questions || [];
        setQuestions(questions);
        return questions;
      } else {
        const errorMessage = data.error?.message || data.error || 'Failed to load questions';
        setError(errorMessage);
        return [];
      }
    } catch (err) {
      setError('Network error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateResponse = useCallback((questionId: string, response: Partial<FeedbackResponse>) => {
    console.log('updateResponse called with:', { questionId, response });
    setResponses(prev => {
      const newResponses = {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          ...response,
          questionId
        }
      };
      console.log('Updated responses:', newResponses);
      return newResponses;
    });
  }, []);

  const nextQuestion = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  }, [currentQuestion, questions.length]);

  const previousQuestion = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  }, [currentQuestion]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
    }
  }, [questions.length]);

  const submitFeedback = useCallback(async (patientId: string, consultationNumber: number, mobileNumber: string) => {
    if (isSubmitting) return null;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const feedbackData = {
        patientId,
        consultationNumber,
        mobileNumber,
        responses: Object.values(responses)
      };
      
      // Debug logging
      console.log('Submitting feedback data:', feedbackData);
      console.log('Responses object:', responses);
      console.log('Response values:', Object.values(responses));
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Clear form after successful submission
        setResponses({});
        setCurrentQuestion(0);
        return data.data;
      } else {
        const errorMessage = data.error?.message || data.error || 'Failed to submit feedback';
        setError(errorMessage);
        return null;
      }
    } catch (err) {
      setError('Network error occurred');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [responses]);

  const validateCurrentQuestion = useCallback(() => {
    const question = questions[currentQuestion];
    if (!question) return true;
    
    const questionId = question._id || question.id;
    if (!questionId) return false;
    
    const response = responses[questionId];
    if (!question.required) return true;
    
    if (!response) return false;
    
    switch (question.type) {
      case 'text':
        return response.responseText && response.responseText.trim().length > 0;
      case 'rating':
      case 'scale':
        return response.responseNumber !== undefined && response.responseNumber !== null;
      case 'multipleChoice':
        return response.selectedOptions && response.selectedOptions.length > 0;
      case 'yesNo':
        return response.responseText !== undefined;
      default:
        return true;
    }
  }, [questions, currentQuestion, responses]);

  const getProgress = useCallback(() => {
    if (questions.length === 0) return 0;
    return ((currentQuestion + 1) / questions.length) * 100;
  }, [currentQuestion, questions.length]);

  const reset = useCallback(() => {
    setQuestions([]);
    setResponses({});
    setCurrentQuestion(0);
    setError(null);
  }, []);

  return {
    questions,
    responses,
    currentQuestion,
    isSubmitting,
    loading,
    error,
    loadQuestions,
    updateResponse,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    submitFeedback,
    validateCurrentQuestion,
    getProgress,
    reset,
    setError,
    // Computed properties
    currentQuestionData: questions[currentQuestion] || null,
    isFirstQuestion: currentQuestion === 0,
    isLastQuestion: currentQuestion === questions.length - 1,
    totalQuestions: questions.length,
  };
}