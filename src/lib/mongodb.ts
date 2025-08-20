import { connectToDatabase as connectDB } from './db/connection';

/**
 * Simple wrapper for database connection
 */
export async function connectToDatabase() {
  return await connectDB();
}

// Re-export connection functions for compatibility
export { connectToDatabase as connectDB, connectToDatabase as connectMongoDB } from './db/connection';