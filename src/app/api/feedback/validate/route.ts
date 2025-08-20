import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { FeedbackSession } from '@/models/FeedbackSession';
import { Patient } from '@/models/Patient';
import { z } from 'zod';

const ValidateSubmissionSchema = z.object({
    patientId: z.string(),
    mobileNumber: z.string(),
    consultationNumber: z.number().min(1)
});

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();
        
        const body = await request.json();

        // Validate request body
        const validationResult = ValidateSubmissionSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid validation request data',
                        details: validationResult.error.issues
                    }
                },
                { status: 400 }
            );
        }

        const { patientId, mobileNumber, consultationNumber } = validationResult.data;
        // Verify patient exists
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return NextResponse.json({
                success: false,
                canSubmit: false,
                error: {
                    message: 'Patient not found'
                }
            }, { status: 404 });
        }

        // Verify mobile number matches
        if (patient.mobileNumber !== mobileNumber) {
            return NextResponse.json({
                success: false,
                canSubmit: false,
                error: {
                    message: 'Mobile number does not match patient record'
                }
            }, { status: 400 });
        }

        // Check if feedback already exists for this consultation
        const existingFeedback = await FeedbackSession.findOne({
            patientId,
            consultationNumber
        });

        if (existingFeedback) {
            return NextResponse.json({
                success: true,
                canSubmit: false,
                error: {
                    message: 'Feedback already submitted for this consultation'
                },
                existingSubmission: {
                    sessionId: existingFeedback._id,
                    submittedAt: existingFeedback.submittedAt,
                    responseCount: existingFeedback.responses.length
                }
            });
        }

        return NextResponse.json({
            success: true,
            canSubmit: true,
            message: 'Feedback submission is allowed'
        });

    } catch (error) {
        console.error('Error validating feedback submission:', error);
        return NextResponse.json(
            {
                success: false,
                canSubmit: false,
                error: {
                    message: 'Internal server error'
                }
            },
            { status: 500 }
        );
    }
}