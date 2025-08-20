'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import QuestionBuilder from './QuestionBuilder';
import { IQuestionTemplate, ITemplateQuestion } from '@/types';

interface TemplateBuilderProps {
  template?: IQuestionTemplate;
  onSave: (template: Omit<IQuestionTemplate, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  departments: string[];
  isLoading?: boolean;
}

interface TemplateFormData {
  name: string;
  description: string;
  department: string;
  consultationType: 'first-visit' | 'follow-up' | 'regular' | 'custom';
  consultationNumberRange: {
    min: number;
    max?: number;
  };
  isDefault: boolean;
}

const CONSULTATION_TYPES = [
  { value: 'first-visit', label: 'First Visit', description: 'For new patients on their first consultation' },
  { value: 'follow-up', label: 'Follow-up', description: 'For returning patients with follow-up appointments' },
  { value: 'regular', label: 'Regular Visit', description: 'For ongoing regular consultations' },
  { value: 'custom', label: 'Custom', description: 'Custom consultation type' },
] as const;

export default function TemplateBuilder({
  template,
  onSave,
  onCancel,
  departments,
  isLoading = false
}: TemplateBuilderProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: template?.name || '',
    description: template?.description || '',
    department: template?.department || departments[0] || '',
    consultationType: template?.consultationType || 'first-visit',
    consultationNumberRange: template?.consultationNumberRange || { min: 1 },
    isDefault: template?.isDefault || false,
  });

  const [questions, setQuestions] = useState<ITemplateQuestion[]>(template?.questions || []);
  const [currentStep, setCurrentStep] = useState<'details' | 'questions'>('details');

  const handleSaveQuestions = useCallback(async (updatedQuestions: ITemplateQuestion[]) => {
    setQuestions(updatedQuestions);
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    const templateData = {
      ...formData,
      questions,
      createdBy: 'current-user', // This should come from auth context
    };

    await onSave(templateData);
  }, [formData, questions, onSave]);

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) return false;
    if (!formData.department.trim()) return false;
    if (formData.consultationNumberRange.min < 1) return false;
    if (formData.consultationNumberRange.max && formData.consultationNumberRange.max < formData.consultationNumberRange.min) return false;
    return true;
  }, [formData]);

  const canProceedToQuestions = validateForm();
  const canSaveTemplate = canProceedToQuestions && questions.length > 0;

  if (currentStep === 'questions') {
    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep('details')}
            >
              ← Back to Details
            </Button>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {template ? 'Edit Template Questions' : 'Create Template Questions'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Template: {formData.name} ({formData.department})
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!canSaveTemplate}
              isLoading={isLoading}
            >
              {template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </div>

        {/* Question Builder */}
        <QuestionBuilder
          questions={questions}
          onSave={handleSaveQuestions}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure template details and consultation rules
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Template Details Form */}
      <div className="card-typeform p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          Template Details
        </h3>

        <div className="space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input-typeform"
              placeholder="e.g., First Visit Cardiology"
            />
          </div>

          {/* Template Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              rows={3}
              placeholder="Describe when this template should be used..."
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department *
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept.charAt(0).toUpperCase() + dept.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Consultation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Consultation Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CONSULTATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, consultationType: type.value }))}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    formData.consultationType === type.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {type.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Consultation Number Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Consultation Number Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Min Consultation *
                </label>
                <input
                  type="number"
                  value={formData.consultationNumberRange.min}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    consultationNumberRange: {
                      ...prev.consultationNumberRange,
                      min: parseInt(e.target.value) || 1
                    }
                  }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Max Consultation (optional)
                </label>
                <input
                  type="number"
                  value={formData.consultationNumberRange.max || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    consultationNumberRange: {
                      ...prev.consultationNumberRange,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    }
                  }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
                  min={formData.consultationNumberRange.min}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This template will be used for consultations in this range
            </p>
          </div>

          {/* Default Template Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="mr-3"
            />
            <label htmlFor="isDefault" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Set as default template for this department
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => setCurrentStep('questions')}
            disabled={!canProceedToQuestions}
          >
            Next: Configure Questions →
          </Button>
        </div>
      </div>
    </div>
  );
}