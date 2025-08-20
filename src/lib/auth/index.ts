import { getServerSession as nextAuthGetServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from './options';
import bcrypt from 'bcryptjs';

export { authOptions } from './options';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function getServerSession(): Promise<AuthSession | null> {
  const session = await nextAuthGetServerSession(authOptions);
  return session as AuthSession | null;
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getServerSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  return session;
}

export async function requireRole(roles: string | string[]): Promise<AuthSession> {
  const session = await requireAuth();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }
  
  return session;
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createAuthResponse(error: string, status: number = 401) {
  return NextResponse.json(
    { 
      success: false, 
      error: { 
        code: 'AUTH_ERROR', 
        message: error 
      } 
    },
    { status }
  );
}

export async function withAuth(
  handler: (request: NextRequest, session: AuthSession) => Promise<NextResponse>,
  requiredRoles?: string | string[]
) {
  return async (request: NextRequest) => {
    try {
      const session = requiredRoles 
        ? await requireRole(requiredRoles)
        : await requireAuth();
      
      return handler(request, session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return createAuthResponse(message);
    }
  };
}