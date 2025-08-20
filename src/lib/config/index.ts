// Environment configuration
export const config = {
  database: {
    uri: process.env.MONGODB_URI!,
    name: process.env.MONGODB_DB_NAME || 'patient-feedback',
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  redis: {
    url: process.env.KV_URL,
    restApiUrl: process.env.KV_REST_API_URL,
    restApiToken: process.env.KV_REST_API_TOKEN,
  },
  blob: {
    token: process.env.BLOB_READ_WRITE_TOKEN,
  },
  app: {
    env: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
  },
};

// Validate required environment variables
export function validateConfig() {
  const required = [
    'MONGODB_URI',
    'NEXTAUTH_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default config;