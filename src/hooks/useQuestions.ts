import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IQuestion, ApiResponse } from '@/types';

interface CreateQuestionData {
  type: 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface UpdateQuestionData extends CreateQuestionData {
  _id: string;
}

export function useQuestions(activeOnly: boolean = true) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch questions
  const {
    data: questions = [],
    isLoading: isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['questions', activeOnly],
    queryFn: async (): Promise<IQuestion[]> => {
      const response = await fetch(`/api/admin/questions?active=${activeOnly}`);
      const result: ApiResponse<IQuestion[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch questions');
      }
      
      return result.data || [];
    },
  });

  // Create question mutation
  const createMutation = useMutation({
    mutationFn: async (questionData: CreateQuestionData): Promise<IQuestion> => {
      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      const result: ApiResponse<IQuestion> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create question');
      }
      
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  // Update question mutation
  const updateMutation = useMutation({
    mutationFn: async (questionData: UpdateQuestionData): Promise<IQuestion> => {
      const { _id, ...updateData } = questionData;
      const response = await fetch(`/api/admin/questions/${_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result: ApiResponse<IQuestion> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update question');
      }
      
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  // Delete question mutation
  const deleteMutation = useMutation({
    mutationFn: async (questionId: string): Promise<void> => {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'DELETE',
      });

      const result: ApiResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete question');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  // Bulk update questions (for reordering)
  const bulkUpdateMutation = useMutation({
    mutationFn: async (questions: IQuestion[]): Promise<void> => {
      const response = await fetch('/api/admin/questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questions),
      });

      const result: ApiResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update questions');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  // Helper functions
  const createQuestion = useCallback(async (questionData: CreateQuestionData) => {
    setIsLoading(true);
    try {
      await createMutation.mutateAsync(questionData);
    } finally {
      setIsLoading(false);
    }
  }, [createMutation]);

  const updateQuestion = useCallback(async (questionData: UpdateQuestionData) => {
    setIsLoading(true);
    try {
      await updateMutation.mutateAsync(questionData);
    } finally {
      setIsLoading(false);
    }
  }, [updateMutation]);

  const deleteQuestion = useCallback(async (questionId: string) => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync(questionId);
    } finally {
      setIsLoading(false);
    }
  }, [deleteMutation]);

  const reorderQuestions = useCallback(async (reorderedQuestions: IQuestion[]) => {
    setIsLoading(true);
    try {
      await bulkUpdateMutation.mutateAsync(reorderedQuestions);
    } finally {
      setIsLoading(false);
    }
  }, [bulkUpdateMutation]);

  return {
    questions,
    isLoading: isFetching || isLoading,
    error,
    refetch,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    // Mutation states for individual operations
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: bulkUpdateMutation.isPending,
  };
}