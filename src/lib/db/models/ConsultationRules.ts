import mongoose, { Schema, Document } from 'mongoose';

export interface IConsultationRule {
  consultationNumber: number;
  templateId: string;
  templateName: string;
  description: string;
}

export interface IConsultationRules extends Document {
  _id: string;
  department: string;
  rules: IConsultationRule[];
  defaultTemplateId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationRuleSchema = new Schema<IConsultationRule>({
  consultationNumber: {
    type: Number,
    required: true,
    min: 1
  },
  templateId: {
    type: String,
    required: true,
    ref: 'QuestionTemplate'
  },
  templateName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  }
}, { _id: false });

const ConsultationRulesSchema = new Schema<IConsultationRules>({
  department: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  rules: [ConsultationRuleSchema],
  defaultTemplateId: {
    type: String,
    required: true,
    ref: 'QuestionTemplate'
  },
  createdBy: {
    type: String,
    required: true,
    ref: 'AdminUser'
  }
}, { 
  timestamps: true,
  collection: 'consultationRules'
});

// Indexes for performance
// Note: department field already has unique index from unique: true
ConsultationRulesSchema.index({ 'rules.consultationNumber': 1 });

export default mongoose.models.ConsultationRules || mongoose.model<IConsultationRules>('ConsultationRules', ConsultationRulesSchema);