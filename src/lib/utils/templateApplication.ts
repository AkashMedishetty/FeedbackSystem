import QuestionTemplate from '@/lib/db/models/QuestionTemplate';
import Question from '@/lib/db/models/Question';
import { QuestionFilteringEngine } from './questionFiltering';

export interface TemplateApplicationResult {
  success: boolean;
  appliedQuestions: number;
  skippedQuestions: number;
  errors: string[];
  createdQuestionIds: string[];
}

export interface TemplateApplicationOptions {
  replaceExisting?: boolean;
  preserveOrder?: boolean;
  skipValidation?: boolean;
  createdBy?: string;
}

/**
 * Template Application Utility
 * Handles applying question templates to create active questions
 */
export class TemplateApplicationEngine {
  /**
   * Apply a template to create active questions
   */
  static async applyTemplate(
    templateId: string,
    options: TemplateApplicationOptions = {}
  ): Promise<TemplateApplicationResult> {
    const {
      replaceExisting = false,
      preserveOrder = true,
      skipValidation = false
    } = options;

    const result: TemplateApplicationResult = {
      success: false,
      appliedQuestions: 0,
      skippedQuestions: 0,
      errors: [],
      createdQuestionIds: []
    };

    try {
      // Get the template
      const template = await QuestionTemplate.findById(templateId);
      if (!template) {
        result.errors.push('Template not found');
        return result;
      }

      // If replacing existing, deactivate all current questions
      if (replaceExisting) {
        await Question.updateMany({}, { isActive: false });
      }

      // Process each question in the template
      for (let i = 0; i < template.questions.length; i++) {
        const templateQuestion = template.questions[i];

        try {
          // Validate question if not skipping validation
          if (!skipValidation) {
            const filteredQuestion = {
              id: `temp_${i}`,
              type: templateQuestion.type as 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date',
              title: templateQuestion.title,
              description: templateQuestion.description,
              required: templateQuestion.required,
              options: templateQuestion.options,
              minValue: templateQuestion.minValue,
              maxValue: templateQuestion.maxValue,
              orderIndex: templateQuestion.orderIndex,
              placeholder: templateQuestion.placeholder,
              validation: templateQuestion.validation,
              isFromTemplate: true
            };

            const validation = QuestionFilteringEngine.validateQuestion(filteredQuestion);
            if (!validation.isValid) {
              result.errors.push(`Question ${i + 1}: ${validation.errors.join(', ')}`);
              result.skippedQuestions++;
              continue;
            }
          }

          // Create the question
          const question = new Question({
            type: templateQuestion.type,
            title: templateQuestion.title,
            description: templateQuestion.description,
            required: templateQuestion.required,
            options: templateQuestion.options,
            minValue: templateQuestion.minValue,
            maxValue: templateQuestion.maxValue,
            orderIndex: preserveOrder ? templateQuestion.orderIndex : i,
            isActive: true,
            placeholder: templateQuestion.placeholder,
            validation: templateQuestion.validation
          });

          await question.save();
          result.createdQuestionIds.push(question._id.toString());
          result.appliedQuestions++;

        } catch (error) {
          result.errors.push(`Question ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.skippedQuestions++;
        }
      }

      result.success = result.appliedQuestions > 0;
      return result;

    } catch (error) {
      result.errors.push(`Template application failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Apply multiple templates in sequence
   */
  static async applyMultipleTemplates(
    templateIds: string[],
    options: TemplateApplicationOptions = {}
  ): Promise<TemplateApplicationResult> {
    const combinedResult: TemplateApplicationResult = {
      success: false,
      appliedQuestions: 0,
      skippedQuestions: 0,
      errors: [],
      createdQuestionIds: []
    };

    for (let i = 0; i < templateIds.length; i++) {
      const templateId = templateIds[i];

      // Only replace existing for the first template
      const templateOptions = {
        ...options,
        replaceExisting: i === 0 ? options.replaceExisting : false
      };

      const result = await this.applyTemplate(templateId, templateOptions);

      combinedResult.appliedQuestions += result.appliedQuestions;
      combinedResult.skippedQuestions += result.skippedQuestions;
      combinedResult.errors.push(...result.errors);
      combinedResult.createdQuestionIds.push(...result.createdQuestionIds);
    }

    combinedResult.success = combinedResult.appliedQuestions > 0;
    return combinedResult;
  }

  /**
   * Preview template application without actually creating questions
   */
  static async previewTemplateApplication(
    templateId: string
  ): Promise<{
    success: boolean;
    questionsToCreate: number;
    questionsWithErrors: number;
    errors: string[];
    preview: Array<{
      index: number;
      title: string;
      type: string;
      required: boolean;
      valid: boolean;
      errors: string[];
    }>;
  }> {
    try {
      const template = await QuestionTemplate.findById(templateId);
      if (!template) {
        return {
          success: false,
          questionsToCreate: 0,
          questionsWithErrors: 0,
          errors: ['Template not found'],
          preview: []
        };
      }

      const preview = [];
      let questionsToCreate = 0;
      let questionsWithErrors = 0;
      const globalErrors: string[] = [];

      for (let i = 0; i < template.questions.length; i++) {
        const templateQuestion = template.questions[i];

        const filteredQuestion = {
          id: `temp_${i}`,
          type: templateQuestion.type as 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date',
          title: templateQuestion.title,
          description: templateQuestion.description,
          required: templateQuestion.required,
          options: templateQuestion.options,
          minValue: templateQuestion.minValue,
          maxValue: templateQuestion.maxValue,
          orderIndex: templateQuestion.orderIndex,
          placeholder: templateQuestion.placeholder,
          validation: templateQuestion.validation,
          isFromTemplate: true
        };

        const validation = QuestionFilteringEngine.validateQuestion(filteredQuestion);

        preview.push({
          index: i + 1,
          title: templateQuestion.title,
          type: templateQuestion.type,
          required: templateQuestion.required,
          valid: validation.isValid,
          errors: validation.errors
        });

        if (validation.isValid) {
          questionsToCreate++;
        } else {
          questionsWithErrors++;
        }
      }

      return {
        success: true,
        questionsToCreate,
        questionsWithErrors,
        errors: globalErrors,
        preview
      };

    } catch (error) {
      return {
        success: false,
        questionsToCreate: 0,
        questionsWithErrors: 0,
        errors: [`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        preview: []
      };
    }
  }

  /**
   * Get template compatibility with existing questions
   */
  static async getTemplateCompatibility(
    templateId: string
  ): Promise<{
    success: boolean;
    compatible: boolean;
    conflicts: Array<{
      templateQuestionIndex: number;
      templateQuestionTitle: string;
      existingQuestionId: string;
      existingQuestionTitle: string;
      conflictType: 'title' | 'order' | 'type';
    }>;
    recommendations: string[];
  }> {
    try {
      const template = await QuestionTemplate.findById(templateId);
      if (!template) {
        return {
          success: false,
          compatible: false,
          conflicts: [],
          recommendations: ['Template not found']
        };
      }

      const existingQuestions = await Question.find({ isActive: true }).lean() as unknown as Array<{
        _id: string;
        title: string;
        orderIndex: number;
      }>;
      const conflicts = [];
      const recommendations: string[] = [];

      // Check for conflicts
      for (let i = 0; i < template.questions.length; i++) {
        const templateQuestion = template.questions[i];

        // Check for title conflicts
        const titleConflict = existingQuestions.find(
          q => q.title.toLowerCase() === templateQuestion.title.toLowerCase()
        );
        if (titleConflict) {
          conflicts.push({
            templateQuestionIndex: i + 1,
            templateQuestionTitle: templateQuestion.title,
            existingQuestionId: titleConflict._id.toString(),
            existingQuestionTitle: titleConflict.title,
            conflictType: 'title' as const
          });
        }

        // Check for order conflicts
        const orderConflict = existingQuestions.find(
          q => q.orderIndex === templateQuestion.orderIndex
        );
        if (orderConflict) {
          conflicts.push({
            templateQuestionIndex: i + 1,
            templateQuestionTitle: templateQuestion.title,
            existingQuestionId: orderConflict._id.toString(),
            existingQuestionTitle: orderConflict.title,
            conflictType: 'order' as const
          });
        }
      }

      // Generate recommendations
      if (conflicts.length > 0) {
        recommendations.push('Consider using replaceExisting option to avoid conflicts');
        recommendations.push('Review question titles and order indices for duplicates');
      }

      if (existingQuestions.length > 0) {
        recommendations.push(`${existingQuestions.length} active questions will be affected`);
      }

      return {
        success: true,
        compatible: conflicts.length === 0,
        conflicts,
        recommendations
      };

    } catch (error) {
      return {
        success: false,
        compatible: false,
        conflicts: [],
        recommendations: [`Compatibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

export default TemplateApplicationEngine;