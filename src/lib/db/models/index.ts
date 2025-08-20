// Export all database models
export { default as Patient, type IPatient } from './Patient';
export { default as Question, type IQuestion } from './Question';
export { default as FeedbackSession, type IFeedbackSession, type IFeedbackResponse } from './FeedbackSession';
export { default as AdminUser, type IAdminUser } from './AdminUser';
export { default as HospitalSettings, type IHospitalSettings } from './HospitalSettings';
export { default as QuestionTemplate, type IQuestionTemplate, type ITemplateQuestion } from './QuestionTemplate';
export { default as ConsultationRules, type IConsultationRules, type IConsultationRule } from './ConsultationRules';

// Re-export database connection and utilities
export { default as connectToDatabase } from '../connection';
export * from '../utils';