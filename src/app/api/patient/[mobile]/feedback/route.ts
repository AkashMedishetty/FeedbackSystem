import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { FeedbackSession } from '@/models/FeedbackSession';
import { Patient } from '@/models/Patient';
import { sanitizeMobileNumber } from '@/lib/utils';

interface RouteParams {
  params: Promise<{
    mobile: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await connectToDatabase();
    
    const { mobile } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!mobile) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            message: 'Mobile number is required'
          }
        },
        { status: 400 }
      );
    }

    const sanitizedMobile = sanitizeMobileNumber(decodeURIComponent(mobile));
    // Verify patient exists
    const patient = await Patient.findOne({ mobileNumber: sanitizedMobile });
    if (!patient) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Patient not found'
        }
      }, { status: 404 });
    }

    // Get feedback sessions for this patient
    const sessions = await FeedbackSession.find({ 
      patientId: patient._id 
    })
      .sort({ consultationNumber: 1, submittedAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await FeedbackSession.countDocuments({ 
      patientId: patient._id 
    });

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          id: patient._id,
          name: patient.name,
          mobileNumber: patient.mobileNumber,
          createdAt: patient.createdAt
        },
        sessions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching patient feedback history:', error);
    return NextResponse.json(
      { 
        success: false,
        error: {
          message: 'Internal server error'
        }
      },
      { status: 500 }
    );
  }
}