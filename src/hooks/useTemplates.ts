import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IQuestionTemplate } from '@/types';

interface CreateTemplateData {
  name: string;
  description?: string;
  department: string;
  consultationType: 'first-visit' | 'follow-up' | 'regular' | 'custom';
  consultationNumberRange: {
    min: number;
    max?: number;
  };
  isDefault: boolean;
  questions: Array<{
    type: 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date';
    title: string;
    description?: string;
    required: boolean;
    options?: string[];
    minValue?: number;
    maxValue?: number;
    orderIndex: number;
    placeholder?: string;
    validation?: {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    };
  }>;
  createdBy: string;
}

interface UpdateTemplateData extends Partial<CreateTemplateData> {
  _id: string;
}

export function useTemplates(department?: string, consultationType?: string) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Build query params
  const queryParams = new URLSearchParams();
  if (department) queryParams.append('department', department);
  if (consultationType) queryParams.append('consultationType', consultationType);

  // Fetch templates
  const {
    data: templatesData,
    isLoading: isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['templates', department, consultationType],
    queryFn: async () => {
      const response = await fetch(`/api/admin/templates?${queryParams.toString()}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch templates');
      }
      
      return result.data;
    },
  });

  const templates = templatesData?.templates || [];

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (templateData: CreateTemplateData): Promise<IQuestionTemplate> => {
      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create template');
      }
      
      return result.data.template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ _id, ...updateData }: UpdateTemplateData): Promise<IQuestionTemplate> => {
      const response = await fetch(`/api/admin/templates/${_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update template');
      }
      
      return result.data.template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete template');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Apply template mutation (replace current questions with template questions)
  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      // First get the template
      const templateResponse = await fetch(`/api/admin/templates/${templateId}`);
      const templateResult = await templateResponse.json();
      
      if (!templateResult.success) {
        throw new Error('Failed to fetch template');
      }

      const template = templateResult.data.template;
      
      // Convert template questions to regular questions and create them
      const questionPromises = template.questions.map((question: IQuestionTemplate['questions'][0]) => 
        fetch('/api/admin/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: question.type,
            title: question.title,
            description: question.description,
            required: question.required,
            options: question.options,
            minValue: question.minValue,
            maxValue: question.maxValue,
            placeholder: question.placeholder,
            validation: question.validation,
          }),
        })
      );

      await Promise.all(questionPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  // Helper functions
  const createTemplate = useCallback(async (templateData: CreateTemplateData) => {
    setIsLoading(true);
    try {
      await createMutation.mutateAsync(templateData);
    } finally {
      setIsLoading(false);
    }
  }, [createMutation]);

  const updateTemplate = useCallback(async (templateId: string, templateData: Partial<CreateTemplateData>) => {
    setIsLoading(true);
    try {
      await updateMutation.mutateAsync({ _id: templateId, ...templateData });
    } finally {
      setIsLoading(false);
    }
  }, [updateMutation]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync(templateId);
    } finally {
      setIsLoading(false);
    }
  }, [deleteMutation]);

  const applyTemplate = useCallback(async (templateId: string) => {
    setIsLoading(true);
    try {
      await applyTemplateMutation.mutateAsync(templateId);
    } finally {
      setIsLoading(false);
    }
  }, [applyTemplateMutation]);

  return {
    templates,
    isLoading: isFetching || isLoading,
    error,
    refetch,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    // Mutation states for individual operations
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isApplying: applyTemplateMutation.isPending,
  };
}