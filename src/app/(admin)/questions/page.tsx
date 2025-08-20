'use client';

import React from 'react';
import QuestionBuilder from '@/components/admin/QuestionBuilder';
import { useQuestions } from '@/hooks/useQuestions';
import { IQuestion, ITemplateQuestion } from '@/types';

export default function QuestionsPage() {
  return <QuestionBuilder />;
}