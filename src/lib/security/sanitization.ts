import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - Raw HTML string
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined') {
    // Server-side fallback - basic sanitization
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  });
};

/**
 * Sanitizes user input to prevent injection attacks
 * @param input - User input string
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>"'&]/g, (match) => {
      const entityMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entityMap[match];
    })
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
};

/**
 * Validates and sanitizes email addresses
 * @param email - Email string to validate
 * @returns Sanitized email or null if invalid
 */
export const sanitizeEmail = (email: string): string | null => {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
};

/**
 * Validates and sanitizes phone numbers
 * @param phone - Phone number string
 * @returns Sanitized phone number or null if invalid
 */
export const sanitizePhone = (phone: string): string | null => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return null;
  }
  
  return digitsOnly;
};

/**
 * Sanitizes medical record numbers
 * @param mrn - Medical record number
 * @returns Sanitized MRN or null if invalid
 */
export const sanitizeMRN = (mrn: string): string | null => {
  if (!mrn || typeof mrn !== 'string') {
    return null;
  }
  
  // Allow only alphanumeric characters and hyphens
  const sanitized = mrn.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  
  // Check length (typically 6-20 characters)
  if (sanitized.length < 6 || sanitized.length > 20) {
    return null;
  }
  
  return sanitized;
};

/**
 * Sanitizes feedback text content
 * @param feedback - Feedback text
 * @returns Sanitized feedback text
 */
export const sanitizeFeedback = (feedback: string): string => {
  if (!feedback || typeof feedback !== 'string') {
    return '';
  }
  
  // Basic sanitization while preserving readability
  return feedback
    .trim()
    .replace(/[<>]/g, (match) => match === '<' ? '&lt;' : '&gt;')
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .substring(0, 5000); // Limit length
};

/**
 * Validates and sanitizes rating values
 * @param rating - Rating value
 * @returns Valid rating (1-5) or null
 */
export const sanitizeRating = (rating: any): number | null => {
  const num = parseInt(rating, 10);
  
  if (isNaN(num) || num < 1 || num > 5) {
    return null;
  }
  
  return num;
};

/**
 * Sanitizes file names for safe storage
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }
  
  return filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};

/**
 * Comprehensive sanitization for patient data
 * @param data - Patient data object
 * @returns Sanitized patient data
 */
export const sanitizePatientData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const sanitized: any = {};
  
  // Sanitize each field based on its type
  if (data.name) {
    sanitized.name = sanitizeInput(data.name);
  }
  
  if (data.email) {
    sanitized.email = sanitizeEmail(data.email);
  }
  
  if (data.phone) {
    sanitized.phone = sanitizePhone(data.phone);
  }
  
  if (data.medicalRecordNumber) {
    sanitized.medicalRecordNumber = sanitizeMRN(data.medicalRecordNumber);
  }
  
  if (data.dateOfBirth) {
    const date = new Date(data.dateOfBirth);
    if (!isNaN(date.getTime())) {
      sanitized.dateOfBirth = date.toISOString().split('T')[0];
    }
  }
  
  if (data.address) {
    sanitized.address = sanitizeInput(data.address);
  }
  
  return sanitized;
};

/**
 * Comprehensive sanitization for feedback data
 * @param data - Feedback data object
 * @returns Sanitized feedback data
 */
export const sanitizeFeedbackData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const sanitized: any = {};
  
  if (data.rating) {
    sanitized.rating = sanitizeRating(data.rating);
  }
  
  if (data.feedback) {
    sanitized.feedback = sanitizeFeedback(data.feedback);
  }
  
  if (data.category) {
    sanitized.category = sanitizeInput(data.category);
  }
  
  if (data.department) {
    sanitized.department = sanitizeInput(data.department);
  }
  
  if (data.anonymous !== undefined) {
    sanitized.anonymous = Boolean(data.anonymous);
  }
  
  // Sanitize patient data if present
  if (data.patient) {
    sanitized.patient = sanitizePatientData(data.patient);
  }
  
  return sanitized;
};