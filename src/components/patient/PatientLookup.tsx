'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TypeformMobileInput from '@/components/typeform/inputs/TypeformMobileInput';
import { usePatientLookup } from '@/hooks/usePatientLookup';

interface PatientInfo {
  id: string;
  name: string;
  mobileNumber: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt: string;
}

interface PatientLookupResult {
  exists: boolean;
  isNewPatient: boolean;
  consultationNumber: number;
  feedbackCompleted?: boolean;
  completedAt?: string;
  patient: PatientInfo | null;
}

interface PatientLookupProps {
  onPatientFound: (result: PatientLookupResult) => void;
  onNewPatient: (mobileNumber: string) => void;
  onFeedbackCompleted?: (result: PatientLookupResult) => void;
  className?: string;
  hospitalSettings?: {
    hospitalName?: string;
    welcomeMessage?: string;
  };
}

export default function PatientLookup({
  onPatientFound,
  onNewPatient,
  onFeedbackCompleted,
  className = '',
  hospitalSettings,
}: PatientLookupProps) {
  const [mobileNumber, setMobileNumber] = useState('');
  const { lookupPatient, isLoading, error, clearError } = usePatientLookup();

  const handleMobileSubmit = async (mobile: string) => {
    clearError();
    
    try {
      const result = await lookupPatient(mobile);
      
      if (result.isNewPatient) {
        onNewPatient(mobile);
      } else if (result.feedbackCompleted) {
        // Feedback already completed for this consultation
        if (onFeedbackCompleted) {
          onFeedbackCompleted(result);
        } else {
          // Default behavior: show completion message
          alert(`Thank you! You have already submitted feedback for consultation #${result.consultationNumber} on ${new Date(result.completedAt || '').toLocaleDateString()}.`);
        }
      } else {
        onPatientFound(result);
      }
    } catch (err) {
      // Error is handled by the hook
      console.error('Patient lookup failed:', err);
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto text-center ${className}`}>
      {/* Header */}
      <motion.div
        className="mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Hospital Name */}
        {hospitalSettings?.hospitalName && (
          <motion.div
            className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {hospitalSettings.hospitalName}
          </motion.div>
        )}

        {/* Welcome Message */}
        <motion.h1
          className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {hospitalSettings?.welcomeMessage || 'Welcome to Patient Feedback'}
        </motion.h1>

        <motion.p
          className="text-xl text-gray-600 dark:text-gray-400 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Please enter your mobile number to get started with your feedback
        </motion.p>
      </motion.div>

      {/* Mobile Number Input */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <TypeformMobileInput
          value={mobileNumber}
          onChange={setMobileNumber}
          onSubmit={handleMobileSubmit}
          isLoading={isLoading}
          error={error || undefined}
          placeholder="(555) 123-4567"
          autoFocus={true}
        />
      </motion.div>

      {/* Privacy Notice */}
      <AnimatePresence>
        {!isLoading && !error && (
          <motion.div
            className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center space-x-2 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="font-medium">Your privacy is protected</span>
            </div>
            <p>
              We use your mobile number only to track your consultation history and provide personalized feedback questions. 
              Your information is kept secure and confidential.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="flex flex-col items-center space-y-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="flex items-center space-x-3">
              <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Checking your information...
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This will only take a moment
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Hint */}
      <AnimatePresence>
        {!isLoading && !error && mobileNumber && (
          <motion.div
            className="mt-6 text-xs text-gray-400 dark:text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Press Enter to continue
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}