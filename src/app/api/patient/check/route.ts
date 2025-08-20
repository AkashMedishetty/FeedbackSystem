import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/models/Patient';
import { FeedbackSession } from '@/models/FeedbackSession';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { mobileNumber } = await request.json();

    if (!mobileNumber) {
      return NextResponse.json(
        { error: 'Mobile number is required' },
        { status: 400 }
      );
    }

    // Validate mobile number format (8-15 digits)
    const cleanedNumber = mobileNumber.replace(/\D/g, '');
    if (cleanedNumber.length < 8 || cleanedNumber.length > 15) {
      return NextResponse.json(
        { error: 'Invalid mobile number format' },
        { status: 400 }
      );
    }
    // Check if patient exists
    const existingPatient = await Patient.findOne({ mobileNumber: cleanedNumber });

    if (!existingPatient) {
      // New patient
      return NextResponse.json({
        exists: false,
        isNewPatient: true,
        consultationNumber: 1,
        patient: null,
      });
    }

    // Get consultation count from feedback sessions
    const feedbackCount = await FeedbackSession.countDocuments({
      patientId: existingPatient._id,
    });

    const consultationNumber = feedbackCount + 1;

    // Check if feedback already exists for this consultation
    const existingFeedback = await FeedbackSession.findOne({
      patientId: existingPatient._id,
      consultationNumber
    });

    if (existingFeedback) {
      // Feedback already submitted for this consultation
      return NextResponse.json({
        exists: true,
        isNewPatient: false,
        consultationNumber,
        feedbackCompleted: true,
        completedAt: existingFeedback.submittedAt,
        patient: {
          id: existingPatient._id,
          name: existingPatient.name,
          mobileNumber: existingPatient.mobileNumber,
          dateOfBirth: existingPatient.dateOfBirth,
          gender: existingPatient.gender,
          createdAt: existingPatient.createdAt,
        },
      });
    }

    return NextResponse.json({
      exists: true,
      isNewPatient: false,
      consultationNumber,
      feedbackCompleted: false,
      patient: {
        id: existingPatient._id,
        name: existingPatient.name,
        mobileNumber: existingPatient.mobileNumber,
        dateOfBirth: existingPatient.dateOfBirth,
        gender: existingPatient.gender,
        createdAt: existingPatient.createdAt,
      },
    });
  } catch (error) {
    console.error('Error checking patient:', error);
    return NextResponse.json(
      { error: 'Failed to check patient information' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}