import { useState } from 'react';

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

interface UsePatientLookupReturn {
  lookupPatient: (mobileNumber: string) => Promise<PatientLookupResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function usePatientLookup(): UsePatientLookupReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupPatient = async (mobileNumber: string): Promise<PatientLookupResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/patient/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobileNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check patient information');
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
    lookupPatient,
    isLoading,
    error,
    clearError,
  };
}