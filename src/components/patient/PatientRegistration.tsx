'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TypeformTextInput from '@/components/typeform/inputs/TypeformTextInput';
import TypeformDatePicker from '@/components/typeform/inputs/TypeformDatePicker';
import TypeformSingleSelect from '@/components/typeform/inputs/TypeformSingleSelect';
import TypeformContainer from '@/components/typeform/TypeformContainer';
import TypeformQuestion from '@/components/typeform/TypeformQuestion';
import usePatientData from '@/hooks/usePatientData';

interface PatientData {
  name: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  mobileNumber: string;
}

interface HospitalSettings {
  hospitalName?: string;
  primaryColor?: string;
}

interface PatientRegistrationProps {
  mobileNumber: string;
  onComplete: (registrationResult: any) => void;
  onBack: () => void;
  hospitalSettings: HospitalSettings;
  className?: string;
}

const genderOptions = [
  { id: 'male', label: 'Male', icon: '👨' },
  { id: 'female', label: 'Female', icon: '👩' },
  { id: 'other', label: 'Other', icon: '👤' },
];

const registrationSteps = [
  {
    id: 'name',
    title: 'What\'s your full name?',
    description: 'Please enter your first and last name as it appears on your ID',
    type: 'text',
    required: true,
    placeholder: 'John Doe',
  },
  {
    id: 'dateOfBirth',
    title: 'What\'s your date of birth?',
    description: 'This helps us provide age-appropriate care recommendations',
    type: 'date',
    required: true,
  },
  {
    id: 'gender',
    title: 'What\'s your gender?',
    description: 'This information helps us personalize your healthcare experience',
    type: 'select',
    required: true,
  },
  {
    id: 'email',
    title: 'What\'s your email address?',
    description: 'We\'ll use this to send you appointment reminders and health updates (optional)',
    type: 'text',
    required: false,
    placeholder: 'john.doe@example.com',
  },
];

export function PatientRegistration({ 
  mobileNumber, 
  onComplete, 
  onBack, 
  hospitalSettings,
  className = '' 
}: PatientRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<PatientData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { registerPatient, loading, error } = usePatientData();

  const currentStepData = registrationSteps[currentStep];
  const isLastStep = currentStep === registrationSteps.length - 1;

  const validateStep = (stepId: string, value: string | number | Date | undefined): string | null => {
    switch (stepId) {
      case 'name':
        const nameValue = String(value || '');
        if (!nameValue || nameValue.trim().length < 2) {
          return 'Please enter your full name (at least 2 characters)';
        }
        if (!/^[a-zA-Z\s'-]+$/.test(nameValue.trim())) {
          return 'Name can only contain letters, spaces, hyphens, and apostrophes';
        }
        return null;
      
      case 'dateOfBirth':
        if (!value) {
          return 'Please select your date of birth';
        }
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 0 || age > 120) {
          return 'Please enter a valid date of birth';
        }
        return null;
      
      case 'email':
        const emailValue = String(value || '');
        if (emailValue && emailValue.trim().length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailValue.trim())) {
            return 'Please enter a valid email address';
          }
        }
        return null;
      
      case 'gender':
        if (!value) {
          return 'Please select your gender';
        }
        return null;
      
      default:
        return null;
    }
  };

  const handleFieldChange = (value: unknown) => {
    const stepId = currentStepData.id;
    setFormData(prev => ({ ...prev, [stepId]: value }));
    
    // Clear error when user starts typing
    if (errors[stepId]) {
      setErrors(prev => ({ ...prev, [stepId]: '' }));
    }
  };

  const handleNext = () => {
    const stepId = currentStepData.id;
    const value = formData[stepId as keyof PatientData];
    
    // Validate current step
    const error = validateStep(stepId, value || '');
    if (error) {
      setErrors(prev => ({ ...prev, [stepId]: error }));
      return;
    }

    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate all fields
      let hasErrors = false;
      const newErrors: Record<string, string> = {};
      
      for (const step of registrationSteps) {
        if (step.required) {
          const error = validateStep(step.id, formData[step.id as keyof PatientData]);
          if (error) {
            newErrors[step.id] = error;
            hasErrors = true;
          }
        }
      }
      
      if (hasErrors) {
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }

      // Submit the registration
      const registrationData = {
        name: formData.name || '',
        dateOfBirth: formData.dateOfBirth || '',
        gender: formData.gender as 'male' | 'female' | 'other',
        mobileNumber,
        ...(formData.email && formData.email.trim() && { email: formData.email.trim() })
      };

      const result = await registerPatient(registrationData);
      
      if (result) {
        onComplete(result);
      } else {
        setErrors({ submit: error || 'Registration failed. Please try again.' });
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepInput = () => {
    const stepId = currentStepData.id;
    const value = formData[stepId as keyof PatientData];
    const error = errors[stepId];

    switch (currentStepData.type) {
      case 'text':
        return (
          <TypeformTextInput
            value={value as string || ''}
            onChange={handleFieldChange}
            placeholder={currentStepData.placeholder}
            error={error}
            onEnter={handleNext}
            autoFocus={true}
          />
        );
      
      case 'date':
        const today = new Date();
        const maxDate = today.toISOString().split('T')[0];
        const minDate = new Date(today.getFullYear() - 120, 0, 1).toISOString().split('T')[0];
        
        return (
          <TypeformDatePicker
            value={value as string || ''}
            onChange={handleFieldChange}
            error={error}
            onEnter={handleNext}
            maxDate={maxDate}
            minDate={minDate}
          />
        );
      
      case 'select':
        return (
          <TypeformSingleSelect
            value={value as string || ''}
            onChange={handleFieldChange}
            options={genderOptions}
            error={error}
            onEnter={handleNext}
            variant="cards"
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <TypeformContainer
        currentStep={currentStep + 1}
        totalSteps={registrationSteps.length}
        onNext={handleNext}
        onPrevious={handlePrevious}
        hospitalSettings={hospitalSettings}
        showProgress={true}
      >
        <TypeformQuestion
          question={{
            id: currentStepData.id,
            title: currentStepData.title,
            description: currentStepData.description,
            type: currentStepData.type,
            required: currentStepData.required,
          }}
          value={formData[currentStepData.id as keyof PatientData]}
          onChange={handleFieldChange}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isFirst={currentStep === 0}
          isLast={isLastStep}
          questionNumber={currentStep + 1}
          totalQuestions={registrationSteps.length}
          error={errors[currentStepData.id]}
          autoFocus={true}
        >
          {renderStepInput()}
        </TypeformQuestion>

        {/* Submit Error */}
        <AnimatePresence>
          {errors.submit && (
            <motion.div
              className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 dark:text-red-400">{errors.submit}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isSubmitting && (
            <motion.div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <svg className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Creating your profile...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This will only take a moment
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </TypeformContainer>
    </div>
  );
}