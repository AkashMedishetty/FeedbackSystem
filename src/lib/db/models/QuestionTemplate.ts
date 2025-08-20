import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplateQuestion {
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
}

export interface IQuestionTemplate extends Document {
  _id: string;
  name: string;
  description?: string;
  department: string;
  consultationType: 'first-visit' | 'follow-up' | 'regular' | 'custom';
  consultationNumberRange: {
    min: number;
    max?: number;
  };
  isDefault: boolean;
  questions: ITemplateQuestion[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateQuestionSchema = new Schema<ITemplateQuestion>({
  type: { 
    type: String, 
    required: true, 
    enum: ['text', 'rating', 'multipleChoice', 'yesNo', 'scale', 'email', 'phone', 'date'] 
  },
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 500
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  required: { 
    type: Boolean, 
    default: false 
  },
  options: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  minValue: {
    type: Number,
    min: 0
  },
  maxValue: {
    type: Number,
    min: 1
  },
  orderIndex: { 
    type: Number, 
    required: true,
    min: 0
  },
  placeholder: {
    type: String,
    trim: true,
    maxlength: 200
  },
  validation: {
    minLength: {
      type: Number,
      min: 0
    },
    maxLength: {
      type: Number,
      min: 1
    },
    pattern: {
      type: String,
      maxlength: 500
    }
  }
}, { _id: false });

const QuestionTemplateSchema = new Schema<IQuestionTemplate>({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  department: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  consultationType: {
    type: String,
    required: true,
    enum: ['first-visit', 'follow-up', 'regular', 'custom']
  },
  consultationNumberRange: {
    min: {
      type: Number,
      required: true,
      min: 1
    },
    max: {
      type: Number,
      min: 1
    }
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  questions: [TemplateQuestionSchema],
  createdBy: { 
    type: String, 
    required: true,
    ref: 'AdminUser'
  }
}, { 
  timestamps: true,
  collection: 'questionTemplates'
});

// Indexes for performance
QuestionTemplateSchema.index({ department: 1, consultationType: 1 });
QuestionTemplateSchema.index({ isDefault: 1 });
QuestionTemplateSchema.index({ createdAt: -1 });

export default mongoose.models.QuestionTemplate || mongoose.model<IQuestionTemplate>('QuestionTemplate', QuestionTemplateSchema);