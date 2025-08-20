import { NextRequest, NextResponse } from 'next/server';
import { withDatabaseErrorHandling, isValidObjectId } from '@/lib/db/utils';
import { TemplateApplicationEngine } from '@/lib/utils/templateApplication';

interface TemplateApplyParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: TemplateApplyParams
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
      replaceExisting = false,
      preserveOrder = true,
      skipValidation = false,
      createdBy = 'admin'
    } = body;

    const result = await withDatabaseErrorHandling(async () => {
      const applicationResult = await TemplateApplicationEngine.applyTemplate(id, {
        replaceExisting,
        preserveOrder,
        skipValidation,
        createdBy
      });

      if (!applicationResult.success && applicationResult.appliedQuestions === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: { 
              code: 'APPLICATION_FAILED',
              message: 'Failed to apply template',
              details: applicationResult.errors
            }
          },
          { status: 400 }
        );
      }

      return {
        success: true,
        data: {
          message: 'Template applied successfully',
          result: {
            appliedQuestions: applicationResult.appliedQuestions,
            skippedQuestions: applicationResult.skippedQuestions,
            createdQuestionIds: applicationResult.createdQuestionIds,
            errors: applicationResult.errors,
            hasErrors: applicationResult.errors.length > 0
          }
        }
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error applying template:', error);
    return NextResponse.json(
      { 
        success: false,
        error: { 
          code: 'INTERNAL_ERROR',
          message: 'Failed to apply template' 
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: TemplateApplyParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'preview';

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
      if (action === 'preview') {
        const previewResult = await TemplateApplicationEngine.previewTemplateApplication(id);
        
        return {
          success: true,
          data: {
            action: 'preview',
            result: previewResult
          }
        };
      } else if (action === 'compatibility') {
        const compatibilityResult = await TemplateApplicationEngine.getTemplateCompatibility(id);
        
        return {
          success: true,
          data: {
            action: 'compatibility',
            result: compatibilityResult
          }
        };
      } else {
        return NextResponse.json(
          { 
            success: false,
            error: { 
              code: 'INVALID_ACTION',
              message: 'Invalid action. Use "preview" or "compatibility"' 
            }
          },
          { status: 400 }
        );
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing template application request:', error);
    return NextResponse.json(
      { 
        success: false,
        error: { 
          code: 'INTERNAL_ERROR',
          message: 'Failed to process template application request' 
        }
      },
      { status: 500 }
    );
  }
}