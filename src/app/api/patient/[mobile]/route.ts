import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/models/Patient';
import { FeedbackSession } from '@/models/FeedbackSession';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mobile: string }> }
) {
  try {
    await connectToDatabase();
    
    const { mobile } = await params;
    
    // Validate mobile number format
    const mobileRegex = /^[0-9]{8,15}$/;
    if (!mobile || !mobileRegex.test(mobile)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid mobile number format. Please provide a valid mobile number.' 
          } 
        },
        { status: 400 }
      );
    }

    // Find patient
    const patient = await Patient.findOne({ mobileNumber: mobile });
    if (!patient) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Patient not found' 
          } 
        },
        { status: 404 }
      );
    }

    // Get patient's feedback history
    const feedbackHistory = await FeedbackSession.find({ 
      patientId: patient._id 
    })
    .sort({ createdAt: -1 })
    .populate('patientId', 'name mobileNumber')
    .lean();

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          id: patient._id,
          name: patient.name,
          mobileNumber: patient.mobileNumber,
          department: patient.department,
          createdAt: patient.createdAt
        },
        history: feedbackHistory.map(session => ({
          id: session._id,
          consultationNumber: session.consultationNumber,
          department: session.department,
          questionnaireType: session.questionnaireType,
          responses: session.responses,
          overallRating: session.overallRating,
          status: session.status,
          createdAt: session.createdAt,
          completedAt: session.completedAt
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching patient history:', error);
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

export async function POST() {
  return NextResponse.json(
    { 
      success: false, 
      error: { 
        message: 'Method not allowed' 
      } 
    },
    { status: 405 }
  );
}