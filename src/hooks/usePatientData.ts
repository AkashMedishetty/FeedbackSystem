'use client';

import { useState, useCallback } from 'react';

export interface Patient {
  _id: string;
  mobileNumber: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientRegistrationData {
  mobileNumber: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  email?: string;
}

export default function usePatientData() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPatient = useCallback(async (mobileNumber: string) => {
    setLoading(true);
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
      
      if (response.ok) {
        return data;
      } else {
        const errorMessage = data.error?.message || data.error || 'Failed to check patient';
        setError(errorMessage);
        return null;
      }
    } catch (err) {
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerPatient = useCallback(async (patientData: PatientRegistrationData) => {
    setLoading(true);
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
      
      if (response.ok && data.success) {
        setPatient(data.patient);
        return data;
      } else {
        const errorMessage = data.error?.message || data.error || 'Failed to register patient';
        setError(errorMessage);
        return null;
      }
    } catch (err) {
      setError('Network error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPatientHistory = useCallback(async (mobileNumber: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/patient/${mobileNumber}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        return data.data?.history || [];
      } else {
        const errorMessage = data.error?.message || data.error || 'Failed to get patient history';
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

  const clearPatient = useCallback(() => {
    setPatient(null);
    setError(null);
  }, []);

  return {
    patient,
    loading,
    error,
    checkPatient,
    registerPatient,
    getPatientHistory,
    clearPatient,
    setError,
  };
}