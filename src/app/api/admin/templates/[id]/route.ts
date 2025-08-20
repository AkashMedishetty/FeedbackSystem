import { NextRequest, NextResponse } from 'next/server';
import { withDatabaseErrorHandling, isValidObjectId } from '@/lib/db/utils';
import QuestionTemplate from '@/lib/db/models/QuestionTemplate';
import { QuestionFilteringEngine } from '@/lib/utils/questionFiltering';
import { TemplateQuestionRequest } from '@/types/api';

interface TemplateParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: NextRequest,
  { params }: TemplateParams
) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'INVALID_ID',
            message: 'Invalid template ID format' 
          }
        },
        { status: 400 }
      );
    }

    const result = await withDatabaseErrorHandling(async () => {
      const template = await QuestionTemplate.findById(id).lean() as {
        _id: string;
        name: string;
        description?: string;
        department: string;
        consultationType: string;
        consultationNumberRange: { min: number; max?: number };
        isDefault: boolean;
        questions: Array<{
          type: string;
          title: string;
          description?: string;
          required: boolean;
          options?: string[];
          minValue?: number;
          maxValue?: number;
          orderIndex: number;
          placeholder?: string;
          validation?: {
            minLength?: number;
            maxLength?: number;
            pattern?: string;
          };
        }>;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
      } | null;

      if (!template) {
        throw new Error('TEMPLATE_NOT_FOUND');
      }

      // Process questions to include validation and statistics
      const processedQuestions = template.questions.map((q, index) => ({
        id: `template_${template._id}_${index}`,
        type: q.type,
        title: q.title,
        description: q.description,
        required: q.required,
        options: q.options,
        minValue: q.minValue,
        maxValue: q.maxValue,
        orderIndex: q.orderIndex,
        placeholder: q.placeholder,
        validation: q.validation
      }));

      const questionStats = QuestionFilteringEngine.getQuestionStats(
        processedQuestions.map(q => ({
          ...q,
          type: q.type as 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date',
          isFromTemplate: true,
          templateId: template._id.toString(),
          templateName: template.name
        }))
      );

      return {
        success: true,
        data: {
          template: {
            ...template,
            questions: processedQuestions,
            questionStats,
            questionsCount: template.questions.length
          }
        }
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching question template:', error);
    
    if (error instanceof Error && error.message === 'TEMPLATE_NOT_FOUND') {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Question template not found' 
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
          message: 'Failed to fetch question template' 
        }
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: TemplateParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'INVALID_ID',
            message: 'Invalid template ID format' 
          }
        },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      department,
      consultationType,
      consultationNumberRange,
      isDefault,
      questions
    } = body;

    // Validate questions if provided
    if (questions) {
      const questionValidationErrors: string[] = [];
      questions.forEach((question: TemplateQuestionRequest, index: number) => {
        const filteredQuestion = {
          id: `temp_${index}`,
          type: question.type,
          title: question.title,
          description: question.description,
          required: question.required || false,
          options: question.options,
          minValue: question.minValue,
          maxValue: question.maxValue,
          orderIndex: question.orderIndex || index,
          placeholder: question.placeholder,
          validation: question.validation,
          isFromTemplate: true
        };

        const validation = QuestionFilteringEngine.validateQuestion(filteredQuestion);
        if (!validation.isValid) {
          questionValidationErrors.push(`Question ${index + 1}: ${validation.errors.join(', ')}`);
        }
      });

      if (questionValidationErrors.length > 0) {
        return NextResponse.json(
          { 
            success: false,
            error: { 
              code: 'INVALID_QUESTIONS',
              message: 'Question validation failed',
              details: questionValidationErrors
            }
          },
          { status: 400 }
        );
      }
    }

    const result = await withDatabaseErrorHandling(async () => {
      const existingTemplate = await QuestionTemplate.findById(id);

      if (!existingTemplate) {
        throw new Error('TEMPLATE_NOT_FOUND');
      }

      // If setting as default, unset other defaults for the same department and consultation type
      if (isDefault && (department || consultationType)) {
        const targetDepartment = department ? department.toLowerCase() : existingTemplate.department;
        const targetConsultationType = consultationType || existingTemplate.consultationType;

        await QuestionTemplate.updateMany(
          { 
            _id: { $ne: id },
            department: targetDepartment,
            consultationType: targetConsultationType,
            isDefault: true
          },
          { isDefault: false }
        );
      }

      // Update template
      const updateData: Record<string, unknown> = {};
      
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim();
      if (department !== undefined) updateData.department = department.toLowerCase();
      if (consultationType !== undefined) updateData.consultationType = consultationType;
      if (consultationNumberRange !== undefined) updateData.consultationNumberRange = consultationNumberRange;
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      if (questions !== undefined) {
        updateData.questions = questions.map((q: TemplateQuestionRequest, index: number) => ({
          ...q,
          orderIndex: q.orderIndex !== undefined ? q.orderIndex : index
        }));
      }

      const updatedTemplate = await QuestionTemplate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      return {
        success: true,
        data: {
          template: {
            id: updatedTemplate!._id.toString(),
            name: updatedTemplate!.name,
            description: updatedTemplate!.description,
            department: updatedTemplate!.department,
            consultationType: updatedTemplate!.consultationType,
            consultationNumberRange: updatedTemplate!.consultationNumberRange,
            isDefault: updatedTemplate!.isDefault,
            questionsCount: updatedTemplate!.questions.length,
            createdBy: updatedTemplate!.createdBy,
            createdAt: updatedTemplate!.createdAt,
            updatedAt: updatedTemplate!.updatedAt
          }
        }
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating question template:', error);
    
    if (error instanceof Error && error.message === 'TEMPLATE_NOT_FOUND') {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Question template not found' 
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
          message: 'Failed to update question template' 
        }
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: TemplateParams
) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'INVALID_ID',
            message: 'Invalid template ID format' 
          }
        },
        { status: 400 }
      );
    }

    const result = await withDatabaseErrorHandling(async () => {
      const template = await QuestionTemplate.findById(id);

      if (!template) {
        throw new Error('TEMPLATE_NOT_FOUND');
      }

      // Check if template is being used in consultation rules
      // This would require importing ConsultationRules model
      // For now, we'll allow deletion but this should be enhanced

      await QuestionTemplate.findByIdAndDelete(id);

      return {
        success: true,
        data: {
          message: 'Question template deleted successfully',
          deletedTemplate: {
            id: template._id.toString(),
            name: template.name,
            department: template.department,
            consultationType: template.consultationType
          }
        }
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting question template:', error);
    
    if (error instanceof Error && error.message === 'TEMPLATE_NOT_FOUND') {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Question template not found' 
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
          message: 'Failed to delete question template' 
        }
      },
      { status: 500 }
    );
  }
}