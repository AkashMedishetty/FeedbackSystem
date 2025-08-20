import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';
import { connectDB } from '@/lib/db/connection';
import Patient from '@/lib/db/models/Patient';
import FeedbackSession from '@/lib/db/models/FeedbackSession';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions) as Session | null;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const mobileNumber = searchParams.get('mobileNumber');

    if (!patientId && !mobileNumber) {
      return NextResponse.json(
        { error: 'Either patientId or mobileNumber is required' },
        { status: 400 }
      );
    }

    // Find patient
    let patient;
    if (patientId) {
      patient = await Patient.findById(patientId);
    } else {
      patient = await Patient.findOne({ mobileNumber });
    }

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get all feedback sessions for this patient, sorted by consultation number (descending)
    const feedbackSessions = await FeedbackSession.find({
      patientId: patient._id.toString()
    })
    .sort({ consultationNumber: -1, submittedAt: -1 })
    .lean();

    // Format the response
    const patientHistory = {
      _id: patient._id,
      name: patient.name,
      mobileNumber: patient.mobileNumber,
      age: patient.age,
      gender: patient.gender,
      consultations: feedbackSessions.map(session => ({
        _id: session._id,
        consultationNumber: session.consultationNumber,
        consultationDate: session.consultationDate,
        submittedAt: session.submittedAt,
        questionnaireType: session.questionnaireType,
        responses: session.responses.map((response: any) => ({
          questionId: response.questionId,
          questionTitle: response.questionTitle,
          questionType: response.questionType,
          responseText: response.responseText,
          responseNumber: response.responseNumber,
          createdAt: response.createdAt
        }))
      }))
    };

    return NextResponse.json(patientHistory);
  } catch (error) {
    console.error('Error fetching patient history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}