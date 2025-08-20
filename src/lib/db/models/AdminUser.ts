import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminUser extends Document {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  role: { 
    type: String, 
    required: true,
    enum: ['admin', 'manager', 'viewer'],
    default: 'viewer'
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true,
  collection: 'adminUsers'
});

// Index for performance (email index is automatically created by unique: true)
AdminUserSchema.index({ isActive: 1 });

export default mongoose.models.AdminUser || mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);