'use client';

import React from 'react';
import QuestionTemplateManager from '@/components/admin/QuestionTemplateManager';
import { useTemplates } from '@/hooks/useTemplates';
import { IQuestionTemplate } from '@/types';

export default function TemplatesPage() {
  const {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    isLoading
  } = useTemplates();

  return (
    <QuestionTemplateManager
      templates={templates}
      onCreateTemplate={createTemplate}
      onUpdateTemplate={updateTemplate}
      onDeleteTemplate={deleteTemplate}
      onApplyTemplate={applyTemplate}
      isLoading={isLoading}
    />
  );
}