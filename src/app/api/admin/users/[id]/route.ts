import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { updateAdminUser, deactivateAdminUser } from '@/lib/auth/admin';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
});

export const PUT = withAuth(async (request: NextRequest, context: { params: Promise<Record<string, unknown>> }) => {
  try {
    const { id } = await context.params as { id: string };
    const body = await request.json();
    const updates = updateUserSchema.parse(body);
    
    const user = await updateAdminUser(id, updates);
    
    return NextResponse.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid input data',
            details: error.issues 
          } 
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'USER_NOT_FOUND', 
            message: 'User not found' 
          } 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'UPDATE_ERROR', 
          message: 'Failed to update admin user' 
        } 
      },
      { status: 500 }
    );
  }
}, { requiredRoles: ['admin'] });

export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<Record<string, unknown>> }) => {
  try {
    const { id } = await context.params as { id: string };
    
    // Self-deletion prevention would require session context from withAuth
    
    const user = await deactivateAdminUser(id);
    
    return NextResponse.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error deactivating admin user:', error);
    
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'USER_NOT_FOUND', 
            message: 'User not found' 
          } 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'DELETE_ERROR', 
          message: 'Failed to deactivate admin user' 
        } 
      },
      { status: 500 }
    );
  }
}, { requiredRoles: ['admin'] });