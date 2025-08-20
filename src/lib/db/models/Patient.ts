import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  _id: string;
  mobileNumber: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  email?: string;
  address?: string;
  emergencyContact?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>({
  mobileNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    match: /^[+]?[\d\s\-()]+$/
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  age: { 
    type: Number, 
    required: true,
    min: 0,
    max: 150
  },
  gender: { 
    type: String, 
    required: true, 
    enum: ['male', 'female', 'other'] 
  },
  dateOfBirth: { 
    type: Date, 
    required: true 
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  address: {
    type: String,
    trim: true,
    maxlength: 500
  },
  emergencyContact: {
    type: String,
    trim: true,
    match: /^[+]?[\d\s\-()]+$/
  }
}, { 
  timestamps: true,
  collection: 'patients'
});

// Index for performance (mobileNumber index is automatically created by unique: true)
PatientSchema.index({ createdAt: -1 });

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);