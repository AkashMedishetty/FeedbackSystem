// Application constants

export const QUESTION_TYPES = {
  TEXT: 'text',
  RATING: 'rating',
  MULTIPLE_CHOICE: 'multipleChoice',
  YES_NO: 'yesNo',
  SCALE: 'scale',
  EMAIL: 'email',
  PHONE: 'phone',
  DATE: 'date',
} as const;

export const CONSULTATION_TYPES = {
  FIRST_VISIT: 'first-visit',
  FOLLOW_UP: 'follow-up',
  REGULAR: 'regular',
  CUSTOM: 'custom',
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  HIGH_CONTRAST: 'high-contrast',
} as const;

export const API_ENDPOINTS = {
  PATIENT_CHECK: '/api/patient/check',
  PATIENT_REGISTER: '/api/patient/register',
  QUESTIONS: '/api/questions',
  FEEDBACK_SUBMIT: '/api/feedback',
  ADMIN_LOGIN: '/api/auth/login',
  ADMIN_LOGOUT: '/api/auth/logout',
} as const;

export const STORAGE_KEYS = {
  OFFLINE_RESPONSES: 'offline-responses',
  PATIENT_DATA: 'patient-data',
  THEME_PREFERENCE: 'theme-preference',
} as const;

export const VALIDATION_RULES = {
  MOBILE_MIN_LENGTH: 10,
  MOBILE_MAX_LENGTH: 15,
  NAME_MAX_LENGTH: 100,
  TEXT_RESPONSE_MAX_LENGTH: 1000,
  AGE_MIN: 0,
  AGE_MAX: 150,
} as const;