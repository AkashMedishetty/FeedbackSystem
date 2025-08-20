// API Request/Response Types

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  department: string;
  consultationType: 'first-visit' | 'follow-up' | 'regular' | 'custom';
  consultationNumberRange?: {
    min: number;
    max?: number;
  };
  isDefault?: boolean;
  questions: TemplateQuestionRequest[];
  createdBy: string;
}

export interface TemplateQuestionRequest {
  type: 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  orderIndex?: number;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  department?: string;
  consultationType?: 'first-visit' | 'follow-up' | 'regular' | 'custom';
  consultationNumberRange?: {
    min: number;
    max?: number;
  };
  isDefault?: boolean;
  questions?: TemplateQuestionRequest[];
}

export interface ConsultationRuleRequest {
  consultationNumber: number;
  templateId: string;
  templateName: string;
  description: string;
}

export interface CreateConsultationRulesRequest {
  department: string;
  rules: ConsultationRuleRequest[];
  defaultTemplateId: string;
  createdBy: string;
}

export interface UpdateConsultationRulesRequest {
  rules?: ConsultationRuleRequest[];
  defaultTemplateId?: string;
}

export interface TemplateApplicationRequest {
  replaceExisting?: boolean;
  preserveOrder?: boolean;
  skipValidation?: boolean;
  createdBy?: string;
}