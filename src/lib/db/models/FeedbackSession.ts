import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedbackResponse {
  questionId: string;
  questionTitle: string;
  questionType: string;
  responseText?: string;
  responseNumber?: number;
  createdAt: Date;
}

export interface IFeedbackSession extends Document {
  _id: string;
  patientId: string;
  mobileNumber: string;
  consultationNumber: number;
  consultationDate?: Date;
  submittedAt: Date;
  isSynced: boolean;
  questionnaireType: string;
  responses: IFeedbackResponse[];
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackResponseSchema = new Schema<IFeedbackResponse>({
  questionId: { 
    type: String, 
    required: true 
  },
  questionTitle: { 
    type: String, 
    required: true,
    trim: true
  },
  questionType: { 
    type: String, 
    required: true 
  },
  responseText: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  responseNumber: {
    type: Number
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: false });

const FeedbackSessionSchema = new Schema<IFeedbackSession>({
  patientId: { 
    type: String, 
    required: true,
    ref: 'Patient'
  },
  mobileNumber: { 
    type: String, 
    required: true,
    trim: true
  },
  consultationNumber: {
    type: Number,
    required: true,
    min: 1
  },
  consultationDate: {
    type: Date
  },
  submittedAt: { 
    type: Date, 
    default: Date.now 
  },
  isSynced: { 
    type: Boolean, 
    default: true 
  },
  questionnaireType: {
    type: String,
    required: true,
    enum: ['first-visit', 'follow-up', 'regular', 'custom'],
    default: 'regular'
  },
  responses: [FeedbackResponseSchema]
}, { 
  timestamps: true,
  collection: 'feedbackSessions'
});

// Indexes for performance
FeedbackSessionSchema.index({ patientId: 1, consultationNumber: 1 });
FeedbackSessionSchema.index({ mobileNumber: 1, createdAt: -1 });
FeedbackSessionSchema.index({ submittedAt: -1 });
FeedbackSessionSchema.index({ isSynced: 1 });

export default mongoose.models.FeedbackSession || mongoose.model<IFeedbackSession>('FeedbackSession', FeedbackSessionSchema);