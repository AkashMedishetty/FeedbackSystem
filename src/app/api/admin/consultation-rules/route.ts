import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ConsultationRules } from '@/models/ConsultationRules';
import { QuestionTemplate } from '@/models/QuestionTemplate';
import { ConsultationRulesEngine } from '@/lib/utils/consultationRulesEngine';
import { ConsultationRuleRequest } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
      const filter: Record<string, unknown> = {};
      
      if (department) {
        filter.department = department.toLowerCase();
      }

      const consultationRules = await ConsultationRules.find(filter)
        .sort({ department: 1 })
        .lean();

      // Populate template information for each rule
      const enrichedRules = await Promise.all(
        consultationRules.map(async (rules) => {
          // Get default template info
          const defaultTemplate = await QuestionTemplate.findById(rules.defaultTemplateId).lean() as {
            _id: string;
            name: string;
            consultationType: string;
            questions: unknown[];
          } | null;
          
          // Get template info for each rule
          const enrichedRulesList = await Promise.all(
            rules.rules.map(async (rule: {
              consultationNumber: number;
              templateId: string;
              templateName: string;
              description: string;
            }) => {
              const template = await QuestionTemplate.findById(rule.templateId).lean() as {
                _id: string;
                name: string;
                consultationType: string;
                questions: unknown[];
              } | null;
              return {
                ...rule,
                template: template ? {
                  id: template._id.toString(),
                  name: template.name,
                  consultationType: template.consultationType,
                  questionsCount: template.questions.length
                } : null
              };
            })
          );

          return {
            ...rules,
            rules: enrichedRulesList,
            defaultTemplate: defaultTemplate ? {
              id: defaultTemplate._id.toString(),
              name: defaultTemplate.name,
              consultationType: defaultTemplate.consultationType,
              questionsCount: defaultTemplate.questions.length
            } : null
          };
        })
      );

    return NextResponse.json({
      success: true,
      data: {
        consultationRules: enrichedRules
      }
    });
  } catch (error) {
    console.error('Error fetching consultation rules:', error);
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
      department,
      rules,
      defaultTemplateId,
      createdBy
    } = body;

    // Validate required fields
    if (!department || !rules || !defaultTemplateId || !createdBy) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            message: 'Missing required fields: department, rules, defaultTemplateId, createdBy' 
          }
        },
        { status: 400 }
      );
    }

    // Validate rules structure
    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            message: 'Rules must be a non-empty array' 
          }
        },
        { status: 400 }
      );
    }
    // Check if department rules already exist
    const existingRules = await ConsultationRules.findOne({ 
      department: department.toLowerCase() 
    });

    if (existingRules) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            message: 'Consultation rules for this department already exist' 
          }
        },
        { status: 409 }
      );
    }

    // Validate that all referenced templates exist
    const templateIds = [defaultTemplateId, ...rules.map((rule: ConsultationRuleRequest) => rule.templateId)];
    const templates = await QuestionTemplate.find({ 
      _id: { $in: templateIds } 
    }).lean();

    if (templates.length !== templateIds.length) {
      return NextResponse.json(
        { 
          success: false,
          error: { 
            message: 'One or more referenced templates do not exist' 
          }
        },
        { status: 400 }
      );
    }

    // Validate rules for conflicts (if ConsultationRulesEngine is available)
    // const validation = ConsultationRulesEngine.validateConsultationRules({
    //   _id: 'temp',
    //   department: department.toLowerCase(),
    //   rules,
    //   defaultTemplateId,
    //   createdBy,
    //   createdAt: new Date(),
    //   updatedAt: new Date()
    // });
    // 
    // if (!validation.isValid) {
    //   return NextResponse.json(
    //     { 
    //       success: false,
    //       error: { 
    //         message: 'Rule validation failed',
    //         details: validation.errors
    //       }
    //     },
    //     { status: 400 }
    //   );
    // }

    // Create new consultation rules
    const consultationRules = new ConsultationRules({
      department: department.toLowerCase(),
      rules: rules.map((rule: ConsultationRuleRequest) => ({
        consultationNumber: rule.consultationNumber,
        templateId: rule.templateId,
        templateName: rule.templateName,
        description: rule.description
      })),
      defaultTemplateId,
      createdBy
    });

    await consultationRules.save();

    return NextResponse.json({
      success: true,
      data: {
        consultationRules: {
          id: consultationRules._id.toString(),
          department: consultationRules.department,
          rules: consultationRules.rules,
          defaultTemplateId: consultationRules.defaultTemplateId,
          createdBy: consultationRules.createdBy,
          createdAt: consultationRules.createdAt,
          updatedAt: consultationRules.updatedAt
        }
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating consultation rules:', error);
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