import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { FeedbackSession } from '@/models/FeedbackSession';
import { Patient } from '@/models/Patient';
import { sanitizeInput } from '@/lib/utils';


export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { patientId, mobileNumber, consultationNumber, responses, department } = body;

    // Basic validation
    if (!patientId || !mobileNumber || !consultationNumber || !responses) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            message: 'Missing required fields: patientId, mobileNumber, consultationNumber, responses'
          }
        },
        { status: 400 }
      );
    }

    // Validate mobile number format
    const mobileRegex = /^[0-9]{8,15}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            message: 'Invalid mobile number format'
          }
        },
        { status: 400 }
      );
    }
    // Verify patient exists
    const patient = await Patient.findById(patientId);
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

    // Verify mobile number matches
    if (patient.mobileNumber !== mobileNumber) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            message: 'Mobile number does not match patient record'
          }
        },
        { status: 400 }
      );
    }

    // Check if feedback already exists for this consultation
    const existingFeedback = await FeedbackSession.findOne({
      patientId,
      consultationNumber
    });

    if (existingFeedback) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            message: 'Feedback has already been submitted for this consultation'
          }
        },
        { status: 409 }
      );
    }

    // Sanitize and validate responses
    const sanitizedResponses = responses.map((response: any) => ({
      questionId: response.questionId,
      questionTitle: response.questionTitle ? sanitizeInput(response.questionTitle) : '',
      questionType: response.questionType,
      responseText: response.responseText ? sanitizeInput(response.responseText) : undefined,
      responseNumber: response.responseNumber,
      createdAt: new Date()
    }));

    // Determine questionnaire type based on consultation number
    let questionnaireType = 'regular';
    if (consultationNumber === 1) {
      questionnaireType = 'first-visit';
    } else if (consultationNumber === 2) {
      questionnaireType = 'follow-up';
    }

    // Calculate overall rating from responses
    const ratingResponses = sanitizedResponses.filter((r: any) => 
      r.questionType === 'rating' && typeof r.responseNumber === 'number'
    );
    const overallRating = ratingResponses.length > 0 
      ? ratingResponses.reduce((sum: number, r: any) => sum + r.responseNumber, 0) / ratingResponses.length
      : null;

    // Create feedback session
    const feedbackSession = new FeedbackSession({
      patientId,
      mobileNumber,
      consultationNumber,
      department: department || patient.department,
      questionnaireType,
      responses: sanitizedResponses,
      overallRating,
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    });

    const savedSession = await feedbackSession.save();

    return NextResponse.json({
      success: true,
      data: {
        sessionId: savedSession._id,
        consultationNumber: savedSession.consultationNumber,
        submittedAt: savedSession.completedAt,
        responseCount: savedSession.responses.length
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
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

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const mobileNumber = searchParams.get('mobileNumber');
    const consultationNumber = searchParams.get('consultationNumber');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    const query: Record<string, unknown> = {};
    
    if (mobileNumber) {
      // Find patient first to get patientId
      const patient = await Patient.findOne({ mobileNumber });
      if (patient) {
        query.patientId = patient._id;
      } else {
        // No patient found, return empty results
        return NextResponse.json({
          success: true,
          data: {
            sessions: [],
            pagination: {
              total: 0,
              limit,
              offset,
              hasMore: false
            }
          }
        });
      }
    }
    
    if (consultationNumber) {
      query.consultationNumber = parseInt(consultationNumber);
    }

    // Get feedback sessions with pagination
    const sessions = await FeedbackSession.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .populate('patientId', 'name mobileNumber')
      .lean();

    const total = await FeedbackSession.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
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
    console.error('Error fetching feedback:', error);
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