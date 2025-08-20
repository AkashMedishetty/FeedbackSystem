import { connectDB } from '@/lib/db/connection';
import AdminUser from '@/lib/db/models/AdminUser';
import { hashPassword } from './index';
import { z } from 'zod';

const createAdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'manager', 'viewer']).default('viewer'),
});

export interface CreateAdminUserData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'manager' | 'viewer';
}

export async function createAdminUser(data: CreateAdminUserData) {
  const validatedData = createAdminSchema.parse(data);
  
  await connectDB();

  // Check if user already exists
  const existingUser = await AdminUser.findOne({ 
    email: validatedData.email.toLowerCase() 
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(validatedData.password);

  // Create user
  const user = new AdminUser({
    email: validatedData.email.toLowerCase(),
    passwordHash,
    name: validatedData.name,
    role: validatedData.role,
    isActive: true,
  });

  await user.save();

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export async function updateAdminUser(
  userId: string, 
  updates: Partial<Omit<CreateAdminUserData, 'password'>> & { password?: string }
) {
  await connectDB();

  const user = await AdminUser.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Update fields
  if (updates.email) {
    // Check if email is already taken by another user
    const existingUser = await AdminUser.findOne({ 
      email: updates.email.toLowerCase(),
      _id: { $ne: userId }
    });
    if (existingUser) {
      throw new Error('Email already taken by another user');
    }
    user.email = updates.email.toLowerCase();
  }

  if (updates.name) {
    user.name = updates.name;
  }

  if (updates.role) {
    user.role = updates.role;
  }

  if (updates.password) {
    user.passwordHash = await hashPassword(updates.password);
  }

  await user.save();

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    updatedAt: user.updatedAt,
  };
}

export async function deactivateAdminUser(userId: string) {
  await connectDB();

  const user = await AdminUser.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true }
  );

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  };
}

export async function listAdminUsers() {
  await connectDB();

  const users = await AdminUser.find({}, { passwordHash: 0 })
    .sort({ createdAt: -1 });

  return users.map(user => ({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
}