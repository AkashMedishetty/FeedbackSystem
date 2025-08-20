'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import TemplateBuilder from './TemplateBuilder';
import { IQuestionTemplate } from '@/types';

interface QuestionTemplateManagerProps {
  templates: IQuestionTemplate[];
  onCreateTemplate: (template: Omit<IQuestionTemplate, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateTemplate: (id: string, template: Partial<IQuestionTemplate>) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onApplyTemplate: (templateId: string) => Promise<void>;
  isLoading?: boolean;
}

export default function QuestionTemplateManager({
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onApplyTemplate,
  isLoading = false
}: QuestionTemplateManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IQuestionTemplate | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Get unique departments from templates
  const departments = ['all', ...Array.from(new Set(templates.map(t => t.department)))];

  // Filter templates by department
  const filteredTemplates = selectedDepartment === 'all' 
    ? templates 
    : templates.filter(t => t.department === selectedDepartment);

  const handleCreateTemplate = useCallback(async (templateData: Omit<IQuestionTemplate, '_id' | 'createdAt' | 'updatedAt'>) => {
    await onCreateTemplate(templateData);
    setShowCreateForm(false);
  }, [onCreateTemplate]);

  const handleUpdateTemplate = useCallback(async (templateData: Omit<IQuestionTemplate, '_id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTemplate) {
      await onUpdateTemplate(editingTemplate._id, templateData);
      setEditingTemplate(null);
    }
  }, [editingTemplate, onUpdateTemplate]);

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      await onDeleteTemplate(templateId);
    }
  }, [onDeleteTemplate]);

  const handleApplyTemplate = useCallback(async (templateId: string) => {
    if (confirm('This will replace all current questions with the template questions. Continue?')) {
      await onApplyTemplate(templateId);
    }
  }, [onApplyTemplate]);

  const getConsultationTypeLabel = (type: string) => {
    switch (type) {
      case 'first-visit': return 'First Visit';
      case 'follow-up': return 'Follow-up';
      case 'regular': return 'Regular Visit';
      case 'custom': return 'Custom';
      default: return type;
    }
  };

  const getConsultationRangeText = (template: IQuestionTemplate) => {
    const { min, max } = template.consultationNumberRange;
    if (max) {
      return `Consultations ${min}-${max}`;
    }
    return `Consultation ${min}+`;
  };

  if (showCreateForm || editingTemplate) {
    return (
      <TemplateBuilder
        template={editingTemplate || undefined}
        onSave={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
        onCancel={() => {
          setShowCreateForm(false);
          setEditingTemplate(null);
        }}
        departments={departments.filter(d => d !== 'all')}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Question Templates
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage pre-built question sets for different consultation types
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          disabled={isLoading}
        >
          Create Template
        </Button>
      </div>

      {/* Department Filter */}
      <div className="flex gap-2 flex-wrap">
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => setSelectedDepartment(dept)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedDepartment === dept
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {dept === 'all' ? 'All Departments' : dept.charAt(0).toUpperCase() + dept.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template._id}
              className="card-typeform p-6 hover:shadow-lg transition-shadow"
            >
              {/* Template Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {template.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {template.department}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {getConsultationTypeLabel(template.consultationType)}
                    </span>
                    {template.isDefault && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getConsultationRangeText(template)}
                  </p>
                </div>
              </div>

              {/* Template Description */}
              {template.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {template.description}
                </p>
              )}

              {/* Template Stats */}
              <div className="flex items-center justify-between mb-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{template.questions.length} questions</span>
                <span>
                  {template.questions.filter(q => q.required).length} required
                </span>
              </div>

              {/* Question Types Preview */}
              <div className="flex flex-wrap gap-1 mb-4">
                {Array.from(new Set(template.questions.map(q => q.type))).map((type) => (
                  <span
                    key={type}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded dark:bg-gray-700 dark:text-gray-300"
                  >
                    {type}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyTemplate(template._id)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTemplate(template)}
                  disabled={isLoading}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template._id)}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No templates found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {selectedDepartment === 'all' 
              ? 'Create your first question template to get started.'
              : `No templates found for ${selectedDepartment} department.`
            }
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            Create Template
          </Button>
        </div>
      )}
    </div>
  );
}