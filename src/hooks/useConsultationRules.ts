import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IConsultationRules } from '@/types';

interface CreateConsultationRulesData {
  department: string;
  rules: Array<{
    consultationNumber: number;
    templateId: string;
    templateName: string;
    description: string;
  }>;
  defaultTemplateId: string;
  createdBy: string;
}

interface UpdateConsultationRulesData extends Partial<CreateConsultationRulesData> {
  _id?: string;
}

export function useConsultationRules(department?: string) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Build query params
  const queryParams = new URLSearchParams();
  if (department) queryParams.append('department', department);

  // Fetch consultation rules
  const {
    data: rulesData,
    isLoading: isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['consultation-rules', department],
    queryFn: async (): Promise<IConsultationRules[]> => {
      const response = await fetch(`/api/admin/consultation-rules?${queryParams.toString()}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch consultation rules');
      }
      
      return result.data || [];
    },
  });

  const rules = useMemo(() => rulesData || [], [rulesData]);

  // Create consultation rules mutation
  const createMutation = useMutation({
    mutationFn: async (rulesData: CreateConsultationRulesData): Promise<IConsultationRules> => {
      const response = await fetch('/api/admin/consultation-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rulesData),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create consultation rules');
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation-rules'] });
    },
  });

  // Update consultation rules mutation
  const updateMutation = useMutation({
    mutationFn: async (rulesData: UpdateConsultationRulesData): Promise<IConsultationRules> => {
      const { department: dept, ...updateData } = rulesData;
      const targetDepartment = dept || department;
      
      if (!targetDepartment) {
        throw new Error('Department is required for updating consultation rules');
      }

      const response = await fetch(`/api/admin/consultation-rules/${targetDepartment}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update consultation rules');
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation-rules'] });
    },
  });

  // Delete consultation rules mutation
  const deleteMutation = useMutation({
    mutationFn: async (targetDepartment: string): Promise<void> => {
      const response = await fetch(`/api/admin/consultation-rules/${targetDepartment}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete consultation rules');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation-rules'] });
    },
  });

  // Helper functions
  const createConsultationRules = useCallback(async (rulesData: CreateConsultationRulesData) => {
    setIsLoading(true);
    try {
      await createMutation.mutateAsync(rulesData);
    } finally {
      setIsLoading(false);
    }
  }, [createMutation]);

  const updateConsultationRules = useCallback(async (rulesData: IConsultationRules) => {
    setIsLoading(true);
    try {
      await updateMutation.mutateAsync(rulesData);
    } finally {
      setIsLoading(false);
    }
  }, [updateMutation]);

  const deleteConsultationRules = useCallback(async (targetDepartment: string) => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync(targetDepartment);
    } finally {
      setIsLoading(false);
    }
  }, [deleteMutation]);

  // Get rules for a specific department
  const getRulesForDepartment = useCallback((targetDepartment: string) => {
    return rules.find(r => r.department === targetDepartment);
  }, [rules]);

  // Get template for consultation number
  const getTemplateForConsultation = useCallback((targetDepartment: string, consultationNumber: number) => {
    const departmentRules = getRulesForDepartment(targetDepartment);
    if (!departmentRules) return null;

    // Find specific rule for consultation number
    const rule = departmentRules.rules.find(r => r.consultationNumber === consultationNumber);
    if (rule) {
      return {
        templateId: rule.templateId,
        templateName: rule.templateName,
        source: 'rule' as const,
      };
    }

    // Fall back to default template
    if (departmentRules.defaultTemplateId) {
      return {
        templateId: departmentRules.defaultTemplateId,
        templateName: 'Default Template',
        source: 'default' as const,
      };
    }

    return null;
  }, [getRulesForDepartment]);

  return {
    rules,
    isLoading: isFetching || isLoading,
    error,
    refetch,
    createConsultationRules,
    updateConsultationRules,
    deleteConsultationRules,
    getRulesForDepartment,
    getTemplateForConsultation,
    // Mutation states for individual operations
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}