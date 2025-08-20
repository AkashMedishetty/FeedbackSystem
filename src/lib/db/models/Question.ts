import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  _id: string;
  type: 'text' | 'rating' | 'multipleChoice' | 'yesNo' | 'scale' | 'email' | 'phone' | 'date';
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  orderIndex: number;
  isActive: boolean;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
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
  isActive: { 
    type: Boolean, 
    default: true 
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
}, { 
  timestamps: true,
  collection: 'questions'
});

// Indexes for performance
QuestionSchema.index({ orderIndex: 1, isActive: 1 });
QuestionSchema.index({ type: 1 });
QuestionSchema.index({ createdAt: -1 });

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);