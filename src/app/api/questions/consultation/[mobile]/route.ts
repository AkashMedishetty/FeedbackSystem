import { NextRequest, NextResponse } from 'next/server';
import { withDatabaseErrorHandling } from '@/lib/db/utils';
import Patient from '@/lib/db/models/Patient';
import FeedbackSession from '@/lib/db/models/FeedbackSession';
import Question from '@/lib/db/models/Question';
import { ConsultationRulesEngine } from '@/lib/utils/consultationRulesEngine';
import { QuestionFilteringEngine } from '@/lib/utils/questionFiltering';

interface ConsultationQuestionParams {
  params: Promise<{
    mobile: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: ConsultationQuestionParams
) {
  try {
    const { mobile } = await params;
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || 'general';

    if (!mobile) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'MISSING_MOBILE',
            message: 'Mobile number is required' 
          }
        },
        { status: 400 }
      );
    }

    // Clean mobile number
    const cleanedMobile = mobile.replace(/\D/g, '');
    if (cleanedMobile.length !== 10) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'INVALID_MOBILE',
            message: 'Invalid mobile number format' 
          }
        },
        { status: 400 }
      );
    }

    const result = await withDatabaseErrorHandling(async () => {
      // Get patient and consultation number
      const patient = await Patient.findOne({ mobileNumber: cleanedMobile });
      
      if (!patient) {
        throw new Error('PATIENT_NOT_FOUND');
      }

      // Get consultation count
      const feedbackCount = await FeedbackSession.countDocuments({
        patientId: patient._id,
      });
      const consultationNumber = feedbackCount + 1;

      // Use consultation rules engine to select template
      const templateSelection = await ConsultationRulesEngine.selectTemplate({
        consultationNumber,
        department,
        patientId: patient._id.toString()
      });

      let questions = [];
      let questionnaireType = templateSelection.questionnaireType;

      if (templateSelection.template) {
        // Process template questions
        questions = QuestionFilteringEngine.processTemplateQuestions(
          templateSelection.template.questions,
          templateSelection.template._id.toString(),
          templateSelection.template.name,
          {
            includeOptional: true,
            sortBy: 'orderIndex',
            sortOrder: 'asc'
          }
        );
      } else {
        // Fallback to active questions from Question collection
        const activeQuestions = await Question.find({ isActive: true })
          .sort({ orderIndex: 1 });
        
        questions = QuestionFilteringEngine.processDirectQuestions(
          activeQuestions,
          {
            includeOptional: true,
            sortBy: 'orderIndex',
            sortOrder: 'asc'
          }
        );
        questionnaireType = ConsultationRulesEngine.getConsultationType(consultationNumber);
      }

      return {
        success: true,
        data: {
          patient: {
            id: patient._id.toString(),
            name: patient.name,
            mobileNumber: patient.mobileNumber
          },
          consultationNumber,
          department,
          questionnaireType,
          template: templateSelection.template ? {
            id: templateSelection.template._id.toString(),
            name: templateSelection.template.name,
            description: templateSelection.template.description,
            consultationType: templateSelection.template.consultationType
          } : null,
          templateSource: templateSelection.source,
          ruleDescription: templateSelection.ruleDescription,
          questions: QuestionFilteringEngine.reorderQuestions(questions),
          totalQuestions: questions.length
        }
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching consultation questions:', error);
    
    if (error instanceof Error && error.message === 'PATIENT_NOT_FOUND') {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'PATIENT_NOT_FOUND',
            message: 'Patient not found' 
          }
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: { 
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch questions for consultation' 
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
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed' 
      }
    },
    { status: 405 }
  );
}