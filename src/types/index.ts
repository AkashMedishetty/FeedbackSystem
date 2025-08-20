// Database model types - will be properly imported when models are implemented
export interface IPatient {
  _id: string;
  mobileNumber: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  email?: string;
  address?: string;
  emergencyContact?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuestion {
  _id: string;
  type: 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  orderIndex: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeedbackResponse {
  questionId: string;
  questionTitle: string;
  questionType: string;
  responseText?: string;
  responseNumber?: number;
  createdAt: Date;
}

export interface IFeedbackSession {
  _id: string;
  patientId: string;
  mobileNumber: string;
  consultationNumber: number;
  consultationDate?: Date;
  submittedAt: Date;
  isSynced: boolean;
  questionnaireType: string;
  responses: IFeedbackResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdminUser {
  _id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHospitalSettings {
  _id: string;
  hospitalName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  welcomeMessage: string;
  thankYouMessage: string;
  contactInfo: string;
  theme: 'light' | 'dark' | 'high-contrast';
  language: string;
  sessionTimeout: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITemplateQuestion {
  type: 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  orderIndex: number;
}

export interface IQuestionTemplate {
  _id: string;
  name: string;
  description: string;
  department: string;
  consultationType: 'first-visit' | 'follow-up' | 'regular' | 'custom';
  consultationNumberRange: {
    min: number;
    max?: number;
  };
  isDefault: boolean;
  questions: ITemplateQuestion[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConsultationRule {
  consultationNumber: number;
  templateId: string;
  templateName: string;
  description: string;
}

export interface IConsultationRules {
  _id: string;
  department: string;
  rules: IConsultationRule[];
  defaultTemplateId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Additional application types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PatientCheckResponse {
  exists: boolean;
  patient?: IPatient;
  consultationNumber: number;
}

export interface FeedbackSubmission {
  patientId: string;
  mobileNumber: string;
  consultationNumber: number;
  responses: {
    questionId: string;
    questionTitle: string;
    questionType: string;
    responseText?: string;
    responseNumber?: number;
  }[];
}

export interface FilterOptions {
  dateFrom?: Date;
  dateTo?: Date;
  mobileNumber?: string;
  consultationNumber?: number;
  department?: string;
}

export interface FeedbackStats {
  totalResponses: number;
  totalPatients: number;
  averageRating: number;
  responsesByDay: { date: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
}