import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NOT_AUTHENTICATED', 
            message: 'No active session found' 
          } 
        },
        { status: 401 }
      );
    }

    // NextAuth handles session cleanup automatically
    // This endpoint is mainly for client-side logout confirmation
    return NextResponse.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An error occurred during logout' 
        } 
      },
      { status: 500 }
    );
  }
}