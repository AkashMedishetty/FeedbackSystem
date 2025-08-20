import mongoose, { Schema, Document } from 'mongoose';

export interface IHospitalSettings extends Document {
  _id: string;
  hospitalName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  welcomeMessage: string;
  thankYouMessage: string;
  contactInfo?: string;
  theme: 'light' | 'dark' | 'high-contrast';
  language: string;
  sessionTimeout: number;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSettingsSchema = new Schema<IHospitalSettings>({
  hospitalName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  logo: {
    type: String,
    trim: true
  },
  primaryColor: { 
    type: String, 
    default: '#3B82F6',
    match: /^#[0-9A-F]{6}$/i
  },
  secondaryColor: { 
    type: String, 
    default: '#1F2937',
    match: /^#[0-9A-F]{6}$/i
  },
  accentColor: { 
    type: String, 
    default: '#10B981',
    match: /^#[0-9A-F]{6}$/i
  },
  welcomeMessage: { 
    type: String, 
    default: 'Welcome! Please share your feedback.',
    trim: true,
    maxlength: 500
  },
  thankYouMessage: { 
    type: String, 
    default: 'Thank you for your valuable feedback!',
    trim: true,
    maxlength: 500
  },
  contactInfo: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  theme: { 
    type: String, 
    enum: ['light', 'dark', 'high-contrast'], 
    default: 'light' 
  },
  language: { 
    type: String, 
    default: 'en',
    maxlength: 10
  },
  sessionTimeout: { 
    type: Number, 
    default: 5,
    min: 1,
    max: 60
  }
}, { 
  timestamps: true,
  collection: 'hospitalSettings'
});

export default mongoose.models.HospitalSettings || mongoose.model<IHospitalSettings>('HospitalSettings', HospitalSettingsSchema);