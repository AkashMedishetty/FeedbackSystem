import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Question from '@/lib/db/models/Question';
import { ConsultationRulesEngine } from '@/lib/utils/consultationRulesEngine';
import { QuestionFilteringEngine } from '@/lib/utils/questionFiltering';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    console.log('API: Connected to database');
    
    const { searchParams } = new URL(request.url);
    const consultationNumber = parseInt(searchParams.get('consultationNumber') || '1');
    const department = searchParams.get('department') || 'general';
    const patientId = searchParams.get('patientId');

    // Get template based on consultation rules if patientId is provided
    let template = null;
    if (patientId) {
      console.log('API: Selecting template for:', { consultationNumber, department, patientId });
      const templateResult = await ConsultationRulesEngine.selectTemplate({
        consultationNumber,
        department,
        patientId
      });
      template = templateResult.template;
      console.log('API: Selected template:', template ? template.name : 'null');
    }

    let questions = [];
    let questionnaireType = 'general';

    if (template && template.questions && template.questions.length > 0) {
      // Use template questions
      console.log('API: Using template questions, count:', template.questions.length);
      questions = QuestionFilteringEngine.processTemplateQuestions(
        template.questions,
        template._id.toString(),
        template.name,
        {}
      );
      questionnaireType = template.consultationType || 'general';
    } else {
      // Fallback to active questions
      console.log('API: No template found, fetching active questions');
      const activeQuestions = await Question.find({ isActive: true })
        .sort({ orderIndex: 1 })
        .lean();
      console.log('API: Found active questions count:', activeQuestions.length);
      questions = activeQuestions;
    }

    console.log('API: Final questions count:', questions.length);
    
    return NextResponse.json({
      success: true,
      data: {
        consultationNumber,
        department,
        questionnaireType,
        template: template ? {
          id: template._id,
          name: template.name
        } : null,
        questions,
        totalQuestions: questions.length
      }
    });
  } catch (error) {
    console.error('Error fetching consultation questions:', error);
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