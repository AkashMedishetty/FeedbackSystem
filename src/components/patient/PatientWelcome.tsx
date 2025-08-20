'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PatientInfo {
  id: string;
  name: string;
  mobileNumber: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt: string;
}

interface PatientWelcomeProps {
  patient: PatientInfo;
  consultationNumber: number;
  onContinue: () => void;
  className?: string;
  hospitalSettings?: {
    hospitalName?: string;
    welcomeMessage?: string;
    primaryColor?: string;
  };
}

const getConsultationMessage = (consultationNumber: number, patientName: string) => {
  const firstName = patientName.split(' ')[0];
  
  switch (consultationNumber) {
    case 1:
      return {
        title: `Welcome, ${firstName}!`,
        subtitle: 'Thank you for choosing us for your healthcare needs',
        message: 'This is your first visit with us. We\'d love to hear about your experience today.',
        badge: 'First Visit',
        badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      };
    case 2:
      return {
        title: `Welcome back, ${firstName}!`,
        subtitle: 'Great to see you again',
        message: 'This is your second visit. Your feedback helps us improve our services.',
        badge: 'Second Visit',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      };
    case 3:
      return {
        title: `Hello again, ${firstName}!`,
        subtitle: 'We appreciate your continued trust',
        message: 'This is your third visit. We value your ongoing relationship with us.',
        badge: 'Third Visit',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      };
    default:
      return {
        title: `Welcome back, ${firstName}!`,
        subtitle: 'Thank you for your continued trust',
        message: `This is visit #${consultationNumber}. Your loyalty means everything to us.`,
        badge: `Visit #${consultationNumber}`,
        badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      };
  }
};

const getConsultationIcon = (consultationNumber: number) => {
  if (consultationNumber === 1) {
    return (
      <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    );
  } else if (consultationNumber <= 3) {
    return (
      <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    );
  } else {
    return (
      <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    );
  }
};

export default function PatientWelcome({
  patient,
  consultationNumber,
  onContinue,
  className = '',
  hospitalSettings,
}: PatientWelcomeProps) {
  const [showContent, setShowContent] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);

  const welcomeData = getConsultationMessage(consultationNumber, patient.name);

  useEffect(() => {
    // Show content after a brief delay
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-advance after 10 seconds
    const timer = setTimeout(() => {
      onContinue();
    }, 10000);

    setAutoAdvanceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [onContinue]);

  const handleContinue = React.useCallback(() => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
    }
    onContinue();
  }, [autoAdvanceTimer, onContinue]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleContinue]);

  return (
    <div className={`question-container ${className}`}>
      <div className="text-center max-w-3xl mx-auto">
        <AnimatePresence>
          {showContent && (
            <>
              {/* Hospital Name */}
              {hospitalSettings?.hospitalName && (
                <motion.div
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {hospitalSettings.hospitalName}
                </motion.div>
              )}

              {/* Consultation Badge */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${welcomeData.badgeColor}`}>
                  {welcomeData.badge}
                </span>
              </motion.div>

              {/* Consultation Icon */}
              <motion.div
                className="flex justify-center mb-8"
                initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, duration: 0.8, type: "spring", stiffness: 200 }}
              >
                {getConsultationIcon(consultationNumber)}
              </motion.div>

              {/* Welcome Title */}
              <motion.h1
                className="text-typeform-question mb-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                {welcomeData.title}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-2xl text-gray-600 dark:text-gray-400 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                {welcomeData.subtitle}
              </motion.p>

              {/* Message */}
              <motion.p
                className="text-typeform-description mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.6 }}
              >
                {welcomeData.message}
              </motion.p>

              {/* Patient Info Card */}
              <motion.div
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8 max-w-md mx-auto"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Patient Information</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {patient.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mobile: {patient.mobileNumber ? patient.mobileNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : 'Not provided'}
                </div>
                {patient.dateOfBirth && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </div>
                )}
              </motion.div>

              {/* Continue Button */}
              <motion.button
                onClick={handleContinue}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Feedback Survey
              </motion.button>

              {/* Auto-advance Notice */}
              <motion.div
                className="mt-6 text-sm text-gray-500 dark:text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.0, duration: 0.6 }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Survey will start automatically in a few seconds</span>
                </div>
                <div className="mt-2">
                  Press Enter or Space to continue now
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}