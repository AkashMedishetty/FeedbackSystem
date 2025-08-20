import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Authentication API - use /api/auth/session, /api/auth/login, or /api/auth/logout' 
  });
}