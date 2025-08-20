import { z } from 'zod';

// Template Question validation schema
export const TemplateQuestionSchema = z.object({
  type: z.enum(['text', 'rating', 'multipleChoice', 'yesNo', 'scale', 'email', 'phone', 'date']),
  title: z.string().min(1, 'Question title is required').max(500, 'Question title is too long'),
  description: z.string().max(1000, 'Question description is too long').optional(),
  required: z.boolean().default(false),
  options: z.array(z.string().max(200, 'Option text is too long')).optional(),
  minValue: z.number().min(0).optional(),
  maxValue: z.number().min(1).optional(),
  orderIndex: z.number().min(0).default(0),
  placeholder: z.string().max(200, 'Placeholder is too long').optional(),
  validation: z.object({
    minLength: z.number().min(0).optional(),
    maxLength: z.number().min(1).optional(),
    pattern: z.string().max(500, 'Pattern is too long').optional(),
  }).optional(),
}).refine((data) => {
  // Validate that multiple choice questions have options
  if (data.type === 'multipleChoice' && (!data.options || data.options.length === 0)) {
    return false;
  }
  // Validate that rating/scale questions have min/max values
  if ((data.type === 'rating' || data.type === 'scale') && 
      (data.minValue === undefined || data.maxValue === undefined)) {
    return false;
  }
  // Validate that min value is less than max value
  if (data.minValue !== undefined && data.maxValue !== undefined && 
      data.minValue >= data.maxValue) {
    return false;
  }
  return true;
}, {
  message: "Invalid question configuration"
});

// Question Template validation schema
export const QuestionTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200, 'Template name is too long'),
  description: z.string().max(1000, 'Template description is too long').optional(),
  department: z.string().min(1, 'Department is required').max(100, 'Department name is too long'),
  consultationType: z.enum(['first-visit', 'follow-up', 'regular', 'custom']),
  consultationNumberRange: z.object({
    min: z.number().min(1, 'Minimum consultation number must be at least 1'),
    max: z.number().min(1).optional(),
  }).refine((data) => {
    if (data.max !== undefined && data.min >= data.max) {
      return false;
    }
    return true;
  }, {
    message: "Maximum consultation number must be greater than minimum"
  }),
  isDefault: z.boolean().default(false),
  questions: z.array(TemplateQuestionSchema).min(1, 'Template must have at least one question'),
  createdBy: z.string().min(1, 'Created by is required'),
});

// Consultation Rule validation schema
export const ConsultationRuleSchema = z.object({
  consultationNumber: z.number().min(1, 'Consultation number must be at least 1'),
  templateId: z.string().min(1, 'Template ID is required'),
  templateName: z.string().min(1, 'Template name is required').max(200, 'Template name is too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description is too long'),
});

// Consultation Rules validation schema
export const ConsultationRulesSchema = z.object({
  department: z.string().min(1, 'Department is required').max(100, 'Department name is too long'),
  rules: z.array(ConsultationRuleSchema).min(1, 'At least one rule is required'),
  defaultTemplateId: z.string().min(1, 'Default template ID is required'),
  createdBy: z.string().min(1, 'Created by is required'),
}).refine((data) => {
  // Check for duplicate consultation numbers
  const consultationNumbers = data.rules.map(rule => rule.consultationNumber);
  const uniqueNumbers = new Set(consultationNumbers);
  return uniqueNumbers.size === consultationNumbers.length;
}, {
  message: "Duplicate consultation numbers are not allowed"
});

// Template Application validation schema
export const TemplateApplicationSchema = z.object({
  replaceExisting: z.boolean().default(false),
  preserveOrder: z.boolean().default(true),
  skipValidation: z.boolean().default(false),
  createdBy: z.string().default('admin'),
});

// Export types
export type TemplateQuestionInput = z.infer<typeof TemplateQuestionSchema>;
export type QuestionTemplateInput = z.infer<typeof QuestionTemplateSchema>;
export type ConsultationRuleInput = z.infer<typeof ConsultationRuleSchema>;
export type ConsultationRulesInput = z.infer<typeof ConsultationRulesSchema>;
export type TemplateApplicationInput = z.infer<typeof TemplateApplicationSchema>;