import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/models/Patient';

interface PatientRegistrationData {
  name: string;
  mobileNumber: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { name, mobileNumber, dateOfBirth, gender }: PatientRegistrationData = await request.json();

    // Validate required fields
    if (!name || !mobileNumber || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: 'Name, mobile number, date of birth, and gender are required' },
        { status: 400 }
      );
    }

    // Validate gender
    if (!['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json(
        { error: 'Gender must be male, female, or other' },
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

    // Validate name
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
      return NextResponse.json(
        { error: 'Name can only contain letters, spaces, hyphens, and apostrophes' },
        { status: 400 }
      );
    }

    // Validate date of birth
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date of birth' },
        { status: 400 }
      );
    }

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 0 || age > 120) {
      return NextResponse.json(
        { error: 'Please enter a valid date of birth' },
        { status: 400 }
      );
    }

    // Check if patient already exists
    const existingPatient = await Patient.findOne({ mobileNumber: cleanedNumber });
    
    if (existingPatient) {
      return NextResponse.json(
        { error: 'A patient with this mobile number already exists' },
        { status: 409 }
      );
    }

    // Create new patient
    const newPatient = new Patient({
      name: name.trim(),
      mobileNumber: cleanedNumber,
      dateOfBirth: birthDate,
      age: age,
      gender: gender,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedPatient = await newPatient.save();

    return NextResponse.json({
      success: true,
      patient: {
        id: savedPatient._id,
        name: savedPatient.name,
        mobileNumber: savedPatient.mobileNumber,
        dateOfBirth: savedPatient.dateOfBirth,
        gender: savedPatient.gender,
        createdAt: savedPatient.createdAt,
      },
      consultationNumber: 1, // First consultation for new patient
    });
  } catch (error) {
    console.error('Error registering patient:', error);
    return NextResponse.json(
      { error: 'Failed to register patient' },
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