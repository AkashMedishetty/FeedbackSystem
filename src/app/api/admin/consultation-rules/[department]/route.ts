import { NextRequest, NextResponse } from 'next/server';
import { withDatabaseErrorHandling } from '@/lib/db/utils';
import ConsultationRules from '@/lib/db/models/ConsultationRules';
import QuestionTemplate from '@/lib/db/models/QuestionTemplate';
import { ConsultationRulesEngine } from '@/lib/utils/consultationRulesEngine';
import { ConsultationRuleRequest } from '@/types/api';

interface ConsultationRulesParams {
  params: Promise<{
    department: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: ConsultationRulesParams
) {
  try {
    const { department } = await params;

    if (!department) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'MISSING_DEPARTMENT',
            message: 'Department parameter is required' 
          }
        },
        { status: 400 }
      );
    }

    const result = await withDatabaseErrorHandling(async () => {
      const consultationRules = await ConsultationRules.findOne({ 
        department: department.toLowerCase() 
      }).lean() as {
        _id: string;
        department: string;
        rules: Array<{
          consultationNumber: number;
          templateId: string;
          templateName: string;
          description: string;
        }>;
        defaultTemplateId: string;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
      } | null;

      if (!consultationRules) {
        throw new Error('RULES_NOT_FOUND');
      }

      // Get default template info
      const defaultTemplate = await QuestionTemplate.findById(consultationRules.defaultTemplateId).lean() as {
        _id: string;
        name: string;
        consultationType: string;
        questions: unknown[];
        isDefault: boolean;
      } | null;
      
      // Get template info for each rule
      const enrichedRules = await Promise.all(
        consultationRules.rules.map(async (rule) => {
          const template = await QuestionTemplate.findById(rule.templateId).lean() as {
            _id: string;
            name: string;
            consultationType: string;
            questions: unknown[];
            isDefault: boolean;
          } | null;
          return {
            ...rule,
            template: template ? {
              id: template._id.toString(),
              name: template.name,
              consultationType: template.consultationType,
              questionsCount: template.questions.length,
              isDefault: template.isDefault
            } : null
          };
        })
      );

      return {
        success: true,
        data: {
          consultationRules: {
            ...consultationRules,
            rules: enrichedRules,
            defaultTemplate: defaultTemplate ? {
              id: defaultTemplate._id.toString(),
              name: defaultTemplate.name,
              consultationType: defaultTemplate.consultationType,
              questionsCount: defaultTemplate.questions.length,
              isDefault: defaultTemplate.isDefault
            } : null
          }
        }
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching consultation rules:', error);
    
    if (error instanceof Error && error.message === 'RULES_NOT_FOUND') {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'RULES_NOT_FOUND',
            message: 'Consultation rules not found for this department' 
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
          message: 'Failed to fetch consultation rules' 
        }
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: ConsultationRulesParams
) {
  try {
    const { department } = await params;
    const body = await request.json();

    if (!department) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'MISSING_DEPARTMENT',
            message: 'Department parameter is required' 
          }
        },
        { status: 400 }
      );
    }

    const { rules, defaultTemplateId } = body;

    const result = await withDatabaseErrorHandling(async () => {
      const existingRules = await ConsultationRules.findOne({ 
        department: department.toLowerCase() 
      });

      if (!existingRules) {
        throw new Error('RULES_NOT_FOUND');
      }

      // Validate template references if provided
      if (rules || defaultTemplateId) {
        const templateIds = [];
        if (defaultTemplateId) templateIds.push(defaultTemplateId);
        if (rules) templateIds.push(...rules.map((rule: ConsultationRuleRequest) => rule.templateId));

        const templates = await QuestionTemplate.find({ 
          _id: { $in: templateIds } 
        }).lean();

        if (templates.length !== templateIds.length) {
          throw new Error('INVALID_TEMPLATE_REFERENCES');
        }
      }

      // Validate rules structure if provided
      if (rules) {
        const validation = ConsultationRulesEngine.validateConsultationRules({
          _id: existingRules._id.toString(),
          department: existingRules.department,
          rules,
          defaultTemplateId: defaultTemplateId || existingRules.defaultTemplateId,
          createdBy: existingRules.createdBy,
          createdAt: existingRules.createdAt,
          updatedAt: new Date()
        });
        
        if (!validation.isValid) {
          return NextResponse.json(
            { 
              success: false,
              error: { 
                code: 'INVALID_RULES_STRUCTURE',
                message: 'Rule validation failed',
                details: validation.errors
              }
            },
            { status: 400 }
          );
        }
      }

      // Update consultation rules
      const updateData: Record<string, unknown> = {};
      
      if (rules !== undefined) {
        updateData.rules = rules.map((rule: ConsultationRuleRequest) => ({
          consultationNumber: rule.consultationNumber,
          templateId: rule.templateId,
          templateName: rule.templateName,
          description: rule.description
        }));
      }
      
      if (defaultTemplateId !== undefined) {
        updateData.defaultTemplateId = defaultTemplateId;
      }

      const updatedRules = await ConsultationRules.findOneAndUpdate(
        { department: department.toLowerCase() },
        updateData,
        { new: true, runValidators: true }
      );

      return {
        success: true,
        data: {
          consultationRules: {
            id: updatedRules!._id.toString(),
            department: updatedRules!.department,
            rules: updatedRules!.rules,
            defaultTemplateId: updatedRules!.defaultTemplateId,
            createdBy: updatedRules!.createdBy,
            createdAt: updatedRules!.createdAt,
            updatedAt: updatedRules!.updatedAt
          }
        }
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating consultation rules:', error);
    
    if (error instanceof Error) {
      if (error.message === 'RULES_NOT_FOUND') {
        return NextResponse.json(
          { 
            success: false,
            error: { 
              code: 'RULES_NOT_FOUND',
              message: 'Consultation rules not found for this department' 
            }
          },
          { status: 404 }
        );
      }
      
      if (error.message === 'INVALID_TEMPLATE_REFERENCES') {
        return NextResponse.json(
          { 
            success: false,
            error: { 
              code: 'INVALID_TEMPLATE_REFERENCES',
              message: 'One or more referenced templates do not exist' 
            }
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: { 
          code: 'INTERNAL_ERROR',
          message: 'Failed to update consultation rules' 
        }
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: ConsultationRulesParams
) {
  try {
    const { department } = await params;

    if (!department) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'MISSING_DEPARTMENT',
            message: 'Department parameter is required' 
          }
        },
        { status: 400 }
      );
    }

    const result = await withDatabaseErrorHandling(async () => {
      const consultationRules = await ConsultationRules.findOne({ 
        department: department.toLowerCase() 
      });

      if (!consultationRules) {
        throw new Error('RULES_NOT_FOUND');
      }

      await ConsultationRules.findOneAndDelete({ 
        department: department.toLowerCase() 
      });

      return {
        success: true,
        data: {
          message: 'Consultation rules deleted successfully',
          deletedRules: {
            id: consultationRules._id.toString(),
            department: consultationRules.department,
            rulesCount: consultationRules.rules.length
          }
        }
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting consultation rules:', error);
    
    if (error instanceof Error && error.message === 'RULES_NOT_FOUND') {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: 'RULES_NOT_FOUND',
            message: 'Consultation rules not found for this department' 
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
          message: 'Failed to delete consultation rules' 
        }
      },
      { status: 500 }
    );
  }
}