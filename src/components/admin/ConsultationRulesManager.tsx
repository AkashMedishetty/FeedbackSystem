'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { IConsultationRules, IQuestionTemplate } from '@/types';

interface ConsultationRulesManagerProps {
  rules: IConsultationRules[];
  templates: IQuestionTemplate[];
  onUpdateRules: (departmentRules: IConsultationRules) => Promise<void>;
  departments: string[];
  isLoading?: boolean;
}

interface RuleFormData {
  consultationNumber: number;
  templateId: string;
  templateName: string;
  description: string;
}

export default function ConsultationRulesManager({
  rules,
  templates,
  onUpdateRules,
  departments,
  isLoading = false
}: ConsultationRulesManagerProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>(departments[0] || '');
  const [editingRules, setEditingRules] = useState<IConsultationRules | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleFormData, setRuleFormData] = useState<RuleFormData>({
    consultationNumber: 1,
    templateId: '',
    templateName: '',
    description: '',
  });

  // Get rules for selected department
  const departmentRules = rules.find(r => r.department === selectedDepartment);
  const departmentTemplates = templates.filter(t => t.department === selectedDepartment);

  const handleStartEditing = useCallback(() => {
    if (departmentRules) {
      setEditingRules({ ...departmentRules });
    } else {
      // Create new rules for department
      setEditingRules({
        _id: '',
        department: selectedDepartment,
        rules: [],
        defaultTemplateId: '',
        createdBy: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }, [departmentRules, selectedDepartment]);

  const handleCancelEditing = useCallback(() => {
    setEditingRules(null);
    setShowAddRule(false);
    setRuleFormData({
      consultationNumber: 1,
      templateId: '',
      templateName: '',
      description: '',
    });
  }, []);

  const handleSaveRules = useCallback(async () => {
    if (!editingRules) return;

    try {
      await onUpdateRules(editingRules);
      setEditingRules(null);
      setShowAddRule(false);
    } catch (error) {
      console.error('Error saving rules:', error);
    }
  }, [editingRules, onUpdateRules]);

  const handleAddRule = useCallback(() => {
    if (!editingRules || !ruleFormData.templateId) return;

    const selectedTemplate = templates.find(t => t._id === ruleFormData.templateId);
    if (!selectedTemplate) return;

    const newRule = {
      consultationNumber: ruleFormData.consultationNumber,
      templateId: ruleFormData.templateId,
      templateName: selectedTemplate.name,
      description: ruleFormData.description || `${selectedTemplate.name} for consultation ${ruleFormData.consultationNumber}`,
    };

    setEditingRules(prev => ({
      ...prev!,
      rules: [...prev!.rules, newRule].sort((a, b) => a.consultationNumber - b.consultationNumber),
    }));

    setRuleFormData({
      consultationNumber: ruleFormData.consultationNumber + 1,
      templateId: '',
      templateName: '',
      description: '',
    });
    setShowAddRule(false);
  }, [editingRules, ruleFormData, templates]);

  const handleRemoveRule = useCallback((consultationNumber: number) => {
    if (!editingRules) return;

    setEditingRules(prev => ({
      ...prev!,
      rules: prev!.rules.filter(r => r.consultationNumber !== consultationNumber),
    }));
  }, [editingRules]);

  const handleSetDefaultTemplate = useCallback((templateId: string) => {
    if (!editingRules) return;

    setEditingRules(prev => ({
      ...prev!,
      defaultTemplateId: templateId,
    }));
  }, [editingRules]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Consultation Rules
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure which templates to use for different consultation numbers by department
          </p>
        </div>
        {!editingRules && (
          <Button onClick={handleStartEditing} disabled={isLoading}>
            {departmentRules ? 'Edit Rules' : 'Create Rules'}
          </Button>
        )}
      </div>

      {/* Department Selection */}
      <div className="flex gap-2 flex-wrap">
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => setSelectedDepartment(dept)}
            disabled={editingRules !== null}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedDepartment === dept
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            } ${editingRules ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {dept.charAt(0).toUpperCase() + dept.slice(1)}
          </button>
        ))}
      </div>

      {/* Editing Mode */}
      {editingRules && (
        <div className="card-typeform p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Editing Rules for {selectedDepartment.charAt(0).toUpperCase() + selectedDepartment.slice(1)}
            </h3>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancelEditing}>
                Cancel
              </Button>
              <Button onClick={handleSaveRules} isLoading={isLoading}>
                Save Rules
              </Button>
            </div>
          </div>

          {/* Default Template Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Template (Fallback)
            </label>
            <select
              value={editingRules.defaultTemplateId}
              onChange={(e) => handleSetDefaultTemplate(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="">No default template</option>
              {departmentTemplates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name} ({getConsultationTypeLabel(template.consultationType)})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This template will be used when no specific rule matches the consultation number
            </p>
          </div>

          {/* Current Rules */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                Consultation Rules ({editingRules.rules.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddRule(true)}
              >
                Add Rule
              </Button>
            </div>

            {editingRules.rules.length > 0 ? (
              <div className="space-y-3">
                {editingRules.rules.map((rule) => {
                  const template = templates.find(t => t._id === rule.templateId);
                  return (
                    <div
                      key={rule.consultationNumber}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Consultation #{rule.consultationNumber}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {rule.templateName}
                          </span>
                          {template && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {getConsultationTypeLabel(template.consultationType)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {rule.description}
                        </p>
                        {template && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {template.questions.length} questions • {getConsultationRangeText(template)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRule(rule.consultationNumber)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No rules configured. Add a rule to get started.
              </div>
            )}
          </div>

          {/* Add Rule Form */}
          {showAddRule && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Add New Rule
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Consultation Number
                  </label>
                  <input
                    type="number"
                    value={ruleFormData.consultationNumber}
                    onChange={(e) => setRuleFormData(prev => ({
                      ...prev,
                      consultationNumber: parseInt(e.target.value) || 1
                    }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template
                  </label>
                  <select
                    value={ruleFormData.templateId}
                    onChange={(e) => {
                      const template = templates.find(t => t._id === e.target.value);
                      setRuleFormData(prev => ({
                        ...prev,
                        templateId: e.target.value,
                        templateName: template?.name || '',
                      }));
                    }}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
                  >
                    <option value="">Select template</option>
                    {departmentTemplates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name} ({getConsultationTypeLabel(template.consultationType)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={ruleFormData.description}
                  onChange={(e) => setRuleFormData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded"
                  placeholder="Describe when this rule applies..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowAddRule(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRule}
                  disabled={!ruleFormData.templateId}
                >
                  Add Rule
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Mode */}
      {!editingRules && (
        <div className="card-typeform p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Current Rules for {selectedDepartment.charAt(0).toUpperCase() + selectedDepartment.slice(1)}
          </h3>

          {departmentRules ? (
            <div className="space-y-6">
              {/* Default Template */}
              {departmentRules.defaultTemplateId && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Template (Fallback)
                  </h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {(() => {
                      const defaultTemplate = templates.find(t => t._id === departmentRules.defaultTemplateId);
                      return defaultTemplate ? (
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {defaultTemplate.name}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                            ({getConsultationTypeLabel(defaultTemplate.consultationType)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Template not found</span>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Rules */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Consultation Rules ({departmentRules.rules.length})
                </h4>
                {departmentRules.rules.length > 0 ? (
                  <div className="space-y-2">
                    {departmentRules.rules.map((rule) => {
                      const template = templates.find(t => t._id === rule.templateId);
                      return (
                        <div
                          key={rule.consultationNumber}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                #{rule.consultationNumber}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {rule.templateName}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {rule.description}
                            </p>
                          </div>
                          {template && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {template.questions.length} questions
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No rules configured for this department
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">⚙️</div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No rules configured
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create consultation rules to automatically assign templates based on consultation numbers.
              </p>
              <Button onClick={handleStartEditing}>
                Create Rules
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Available Templates */}
      {departmentTemplates.length > 0 && (
        <div className="card-typeform p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Available Templates for {selectedDepartment.charAt(0).toUpperCase() + selectedDepartment.slice(1)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentTemplates.map((template) => (
              <div
                key={template._id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </h4>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {getConsultationTypeLabel(template.consultationType)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {getConsultationRangeText(template)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {template.questions.length} questions
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}