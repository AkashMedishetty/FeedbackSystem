import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, createAuthResponse } from './index';

// Auth middleware type removed to avoid Next.js type conflicts

export function withAuth(
  handler: (request: NextRequest, context: { params: Promise<Record<string, unknown>> }) => Promise<NextResponse>,
  options?: {
    requiredRoles?: string | string[];
    requireAuth?: boolean;
  }
) {
  return async (request: NextRequest, context: { params: Promise<Record<string, unknown>> }) => {
    try {
      const { requiredRoles, requireAuth: needsAuth = true } = options || {};

      if (!needsAuth) {
        return handler(request, context);
      }

      let session;
      if (requiredRoles) {
        session = await requireRole(requiredRoles);
      } else {
        session = await requireAuth();
      }

      // Add session to context for handlers that need it
      const contextWithSession = {
        ...context,
        params: context.params,
        session: session as unknown as Record<string, unknown>
      };

      return handler(request, contextWithSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return createAuthResponse(message);
    }
  };
}

export function requireAdminRole() {
  return withAuth(async () => {
    // This is a placeholder that will be used by actual handlers
    return NextResponse.next();
  }, { requiredRoles: ['admin'] });
}

export function requireManagerRole() {
  return withAuth(async () => {
    // This is a placeholder that will be used by actual handlers
    return NextResponse.next();
  }, { requiredRoles: ['admin', 'manager'] });
}

export function requireViewerRole() {
  return withAuth(async () => {
    // This is a placeholder that will be used by actual handlers
    return NextResponse.next();
  }, { requiredRoles: ['admin', 'manager', 'viewer'] });
}

// Utility function to check permissions for specific actions
export function hasPermission(userRole: string, action: string): boolean {
  const permissions = {
    admin: [
      'create_questions',
      'edit_questions',
      'delete_questions',
      'view_feedback',
      'export_data',
      'manage_users',
      'manage_settings',
      'manage_templates',
      'manage_consultation_rules'
    ],
    manager: [
      'create_questions',
      'edit_questions',
      'view_feedback',
      'export_data',
      'manage_templates',
      'manage_consultation_rules'
    ],
    viewer: [
      'view_feedback'
    ]
  };

  return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
}

// Middleware for API routes that need specific permissions
export function requirePermission(action: string) {
  return withAuth(async (request, context) => {
    const contextWithSession = context as typeof context & { session?: { user: { role: string } } };
    const session = contextWithSession.session;
    if (!session || !hasPermission(session.user.role, action)) {
      return createAuthResponse('Insufficient permissions for this action', 403);
    }
    return NextResponse.next();
  });
}