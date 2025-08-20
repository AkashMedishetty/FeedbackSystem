'use client';

import React, { useState } from 'react';
import ConsultationRulesManager from '@/components/admin/ConsultationRulesManager';
import { useConsultationRules } from '@/hooks/useConsultationRules';
import { useTemplates } from '@/hooks/useTemplates';
import { IConsultationRules } from '@/types';

const SETTINGS_TABS = [
  { id: 'consultation-rules', label: 'Consultation Rules', icon: '⚙️' },
  { id: 'branding', label: 'Branding', icon: '🎨' },
  { id: 'general', label: 'General', icon: '📋' },
] as const;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('consultation-rules');
  
  const {
    rules,
    isLoading: rulesLoading,
    updateConsultationRules,
  } = useConsultationRules();

  const {
    templates,
    isLoading: templatesLoading,
  } = useTemplates();

  // Get unique departments from templates
  const departments = Array.from(new Set(templates.map((t: { department: string }) => t.department))) as string[];

  const handleUpdateRules = async (departmentRules: IConsultationRules) => {
    try {
      await updateConsultationRules(departmentRules);
    } catch (error) {
      console.error('Error updating consultation rules:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'consultation-rules':
        return (
          <ConsultationRulesManager
            rules={rules}
            templates={templates}
            onUpdateRules={handleUpdateRules}
            departments={departments}
            isLoading={rulesLoading || templatesLoading}
          />
        );
      case 'branding':
        return (
          <div className="card-typeform p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Branding Settings
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Branding configuration features will be implemented in subsequent tasks.
            </p>
          </div>
        );
      case 'general':
        return (
          <div className="card-typeform p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              General Settings
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              General system settings will be implemented in subsequent tasks.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}