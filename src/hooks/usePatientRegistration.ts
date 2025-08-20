import { useState } from 'react';

interface PatientData {
  name: string;
  mobileNumber: string;
  dateOfBirth: string;
  gender?: string;
}

interface PatientInfo {
  id: string;
  name: string;
  mobileNumber: string;
  dateOfBirth: string;
  gender?: string;
  createdAt: string;
}

interface RegistrationResult {
  success: boolean;
  patient: PatientInfo;
  consultationNumber: number;
}

interface UsePatientRegistrationReturn {
  registerPatient: (patientData: PatientData) => Promise<RegistrationResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function usePatientRegistration(): UsePatientRegistrationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerPatient = async (patientData: PatientData): Promise<RegistrationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/patient/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register patient');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    registerPatient,
    isLoading,
    error,
    clearError,
  };
}