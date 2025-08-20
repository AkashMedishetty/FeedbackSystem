'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PatientLookup from '@/components/patient/PatientLookup';
import { PatientRegistration } from '@/components/patient/PatientRegistration';
import PatientWelcome from '@/components/patient/PatientWelcome';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import ThankYou from '@/components/feedback/ThankYou';

interface PatientInfo {
  id: string;
  name: string;
  mobileNumber: string;
  dateOfBirth?: string;
  email?: string;
  gender?: string;
  createdAt: string;
}

interface PatientData {
  name: string;
  dateOfBirth: string;
  email: string;
  gender: string;
  mobileNumber: string;
}

interface PatientLookupResult {
  exists: boolean;
  isNewPatient: boolean;
  consultationNumber: number;
  patient: PatientInfo | null;
  completedAt?: string;
}

type Step = 'lookup' | 'registration' | 'welcome' | 'feedback' | 'thankyou' | 'already_completed';

export default function KioskPage() {
  const [currentStep, setCurrentStep] = useState<Step>('lookup');
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [consultationNumber, setConsultationNumber] = useState<number>(1);
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [completedAt, setCompletedAt] = useState<string>('');

  const handlePatientFound = (result: PatientLookupResult) => {
    setPatient(result.patient);
    setConsultationNumber(result.consultationNumber);
    setCurrentStep('welcome');
  };

  const handleNewPatient = (mobile: string) => {
    setMobileNumber(mobile);
    setCurrentStep('registration');
  };

  const handleFeedbackCompleted = (result: PatientLookupResult) => {
    setPatient(result.patient);
    setConsultationNumber(result.consultationNumber);
    setMobileNumber(result.patient?.mobileNumber || '');
    setCompletedAt(result.completedAt || '');
    setCurrentStep('already_completed');
  };

  const handleRegistrationComplete = (registrationResult: any) => {
    // Use the actual patient data returned from the registration API
    if (registrationResult && registrationResult.patient) {
      const patientInfo: PatientInfo = {
        id: registrationResult.patient._id || registrationResult.patient.id,
        name: registrationResult.patient.name,
        mobileNumber: registrationResult.patient.mobileNumber,
        dateOfBirth: registrationResult.patient.dateOfBirth,
        email: registrationResult.patient.email,
        gender: registrationResult.patient.gender,
        createdAt: registrationResult.patient.createdAt || new Date().toISOString()
      };
      setPatient(patientInfo);
      setConsultationNumber(registrationResult.consultationNumber || 1);
      setCurrentStep('welcome');
    }
  };

  const handleWelcomeContinue = () => {
    setCurrentStep('feedback');
  };

  const handleFeedbackComplete = () => {
    setCurrentStep('thankyou');
  };

  const handleStartOver = () => {
    setCurrentStep('lookup');
    setPatient(null);
    setConsultationNumber(1);
    setMobileNumber('');
    setCompletedAt('');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'lookup':
        return (
          <PatientLookup
            onPatientFound={handlePatientFound}
            onNewPatient={handleNewPatient}
            onFeedbackCompleted={handleFeedbackCompleted}
            hospitalSettings={{
              hospitalName: 'PurpleHat Medical Center',
              welcomeMessage: 'Welcome! Please enter your mobile number to begin the feedback process.'
            }}
          />
        );
      
      case 'registration':
        return (
          <PatientRegistration
            mobileNumber={mobileNumber}
            onComplete={handleRegistrationComplete}
            onBack={() => setCurrentStep('lookup')}
            hospitalSettings={{
              hospitalName: 'PurpleHat Medical Center'
            }}
          />
        );
      
      case 'welcome':
        return patient ? (
          <PatientWelcome
            patient={patient}
            consultationNumber={consultationNumber}
            onContinue={handleWelcomeContinue}
          />
        ) : null;
      
      case 'feedback':
        return patient ? (
          <FeedbackForm
            patient={patient}
            consultationNumber={consultationNumber}
            onComplete={handleFeedbackComplete}
          />
        ) : null;
      
      case 'thankyou':
        return (
          <ThankYou
            patientName={patient?.name || 'Patient'}
            onStartOver={handleStartOver}
          />
        );
      
      case 'already_completed':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Feedback Already Submitted</h2>
                <p className="text-gray-600 mb-4">
                  Thank you, {patient?.name}! You have already submitted feedback for consultation #{consultationNumber}.
                </p>
                {completedAt && (
                  <p className="text-sm text-gray-500 mb-6">
                    Submitted on: {new Date(completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleStartOver}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start New Session
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="question-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}