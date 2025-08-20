import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NOT_AUTHENTICATED', 
            message: 'No active session' 
          } 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: session.user,
        authenticated: true
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An error occurred while checking session' 
        } 
      },
      { status: 500 }
    );
  }
}