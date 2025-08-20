import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['admin', 'manager', 'viewer']).default('viewer'),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Authentication required' 
          } 
        },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    const users = await User.find({ role: { $in: ['admin', 'manager', 'viewer'] } })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Internal server error' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Authentication required' 
          } 
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userData = createUserSchema.parse(body);
    
    await connectToDatabase();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'User with this email already exists' 
          } 
        },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    // Create user
    const user = new User({
      ...userData,
      password: hashedPassword
    });
    
    await user.save();
    
    // Remove password from response
    const { password, ...userResponse } = user.toObject();
    
    return NextResponse.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid input data',
            details: error.issues 
          } 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Internal server error' 
        } 
      },
      { status: 500 }
    );
  }
}