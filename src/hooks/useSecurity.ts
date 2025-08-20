import { useCallback, useMemo } from 'react';
import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeMRN,
  sanitizeFeedback,
  sanitizeRating,
  sanitizePatientData,
  sanitizeFeedbackData,
  sanitizeHtml
} from '@/lib/security/sanitization';
import {
  encryptData,
  decryptData,
  encryptPatientData,
  decryptPatientData,
  generateHash,
  verifyHash,
  maskSensitiveData
} from '@/lib/security/encryption';

export interface SecurityValidationResult {
  isValid: boolean;
  sanitizedData: any;
  errors: string[];
}

export interface SecurityOptions {
  encrypt?: boolean;
  validateRequired?: string[];
  maxLength?: { [key: string]: number };
}

export const useSecurity = () => {
  // Sanitization functions
  const sanitize = useMemo(() => ({
    input: sanitizeInput,
    email: sanitizeEmail,
    phone: sanitizePhone,
    mrn: sanitizeMRN,
    feedback: sanitizeFeedback,
    rating: sanitizeRating,
    html: sanitizeHtml,
    patientData: sanitizePatientData,
    feedbackData: sanitizeFeedbackData
  }), []);

  // Encryption functions
  const crypto = useMemo(() => ({
    encrypt: encryptData,
    decrypt: decryptData,
    encryptPatient: encryptPatientData,
    decryptPatient: decryptPatientData,
    hash: generateHash,
    verify: verifyHash,
    mask: maskSensitiveData
  }), []);

  // Comprehensive validation function
  const validateAndSanitize = useCallback(
    (data: any, type: 'patient' | 'feedback' | 'general', options: SecurityOptions = {}): SecurityValidationResult => {
      const errors: string[] = [];
      let sanitizedData: any = {};

      try {
        // Apply type-specific sanitization
        switch (type) {
          case 'patient':
            sanitizedData = sanitizePatientData(data);
            break;
          case 'feedback':
            sanitizedData = sanitizeFeedbackData(data);
            break;
          case 'general':
          default:
            sanitizedData = { ...data };
            // Apply general sanitization to string fields
            Object.keys(sanitizedData).forEach(key => {
              if (typeof sanitizedData[key] === 'string') {
                sanitizedData[key] = sanitizeInput(sanitizedData[key]);
              }
            });
            break;
        }

        // Validate required fields
        if (options.validateRequired) {
          options.validateRequired.forEach(field => {
            if (!sanitizedData[field] || sanitizedData[field] === '') {
              errors.push(`${field} is required`);
            }
          });
        }

        // Validate field lengths
        if (options.maxLength) {
          Object.entries(options.maxLength).forEach(([field, maxLen]) => {
            if (sanitizedData[field] && sanitizedData[field].length > maxLen) {
              errors.push(`${field} exceeds maximum length of ${maxLen} characters`);
              sanitizedData[field] = sanitizedData[field].substring(0, maxLen);
            }
          });
        }

        // Apply encryption if requested
        if (options.encrypt && type === 'patient') {
          sanitizedData = encryptPatientData(sanitizedData);
        }

        return {
          isValid: errors.length === 0,
          sanitizedData,
          errors
        };
      } catch (error) {
        console.error('Validation error:', error);
        return {
          isValid: false,
          sanitizedData: {},
          errors: ['Validation failed due to an internal error']
        };
      }
    },
    []
  );

  // Specific validation functions
  const validatePatientData = useCallback(
    (data: any, options: SecurityOptions = {}) => {
      return validateAndSanitize(data, 'patient', {
        validateRequired: ['name'],
        maxLength: {
          name: 100,
          email: 255,
          phone: 20,
          address: 500,
          medicalRecordNumber: 20
        },
        ...options
      });
    },
    [validateAndSanitize]
  );

  const validateFeedbackData = useCallback(
    (data: any, options: SecurityOptions = {}) => {
      return validateAndSanitize(data, 'feedback', {
        validateRequired: ['rating', 'feedback'],
        maxLength: {
          feedback: 5000,
          category: 50,
          department: 50
        },
        ...options
      });
    },
    [validateAndSanitize]
  );

  // Security check functions
  const checkDataIntegrity = useCallback(
    (data: string, expectedHash: string): boolean => {
      return verifyHash(data, expectedHash);
    },
    []
  );

  const generateDataHash = useCallback(
    (data: string): string => {
      return generateHash(data);
    },
    []
  );

  // Safe data display functions
  const maskForDisplay = useCallback(
    (data: string, type: 'email' | 'phone' | 'mrn' | 'general' = 'general'): string => {
      if (!data) return '';

      switch (type) {
        case 'email':
          const [localPart, domain] = data.split('@');
          if (!domain) return maskSensitiveData(data, 2);
          return `${maskSensitiveData(localPart, 1)}@${domain}`;
        case 'phone':
          return data.length > 4 ? `***-***-${data.slice(-4)}` : maskSensitiveData(data, 0);
        case 'mrn':
          return maskSensitiveData(data, 3);
        default:
          return maskSensitiveData(data, 2);
      }
    },
    []
  );

  // Input validation for forms
  const validateInput = useCallback(
    (value: string, rules: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      type?: 'email' | 'phone' | 'mrn';
    }): { isValid: boolean; error?: string; sanitized: string } => {
      let sanitized = sanitizeInput(value);
      
      if (rules.required && !sanitized) {
        return { isValid: false, error: 'This field is required', sanitized };
      }
      
      if (rules.minLength && sanitized.length < rules.minLength) {
        return { isValid: false, error: `Minimum length is ${rules.minLength} characters`, sanitized };
      }
      
      if (rules.maxLength && sanitized.length > rules.maxLength) {
        sanitized = sanitized.substring(0, rules.maxLength);
      }
      
      if (rules.pattern && !rules.pattern.test(sanitized)) {
        return { isValid: false, error: 'Invalid format', sanitized };
      }
      
      // Type-specific validation
      if (rules.type) {
        switch (rules.type) {
          case 'email':
            const emailResult = sanitizeEmail(sanitized);
            if (!emailResult) {
              return { isValid: false, error: 'Invalid email format', sanitized };
            }
            sanitized = emailResult;
            break;
          case 'phone':
            const phoneResult = sanitizePhone(sanitized);
            if (!phoneResult) {
              return { isValid: false, error: 'Invalid phone number', sanitized };
            }
            sanitized = phoneResult;
            break;
          case 'mrn':
            const mrnResult = sanitizeMRN(sanitized);
            if (!mrnResult) {
              return { isValid: false, error: 'Invalid medical record number', sanitized };
            }
            sanitized = mrnResult;
            break;
        }
      }
      
      return { isValid: true, sanitized };
    },
    []
  );

  return {
    sanitize,
    crypto,
    validateAndSanitize,
    validatePatientData,
    validateFeedbackData,
    checkDataIntegrity,
    generateDataHash,
    maskForDisplay,
    validateInput
  };
};

export default useSecurity;