import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PatientState {
  // Patient store state will be implemented in subsequent tasks
  currentPatient: null;
  consultationNumber: number;
  // Actions will be added in subsequent tasks
}

const usePatientStore = create<PatientState>()(
  persist(
    () => ({
      currentPatient: null,
      consultationNumber: 1,
      // Actions will be implemented in subsequent tasks
    }),
    {
      name: 'patient-store',
    }
  )
);

export default usePatientStore;