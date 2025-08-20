import { z } from 'zod';
import { VALIDATION_RULES } from '@/constants';

// Patient validation schemas
export const PatientSchema = z.object({
  mobileNumber: z
    .string()
    .min(VALIDATION_RULES.MOBILE_MIN_LENGTH, 'Mobile number must be at least 10 digits')
    .max(VALIDATION_RULES.MOBILE_MAX_LENGTH, 'Mobile number must be at most 15 digits')
    .regex(/^[+]?[\d\s\-()]+$/, 'Invalid mobile number format'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(VALIDATION_RULES.NAME_MAX_LENGTH, 'Name is too long'),
  age: z
    .number()
    .min(VALIDATION_RULES.AGE_MIN, 'Age must be positive')
    .max(VALIDATION_RULES.AGE_MAX, 'Age must be realistic'),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.date(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500, 'Address is too long').optional(),
  emergencyContact: z
    .string()
    .regex(/^[+]?[\d\s\-()]+$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
});

// Question validation schemas
export const QuestionSchema = z.object({
  type: z.enum(['text', 'rating', 'multipleChoice', 'yesNo', 'scale', 'email', 'phone', 'date']),
  title: z.string().min(1, 'Question title is required'),
  description: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  orderIndex: z.number().min(0),
});

// Feedback response validation schemas
export const FeedbackResponseSchema = z.object({
  questionId: z.string(),
  questionTitle: z.string(),
  questionType: z.string(),
  responseText: z.string().max(VALIDATION_RULES.TEXT_RESPONSE_MAX_LENGTH).optional(),
  responseNumber: z.number().optional(),
});

export const FeedbackSubmissionSchema = z.object({
  patientId: z.string(),
  mobileNumber: z.string(),
  consultationNumber: z.number().min(1),
  responses: z.array(FeedbackResponseSchema),
});

// Admin user validation schemas
export const AdminLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Hospital settings validation schemas
export const HospitalSettingsSchema = z.object({
  hospitalName: z.string().min(1, 'Hospital name is required'),
  logo: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  welcomeMessage: z.string().max(500, 'Welcome message is too long'),
  thankYouMessage: z.string().max(500, 'Thank you message is too long'),
  contactInfo: z.string().max(500, 'Contact info is too long').optional(),
  theme: z.enum(['light', 'dark', 'high-contrast']).default('light'),
  language: z.string().default('en'),
  sessionTimeout: z.number().min(1).max(60).default(5),
});

// Re-export template validation schemas
export * from './template';

export type PatientInput = z.infer<typeof PatientSchema>;
export type QuestionInput = z.infer<typeof QuestionSchema>;
export type FeedbackResponseInput = z.infer<typeof FeedbackResponseSchema>;
export type FeedbackSubmissionInput = z.infer<typeof FeedbackSubmissionSchema>;
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;
export type HospitalSettingsInput = z.infer<typeof HospitalSettingsSchema>;