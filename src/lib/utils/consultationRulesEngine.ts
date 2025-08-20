import QuestionTemplate, { IQuestionTemplate } from '@/lib/db/models/QuestionTemplate';
import ConsultationRules, { IConsultationRules } from '@/lib/db/models/ConsultationRules';

export interface ConsultationContext {
  consultationNumber: number;
  department: string;
  patientId: string;
}

export interface TemplateSelectionResult {
  template: IQuestionTemplate | null;
  questionnaireType: string;
  source: 'consultation-rule' | 'default-template' | 'fallback';
  ruleDescription?: string;
}

/**
 * Consultation Rules Engine
 * Determines which question template to use based on consultation number and department
 */
export class ConsultationRulesEngine {
  /**
   * Select the appropriate template for a consultation
   */
  static async selectTemplate(context: ConsultationContext): Promise<TemplateSelectionResult> {
    const { consultationNumber, department } = context;

    try {
      console.log('ConsultationRulesEngine: Looking for rules with department:', department.toLowerCase());
      
      // Debug: Check all consultation rules in database
      const allRules = await ConsultationRules.find({});
      console.log('ConsultationRulesEngine: All rules in database:', allRules.map(r => ({ dept: r.department, id: r._id })));
      
      // Step 1: Get consultation rules for the department
      const consultationRules = await ConsultationRules.findOne({ 
        department: department.toLowerCase() 
      });
      console.log('ConsultationRulesEngine: Found consultation rules:', consultationRules ? 'yes' : 'no');

      if (consultationRules) {
        console.log('ConsultationRulesEngine: Rules found, looking for consultation number:', consultationNumber);
        console.log('ConsultationRulesEngine: Available rules:', consultationRules.rules.map((r: { consultationNumber: number; templateId: string; templateName: string; description: string }) => ({ num: r.consultationNumber, templateId: r.templateId })));
        // Step 2: Find matching rule for consultation number
        const matchingRule = consultationRules.rules.find(
          (rule: { consultationNumber: number; templateId: string; templateName: string; description: string }) => 
            rule.consultationNumber === consultationNumber
        );
        console.log('ConsultationRulesEngine: Matching rule found:', matchingRule ? 'yes' : 'no');

        if (matchingRule) {
          console.log('ConsultationRulesEngine: Looking for template with ID:', matchingRule.templateId);
          const template = await QuestionTemplate.findById(matchingRule.templateId);
          console.log('ConsultationRulesEngine: Template found:', template ? template.name : 'null');
          if (template) {
            return {
              template,
              questionnaireType: template.consultationType,
              source: 'consultation-rule',
              ruleDescription: matchingRule.description
            };
          }
        }

        // Step 3: Use default template from rules
        if (consultationRules.defaultTemplateId) {
          const defaultTemplate = await QuestionTemplate.findById(consultationRules.defaultTemplateId);
          if (defaultTemplate) {
            return {
              template: defaultTemplate,
              questionnaireType: defaultTemplate.consultationType,
              source: 'default-template'
            };
          }
        }
      }

      // Step 4: Fallback to department default template
      const departmentDefault = await QuestionTemplate.findOne({
        isDefault: true,
        department: department.toLowerCase()
      });

      if (departmentDefault) {
        return {
          template: departmentDefault,
          questionnaireType: departmentDefault.consultationType,
          source: 'fallback'
        };
      }

      // Step 5: Final fallback to any default template
      const globalDefault = await QuestionTemplate.findOne({
        isDefault: true
      });

      if (globalDefault) {
        return {
          template: globalDefault,
          questionnaireType: globalDefault.consultationType,
          source: 'fallback'
        };
      }

      // No template found
      return {
        template: null,
        questionnaireType: 'default',
        source: 'fallback'
      };

    } catch (error) {
      console.error('Error in consultation rules engine:', error);
      return {
        template: null,
        questionnaireType: 'default',
        source: 'fallback'
      };
    }
  }

  /**
   * Get consultation type based on consultation number
   */
  static getConsultationType(consultationNumber: number): string {
    if (consultationNumber === 1) {
      return 'first-visit';
    } else if (consultationNumber === 2) {
      return 'follow-up';
    } else {
      return 'regular';
    }
  }

  /**
   * Validate consultation rules for conflicts
   */
  static validateConsultationRules(rules: {
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
  }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const consultationNumbers = new Set<number>();

    // Check for duplicate consultation numbers
    for (const rule of rules.rules) {
      if (consultationNumbers.has(rule.consultationNumber)) {
        errors.push(`Duplicate consultation number: ${rule.consultationNumber}`);
      }
      consultationNumbers.add(rule.consultationNumber);

      // Validate consultation number range
      if (rule.consultationNumber < 1) {
        errors.push(`Invalid consultation number: ${rule.consultationNumber}. Must be >= 1`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get available templates for a department
   */
  static async getAvailableTemplates(department: string): Promise<IQuestionTemplate[]> {
    try {
      const templates = await QuestionTemplate.find({
        $or: [
          { department: department.toLowerCase() },
          { department: 'general' }
        ]
      }).sort({ createdAt: -1 });

      return templates;
    } catch (error) {
      console.error('Error fetching available templates:', error);
      return [];
    }
  }

  /**
   * Create default consultation rules for a department
   */
  static async createDefaultRules(
    department: string, 
    createdBy: string
  ): Promise<IConsultationRules | null> {
    try {
      // Find or create default templates
      const firstVisitTemplate = await QuestionTemplate.findOne({
        consultationType: 'first-visit',
        department: department.toLowerCase()
      }) || await QuestionTemplate.findOne({
        consultationType: 'first-visit',
        isDefault: true
      });

      const followUpTemplate = await QuestionTemplate.findOne({
        consultationType: 'follow-up',
        department: department.toLowerCase()
      }) || await QuestionTemplate.findOne({
        consultationType: 'follow-up',
        isDefault: true
      });

      const regularTemplate = await QuestionTemplate.findOne({
        consultationType: 'regular',
        department: department.toLowerCase()
      }) || await QuestionTemplate.findOne({
        consultationType: 'regular',
        isDefault: true
      });

      if (!firstVisitTemplate) {
        throw new Error('No first-visit template found');
      }

      const defaultRules = new ConsultationRules({
        department: department.toLowerCase(),
        rules: [
          {
            consultationNumber: 1,
            templateId: firstVisitTemplate._id.toString(),
            templateName: firstVisitTemplate.name,
            description: 'First visit comprehensive feedback'
          },
          ...(followUpTemplate ? [{
            consultationNumber: 2,
            templateId: followUpTemplate._id.toString(),
            templateName: followUpTemplate.name,
            description: 'Follow-up visit feedback'
          }] : []),
          ...(regularTemplate ? [{
            consultationNumber: 3,
            templateId: regularTemplate._id.toString(),
            templateName: regularTemplate.name,
            description: 'Regular visit feedback (3rd+ consultation)'
          }] : [])
        ],
        defaultTemplateId: regularTemplate?._id.toString() || firstVisitTemplate._id.toString(),
        createdBy
      });

      await defaultRules.save();
      return defaultRules;
    } catch (error) {
      console.error('Error creating default consultation rules:', error);
      return null;
    }
  }
}

export default ConsultationRulesEngine;