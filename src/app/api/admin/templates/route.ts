import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { QuestionTemplate } from '@/models/QuestionTemplate';
import { QuestionFilteringEngine } from '@/lib/utils/questionFiltering';
import { TemplateQuestionRequest } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const consultationType = searchParams.get('consultationType');
    const isDefault = searchParams.get('isDefault');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
      // Build filter query
      const filter: Record<string, unknown> = {};

      if (department) {
        filter.department = department.toLowerCase();
      }

      if (consultationType) {
        filter.consultationType = consultationType;
      }

      if (isDefault !== null) {
        filter.isDefault = isDefault === 'true';
      }

      // Get templates with pagination
      const [templates, total] = await Promise.all([
        QuestionTemplate.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        QuestionTemplate.countDocuments(filter)
      ]);

      // Process templates to include question statistics
      const processedTemplates = (templates as unknown as Array<{
        _id: string;
        name: string;
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
      }>).map(template => {
        const questionStats = QuestionFilteringEngine.getQuestionStats(
          template.questions.map((q: {
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
          }, index: number) => ({
            id: `template_${template._id}_${index}`,
            type: q.type as 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date',
            title: q.title,
            description: q.description,
            required: q.required,
            options: q.options,
            minValue: q.minValue,
            maxValue: q.maxValue,
            orderIndex: q.orderIndex,
            placeholder: q.placeholder,
            validation: q.validation,
            isFromTemplate: true,
            templateId: template._id.toString(),
            templateName: template.name
          }))
        );

        return {
          ...template,
          questionStats,
          questionsCount: template.questions.length
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        templates: processedTemplates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching question templates:', error);
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

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const {
      name,
      description,
      department,
      consultationType,
      consultationNumberRange,
      isDefault = false,
      questions,
      createdBy
    } = body;

    // Validate required fields
    if (!name || !department || !consultationType || !questions || !createdBy) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Missing required fields: name, department, consultationType, questions, createdBy'
          }
        },
        { status: 400 }
      );
    }

    // Validate questions
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
            message: 'Question validation failed',
            details: questionValidationErrors
          }
        },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults for the same department and consultation type
    if (isDefault) {
      await QuestionTemplate.updateMany(
        {
          department: department.toLowerCase(),
          consultationType,
          isDefault: true
        },
        { isDefault: false }
      );
    }

    // Create new template
    const template = new QuestionTemplate({
      name: name.trim(),
      description: description?.trim(),
      department: department.toLowerCase(),
      consultationType,
      consultationNumberRange: consultationNumberRange || { min: 1 },
      isDefault,
      questions: questions.map((q: TemplateQuestionRequest, index: number) => ({
        ...q,
        orderIndex: q.orderIndex !== undefined ? q.orderIndex : index
      })),
      createdBy
    });

    await template.save();

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: template._id.toString(),
          name: template.name,
          description: template.description,
          department: template.department,
          consultationType: template.consultationType,
          consultationNumberRange: template.consultationNumberRange,
          isDefault: template.isDefault,
          questionsCount: template.questions.length,
          createdBy: template.createdBy,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt
        }
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating question template:', error);
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