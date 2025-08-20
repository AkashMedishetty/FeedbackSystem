import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import FeedbackSession from '@/lib/db/models/FeedbackSession';
import { ApiResponse } from '@/types';

interface DuplicateCheckRequest {
  mobileNumber: string;
  consultationNumber: number;
  submittedAt: string;
}

interface DuplicateCheckResponse {
  isDuplicate: boolean;
  existingId?: string;
  existingSubmittedAt?: string;
  timeDifference?: number; // in milliseconds
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: DuplicateCheckRequest = await request.json();
    const { mobileNumber, consultationNumber, submittedAt } = body;

    if (!mobileNumber || !consultationNumber || !submittedAt) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: mobileNumber, consultationNumber, submittedAt'
        }
      } as ApiResponse, { status: 400 });
    }

    const submittedDate = new Date(submittedAt);
    
    // Define duplicate detection window (e.g., within 1 hour)
    const duplicateWindow = 60 * 60 * 1000; // 1 hour in milliseconds
    const windowStart = new Date(submittedDate.getTime() - duplicateWindow);
    const windowEnd = new Date(submittedDate.getTime() + duplicateWindow);

    // Look for existing feedback sessions within the time window
    const existingSession = await FeedbackSession.findOne({
      mobileNumber,
      consultationNumber,
      submittedAt: {
        $gte: windowStart,
        $lte: windowEnd
      }
    }).sort({ submittedAt: -1 }); // Get the most recent one

    if (existingSession) {
      const timeDifference = Math.abs(
        submittedDate.getTime() - existingSession.submittedAt.getTime()
      );

      // Consider it a duplicate if within 30 minutes and same consultation
      const isDuplicate = timeDifference < (30 * 60 * 1000); // 30 minutes

      return NextResponse.json({
        success: true,
        data: {
          isDuplicate,
          existingId: existingSession._id.toString(),
          existingSubmittedAt: existingSession.submittedAt.toISOString(),
          timeDifference
        } as DuplicateCheckResponse
      } as ApiResponse<DuplicateCheckResponse>);
    }

    // No duplicate found
    return NextResponse.json({
      success: true,
      data: {
        isDuplicate: false
      } as DuplicateCheckResponse
    } as ApiResponse<DuplicateCheckResponse>);

  } catch (error) {
    console.error('Error checking for duplicate feedback:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check for duplicate feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as ApiResponse, { status: 500 });
  }
}