import mongoose from 'mongoose';
import { connectToDatabase } from './connection';

/**
 * Database error types for better error handling
 */
export enum DatabaseErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_KEY_ERROR = 'DUPLICATE_KEY_ERROR',
  CAST_ERROR = 'CAST_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Custom database error class
 */
export class DatabaseError extends Error {
  public type: DatabaseErrorType;
  public originalError?: Error;
  public field?: string;

  constructor(
    message: string, 
    type: DatabaseErrorType, 
    originalError?: Error, 
    field?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.type = type;
    this.originalError = originalError;
    this.field = field;
  }
}

/**
 * Parse MongoDB errors into standardized DatabaseError
 */
export function parseDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  // Type guard for error objects
  const isErrorWithCode = (err: unknown): err is { code: number; keyPattern?: Record<string, unknown> } => {
    return typeof err === 'object' && err !== null && 'code' in err;
  };

  const isErrorWithName = (err: unknown): err is { name: string; message?: string; path?: string } => {
    return typeof err === 'object' && err !== null && 'name' in err;
  };

  const isValidationError = (err: unknown): err is { name: string; errors: Record<string, { message?: string; path?: string }> } => {
    return typeof err === 'object' && err !== null && 'name' in err && 'errors' in err;
  };

  // MongoDB duplicate key error
  if (isErrorWithCode(error) && error.code === 11000) {
    const field = error.keyPattern ? Object.keys(error.keyPattern)[0] || 'unknown' : 'unknown';
    return new DatabaseError(
      `Duplicate value for field: ${field}`,
      DatabaseErrorType.DUPLICATE_KEY_ERROR,
      error as unknown as Error,
      field
    );
  }

  // Mongoose validation error
  if (isValidationError(error) && error.name === 'ValidationError') {
    const firstError = Object.values(error.errors)[0];
    return new DatabaseError(
      firstError?.message || 'Validation failed',
      DatabaseErrorType.VALIDATION_ERROR,
      error as unknown as Error,
      firstError?.path
    );
  }

  // Mongoose cast error
  if (isErrorWithName(error) && error.name === 'CastError') {
    return new DatabaseError(
      `Invalid value for field: ${error.path || 'unknown'}`,
      DatabaseErrorType.CAST_ERROR,
      error as Error,
      error.path
    );
  }

  // Document not found error
  if (isErrorWithName(error) && error.name === 'DocumentNotFoundError') {
    return new DatabaseError(
      'Document not found',
      DatabaseErrorType.NOT_FOUND_ERROR,
      error as Error
    );
  }

  // Connection errors
  if (isErrorWithName(error) && (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError')) {
    return new DatabaseError(
      'Database connection error',
      DatabaseErrorType.CONNECTION_ERROR,
      error as Error
    );
  }

  // Default unknown error
  const message = isErrorWithName(error) && error.message ? error.message : 'Unknown database error';
  return new DatabaseError(
    message,
    DatabaseErrorType.UNKNOWN_ERROR,
    error as Error
  );
}

/**
 * Wrapper for database operations with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    await connectToDatabase();
    return await operation();
  } catch (error) {
    throw parseDatabaseError(error);
  }
}

/**
 * Validate ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Convert string to ObjectId with validation
 */
export function toObjectId(id: string): mongoose.Types.ObjectId {
  if (!isValidObjectId(id)) {
    throw new DatabaseError(
      `Invalid ObjectId format: ${id}`,
      DatabaseErrorType.CAST_ERROR,
      undefined,
      'id'
    );
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Sanitize query parameters to prevent NoSQL injection
 */
export function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) {
      // Remove any MongoDB operators from user input
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Skip objects that might contain MongoDB operators
        continue;
      }
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Create database indexes for all models
 */
export async function createDatabaseIndexes(): Promise<void> {
  try {
    await connectToDatabase();
    
    // Ensure database connection exists
    if (!mongoose.connection.db) {
      throw new DatabaseError(
        'Database connection not established',
        DatabaseErrorType.CONNECTION_ERROR
      );
    }
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Creating indexes for collection: ${collectionName}`);
      
      // Create indexes based on collection name
      switch (collectionName) {
        case 'patients':
          await mongoose.connection.db!.collection(collectionName).createIndexes([
            { key: { mobileNumber: 1 }, unique: true },
            { key: { createdAt: -1 } },
            { key: { name: 1 } }
          ]);
          break;
          
        case 'questions':
          await mongoose.connection.db!.collection(collectionName).createIndexes([
            { key: { orderIndex: 1, isActive: 1 } },
            { key: { type: 1 } },
            { key: { createdAt: -1 } }
          ]);
          break;
          
        case 'feedbackSessions':
          await mongoose.connection.db!.collection(collectionName).createIndexes([
            { key: { patientId: 1, consultationNumber: 1 } },
            { key: { mobileNumber: 1, createdAt: -1 } },
            { key: { submittedAt: -1 } },
            { key: { isSynced: 1 } }
          ]);
          break;
          
        case 'adminUsers':
          await mongoose.connection.db!.collection(collectionName).createIndexes([
            { key: { email: 1 }, unique: true },
            { key: { isActive: 1 } }
          ]);
          break;
          
        case 'questionTemplates':
          await mongoose.connection.db!.collection(collectionName).createIndexes([
            { key: { department: 1, consultationType: 1 } },
            { key: { isDefault: 1 } },
            { key: { createdAt: -1 } }
          ]);
          break;
          
        case 'consultationRules':
          await mongoose.connection.db!.collection(collectionName).createIndexes([
            { key: { department: 1 }, unique: true },
            { key: { 'rules.consultationNumber': 1 } }
          ]);
          break;
      }
    }
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
    throw parseDatabaseError(error);
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  readyState: number;
  host?: string;
  name?: string;
}> {
  try {
    const connection = await connectToDatabase();
    
    return {
      connected: connection.connection.readyState === 1,
      readyState: connection.connection.readyState,
      host: connection.connection.host,
      name: connection.connection.name
    };
  } catch {
    return {
      connected: false,
      readyState: 0
    };
  }
}

/**
 * Close database connection (useful for testing)
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}