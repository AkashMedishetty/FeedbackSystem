import CryptoJS from 'crypto-js';

// Environment variables for encryption keys
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts sensitive data using AES encryption
 * @param data - The data to encrypt
 * @returns Encrypted string with IV prepended
 */
export const encryptData = (data: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts data that was encrypted with encryptData
 * @param encryptedData - The encrypted data string
 * @returns Decrypted original data
 */
export const decryptData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Encrypts sensitive patient data before storage
 * @param patientData - Patient data object
 * @returns Encrypted patient data
 */
export const encryptPatientData = (patientData: any): any => {
  const sensitiveFields = ['name', 'email', 'phone', 'address', 'medicalRecordNumber'];
  const encrypted = { ...patientData };
  
  sensitiveFields.forEach(field => {
    if (encrypted[field]) {
      encrypted[field] = encryptData(encrypted[field]);
    }
  });
  
  return encrypted;
};

/**
 * Decrypts sensitive patient data after retrieval
 * @param encryptedPatientData - Encrypted patient data object
 * @returns Decrypted patient data
 */
export const decryptPatientData = (encryptedPatientData: any): any => {
  const sensitiveFields = ['name', 'email', 'phone', 'address', 'medicalRecordNumber'];
  const decrypted = { ...encryptedPatientData };
  
  sensitiveFields.forEach(field => {
    if (decrypted[field]) {
      try {
        decrypted[field] = decryptData(decrypted[field]);
      } catch (error) {
        console.warn(`Failed to decrypt field ${field}:`, error);
        // Keep original value if decryption fails (might not be encrypted)
      }
    }
  });
  
  return decrypted;
};

/**
 * Generates a secure hash for data integrity verification
 * @param data - Data to hash
 * @returns SHA-256 hash
 */
export const generateHash = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

/**
 * Verifies data integrity using hash comparison
 * @param data - Original data
 * @param hash - Expected hash
 * @returns True if data matches hash
 */
export const verifyHash = (data: string, hash: string): boolean => {
  const computedHash = generateHash(data);
  return computedHash === hash;
};

/**
 * Generates a secure random token
 * @param length - Token length (default: 32)
 * @returns Random token string
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Masks sensitive data for logging/display purposes
 * @param data - Data to mask
 * @param visibleChars - Number of characters to show at start/end
 * @returns Masked string
 */
export const maskSensitiveData = (data: string, visibleChars: number = 2): string => {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(data?.length || 0);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = '*'.repeat(data.length - visibleChars * 2);
  
  return `${start}${middle}${end}`;
};