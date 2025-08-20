import { ITemplateQuestion } from '@/lib/db/models/QuestionTemplate';
import { IQuestion } from '@/lib/db/models/Question';

export interface FilteredQuestion {
  id: string;
  type: 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date';
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
  isFromTemplate: boolean;
  templateId?: string;
  templateName?: string;
}

export interface QuestionFilterOptions {
  includeOptional?: boolean;
  maxQuestions?: number;
  excludeTypes?: string[];
  sortBy?: 'orderIndex' | 'title' | 'type';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Question Filtering and Ordering Utility
 * Handles filtering, sorting, and processing of questions from templates or direct questions
 */
export class QuestionFilteringEngine {
  /**
   * Process template questions into filtered questions
   */
  static processTemplateQuestions(
    templateQuestions: ITemplateQuestion[],
    templateId: string,
    templateName: string,
    options: QuestionFilterOptions = {}
  ): FilteredQuestion[] {
    const {
      includeOptional = true,
      maxQuestions,
      excludeTypes = [],
      sortBy = 'orderIndex',
      sortOrder = 'asc'
    } = options;

    let questions: FilteredQuestion[] = templateQuestions
      .filter(q => {
        // Filter by required/optional
        if (!includeOptional && !q.required) {
          return false;
        }

        // Filter by excluded types
        if (excludeTypes.includes(q.type)) {
          return false;
        }

        return true;
      })
      .map((q, index) => ({
        id: `template_${templateId}_${index}`,
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
        templateId,
        templateName
      }));

    // Sort questions
    questions = this.sortQuestions(questions, sortBy, sortOrder);

    // Limit number of questions
    if (maxQuestions && maxQuestions > 0) {
      questions = questions.slice(0, maxQuestions);
    }

    return questions;
  }

  /**
   * Process direct questions (from Question collection)
   */
  static processDirectQuestions(
    questions: IQuestion[],
    options: QuestionFilterOptions = {}
  ): FilteredQuestion[] {
    const {
      includeOptional = true,
      maxQuestions,
      excludeTypes = [],
      sortBy = 'orderIndex',
      sortOrder = 'asc'
    } = options;

    let filteredQuestions: FilteredQuestion[] = questions
      .filter(q => {
        // Filter by active status
        if (!q.isActive) {
          return false;
        }

        // Filter by required/optional
        if (!includeOptional && !q.required) {
          return false;
        }

        // Filter by excluded types
        if (excludeTypes.includes(q.type)) {
          return false;
        }

        return true;
      })
      .map(q => ({
        id: q._id.toString(),
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
        isFromTemplate: false
      }));

    // Sort questions
    filteredQuestions = this.sortQuestions(filteredQuestions, sortBy, sortOrder);

    // Limit number of questions
    if (maxQuestions && maxQuestions > 0) {
      filteredQuestions = filteredQuestions.slice(0, maxQuestions);
    }

    return filteredQuestions;
  }

  /**
   * Sort questions by specified criteria
   */
  private static sortQuestions(
    questions: FilteredQuestion[],
    sortBy: 'orderIndex' | 'title' | 'type',
    sortOrder: 'asc' | 'desc'
  ): FilteredQuestion[] {
    return questions.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'orderIndex':
          comparison = a.orderIndex - b.orderIndex;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = a.orderIndex - b.orderIndex;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Validate question structure
   */
  static validateQuestion(question: FilteredQuestion): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!question.title || question.title.trim().length === 0) {
      errors.push('Question title is required');
    }

    if (!question.type) {
      errors.push('Question type is required');
    }

    // Type-specific validations
    switch (question.type) {
      case 'multipleChoice':
        if (!question.options || question.options.length === 0) {
          errors.push('Multiple choice questions must have options');
        }
        break;
      case 'rating':
      case 'scale':
        if (question.minValue === undefined || question.maxValue === undefined) {
          errors.push('Rating/scale questions must have min and max values');
        }
        if (question.minValue !== undefined && question.maxValue !== undefined && 
            question.minValue >= question.maxValue) {
          errors.push('Min value must be less than max value');
        }
        break;
    }

    // Order index validation
    if (question.orderIndex < 0) {
      errors.push('Order index must be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Reorder questions to ensure sequential order indices
   */
  static reorderQuestions(questions: FilteredQuestion[]): FilteredQuestion[] {
    return questions
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((question, index) => ({
        ...question,
        orderIndex: index
      }));
  }

  /**
   * Get question statistics
   */
  static getQuestionStats(questions: FilteredQuestion[]): {
    total: number;
    required: number;
    optional: number;
    byType: Record<string, number>;
  } {
    const stats = {
      total: questions.length,
      required: 0,
      optional: 0,
      byType: {} as Record<string, number>
    };

    questions.forEach(question => {
      if (question.required) {
        stats.required++;
      } else {
        stats.optional++;
      }

      stats.byType[question.type] = (stats.byType[question.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Filter questions by consultation type
   */
  static filterByConsultationType(
    questions: FilteredQuestion[]
  ): FilteredQuestion[] {
    // This could be extended to have type-specific filtering logic
    // For now, return all questions as the template selection handles consultation type
    return questions;
  }
}

export default QuestionFilteringEngine;