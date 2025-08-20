import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { HospitalSettings } from '@/models/HospitalSettings';

// GET - Fetch branding settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    let settings = await HospitalSettings.findOne();
    
    // If no settings exist, create default ones
    if (!settings) {
      settings = new HospitalSettings({
        hospitalName: '',
        primaryColor: '#3B82F6',
        secondaryColor: '#1F2937',
        accentColor: '#10B981',
        welcomeMessage: 'Welcome! Please share your feedback.',
        thankYouMessage: 'Thank you for your valuable feedback!',
        theme: 'light',
        language: 'en',
        sessionTimeout: 5
      });
      await settings.save();
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branding settings' },
      { status: 500 }
    );
  }
}

// POST - Save branding settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.hospitalName?.trim()) {
      return NextResponse.json(
        { error: 'Hospital name is required' },
        { status: 400 }
      );
    }

    // Validate color formats
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(body.primaryColor) || 
        !colorRegex.test(body.secondaryColor) || 
        !colorRegex.test(body.accentColor)) {
      return NextResponse.json(
        { error: 'Invalid color format. Please use hex colors (e.g., #3B82F6)' },
        { status: 400 }
      );
    }

    // Validate session timeout
    if (body.sessionTimeout < 1 || body.sessionTimeout > 60) {
      return NextResponse.json(
        { error: 'Session timeout must be between 1 and 60 minutes' },
        { status: 400 }
      );
    }

    // Validate message lengths
    if (body.welcomeMessage?.length > 500 || body.thankYouMessage?.length > 500) {
      return NextResponse.json(
        { error: 'Messages must be 500 characters or less' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Update or create settings
    const settings = await HospitalSettings.findOneAndUpdate(
      {},
      {
        hospitalName: body.hospitalName.trim(),
        logo: body.logo,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        accentColor: body.accentColor,
        welcomeMessage: body.welcomeMessage || 'Welcome! Please share your feedback.',
        thankYouMessage: body.thankYouMessage || 'Thank you for your valuable feedback!',
        contactInfo: body.contactInfo?.trim(),
        theme: body.theme || 'light',
        language: body.language || 'en',
        sessionTimeout: body.sessionTimeout || 5,
        updatedAt: new Date()
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error saving branding settings:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error: ' + error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save branding settings' },
      { status: 500 }
    );
  }
}