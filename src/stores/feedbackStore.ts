import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FeedbackSubmission, IFeedbackResponse } from '@/types';
import { offlineSyncManager } from '@/lib/sync/offlineSyncManager';

interface FeedbackState {
  // Current session state
  responses: Record<string, IFeedbackResponse>;
  currentQuestionIndex: number;
  patientId: string | null;
  mobileNumber: string | null;
  consultationNumber: number | null;
  isSubmitting: boolean;
  submitError: string | null;
  
  // Offline state
  isOfflineMode: boolean;
  pendingOfflineId: string | null;

  // Actions
  setResponse: (questionId: string, response: IFeedbackResponse) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setPatientInfo: (patientId: string, mobileNumber: string, consultationNumber: number) => void;
  submitFeedback: () => Promise<void>;
  resetSession: () => void;
  setOfflineMode: (isOffline: boolean) => void;
}

const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set, get) => ({
      // Initial state
      responses: {},
      currentQuestionIndex: 0,
      patientId: null,
      mobileNumber: null,
      consultationNumber: null,
      isSubmitting: false,
      submitError: null,
      isOfflineMode: false,
      pendingOfflineId: null,

      // Actions
      setResponse: (questionId: string, response: IFeedbackResponse) => {
        set((state) => ({
          responses: {
            ...state.responses,
            [questionId]: response
          }
        }));
      },

      setCurrentQuestionIndex: (index: number) => {
        set({ currentQuestionIndex: index });
      },

      setPatientInfo: (patientId: string, mobileNumber: string, consultationNumber: number) => {
        set({ 
          patientId, 
          mobileNumber, 
          consultationNumber 
        });
      },

      submitFeedback: async () => {
        const state = get();
        
        if (!state.patientId || !state.mobileNumber || state.consultationNumber === null) {
          set({ submitError: 'Missing patient information' });
          return;
        }

        set({ isSubmitting: true, submitError: null });

        try {
          // Prepare feedback submission data
          const feedbackData: FeedbackSubmission = {
            patientId: state.patientId,
            mobileNumber: state.mobileNumber,
            consultationNumber: state.consultationNumber,
            responses: Object.values(state.responses)
          };

          // Check if online
          const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

          if (isOnline) {
            // Try to submit directly to server
            try {
              const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const result = await response.json();
              
              if (!result.success) {
                throw new Error(result.error?.message || 'Failed to submit feedback');
              }

              // Success - reset session
              set({ 
                isSubmitting: false,
                submitError: null 
              });
              
              // Reset session after successful submission
              get().resetSession();
              
            } catch (error) {
              // If online submission fails, fall back to offline storage
              console.warn('Online submission failed, storing offline:', error);
              const offlineId = await offlineSyncManager.storeFeedbackOffline(feedbackData);
              
              set({ 
                isSubmitting: false,
                isOfflineMode: true,
                pendingOfflineId: offlineId,
                submitError: null
              });
              
              // Reset session after offline storage
              get().resetSession();
            }
          } else {
            // Store offline
            const offlineId = await offlineSyncManager.storeFeedbackOffline(feedbackData);
            
            set({ 
              isSubmitting: false,
              isOfflineMode: true,
              pendingOfflineId: offlineId,
              submitError: null
            });
            
            // Reset session after offline storage
            get().resetSession();
          }

        } catch (error) {
          console.error('Failed to submit feedback:', error);
          set({ 
            isSubmitting: false,
            submitError: error instanceof Error ? error.message : 'Failed to submit feedback'
          });
        }
      },

      resetSession: () => {
        set({
          responses: {},
          currentQuestionIndex: 0,
          patientId: null,
          mobileNumber: null,
          consultationNumber: null,
          isSubmitting: false,
          submitError: null,
          isOfflineMode: false,
          pendingOfflineId: null
        });
      },

      setOfflineMode: (isOffline: boolean) => {
        set({ isOfflineMode: isOffline });
      }
    }),
    {
      name: 'feedback-store',
      // Only persist essential session data, not submission state
      partialize: (state) => ({
        responses: state.responses,
        currentQuestionIndex: state.currentQuestionIndex,
        patientId: state.patientId,
        mobileNumber: state.mobileNumber,
        consultationNumber: state.consultationNumber
      })
    }
  )
);

export default useFeedbackStore;