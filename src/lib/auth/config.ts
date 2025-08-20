import NextAuth from 'next-auth/next'
import { authOptions } from './options';

// Export authOptions for use in other files
export { authOptions };

// Create the route handler and export only GET and POST
const handler = NextAuth(authOptions);
export const GET = handler;
export const POST = handler;