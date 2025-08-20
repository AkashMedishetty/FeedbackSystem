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
} from './sanitization';

// Re-export all sanitization functions for backward compatibility
export {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeMRN,
  sanitizeFeedback,
  sanitizeRating,
  sanitizePatientData,
  sanitizeFeedbackData,
  sanitizeHtml
};

// Main validation function that combines sanitization with validation
export function validateInput(input: any, options?: {
  type?: 'string' | 'email' | 'phone' | 'number' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: any[];
  sanitize?: boolean;
}): any {
  const {
    type = 'string',
    required = false,
    minLength,
    maxLength,
    pattern,
    allowedValues,
    sanitize = true
  } = options || {};

  // Check if required
  if (required && (input === null || input === undefined || input === '')) {
    throw new Error('Input is required');
  }

  // Return early if input is null/undefined and not required
  if (input === null || input === undefined) {
    return input;
  }

  let sanitizedInput = input;

  // Sanitize based on type
  if (sanitize) {
    switch (type) {
      case 'string':
        sanitizedInput = typeof input === 'string' ? sanitizeInput(input) : String(input);
        break;
      case 'email':
        sanitizedInput = sanitizeEmail(String(input));
        break;
      case 'phone':
        sanitizedInput = sanitizePhone(String(input));
        break;
      case 'number':
        sanitizedInput = Number(input);
        if (isNaN(sanitizedInput)) {
          throw new Error('Invalid number format');
        }
        break;
      case 'object':
        if (typeof input !== 'object' || Array.isArray(input)) {
          throw new Error('Input must be an object');
        }
        // Recursively sanitize object properties
        sanitizedInput = {};
        for (const [key, value] of Object.entries(input)) {
          const sanitizedKey = sanitizeInput(key);
          sanitizedInput[sanitizedKey] = typeof value === 'string' ? sanitizeInput(value) : value;
        }
        break;
      case 'array':
        if (!Array.isArray(input)) {
          throw new Error('Input must be an array');
        }
        sanitizedInput = input.map(item => 
          typeof item === 'string' ? sanitizeInput(item) : item
        );
        break;
    }
  }

  // Validate string length
  if (type === 'string' && typeof sanitizedInput === 'string') {
    if (minLength !== undefined && sanitizedInput.length < minLength) {
      throw new Error(`Input must be at least ${minLength} characters long`);
    }
    if (maxLength !== undefined && sanitizedInput.length > maxLength) {
      throw new Error(`Input must be no more than ${maxLength} characters long`);
    }
  }

  // Validate pattern
  if (pattern && typeof sanitizedInput === 'string' && !pattern.test(sanitizedInput)) {
    throw new Error('Input does not match required pattern');
  }

  // Validate allowed values
  if (allowedValues && !allowedValues.includes(sanitizedInput)) {
    throw new Error('Input is not an allowed value');
  }

  return sanitizedInput;
}

// Validate and sanitize multiple inputs
export function validateInputs(inputs: Record<string, any>, schema: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  const errors: string[] = [];

  for (const [key, options] of Object.entries(schema)) {
    try {
      result[key] = validateInput(inputs[key], options);
    } catch (error: any) {
      errors.push(`${key}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation errors: ${errors.join(', ')}`);
  }

  return result;
}

// Validate API request body
export function validateRequestBody(body: any, schema: Record<string, any>): any {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }

  return validateInputs(body, schema);
}

// Validate query parameters
export function validateQueryParams(query: any, schema: Record<string, any>): any {
  if (!query || typeof query !== 'object') {
    throw new Error('Query parameters must be an object');
  }

  return validateInputs(query, schema);
}

// Common validation schemas
export const commonSchemas = {
  feedback: {
    rating: {
      type: 'number' as const,
      required: true,
      allowedValues: [1, 2, 3, 4, 5]
    },
    comment: {
      type: 'string' as const,
      required: false,
      maxLength: 1000,
      sanitize: true
    },
    category: {
      type: 'string' as const,
      required: true,
      allowedValues: ['service', 'staff', 'facilities', 'wait_time', 'overall']
    },
    anonymous: {
      type: 'string' as const,
      required: false,
      allowedValues: ['true', 'false']
    }
  },
  patient: {
    name: {
      type: 'string' as const,
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true
    },
    email: {
      type: 'email' as const,
      required: false,
      maxLength: 255,
      sanitize: true
    },
    phone: {
      type: 'phone' as const,
      required: false,
      sanitize: true
    },
    medicalRecordNumber: {
      type: 'string' as const,
      required: false,
      maxLength: 20,
      pattern: /^[A-Z0-9-]+$/i,
      sanitize: true
    },
    dateOfBirth: {
      type: 'string' as const,
      required: false,
      pattern: /^\d{4}-\d{2}-\d{2}$/
    }
  },
  user: {
    username: {
      type: 'string' as const,
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: true
    },
    email: {
      type: 'email' as const,
      required: true,
      maxLength: 255,
      sanitize: true
    },
    password: {
      type: 'string' as const,
      required: true,
      minLength: 8,
      maxLength: 128
    },
    role: {
      type: 'string' as const,
      required: true,
      allowedValues: ['admin', 'staff', 'viewer']
    }
  },
  pagination: {
    page: {
      type: 'number' as const,
      required: false,
      allowedValues: Array.from({ length: 1000 }, (_, i) => i + 1) // 1-1000
    },
    limit: {
      type: 'number' as const,
      required: false,
      allowedValues: [10, 25, 50, 100]
    },
    sortBy: {
      type: 'string' as const,
      required: false,
      allowedValues: ['createdAt', 'updatedAt', 'rating', 'category']
    },
    sortOrder: {
      type: 'string' as const,
      required: false,
      allowedValues: ['asc', 'desc']
    }
  }
};

// Utility function to create custom validation middleware
export function createValidationMiddleware(schema: Record<string, any>) {
  return (req: any, res: any, next: any) => {
    try {
      req.validatedBody = validateRequestBody(req.body, schema);
      next();
    } catch (error: any) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }
  };
}

export default validateInput;