import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Question } from '@/models/Question';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('active');
    const department = searchParams.get('department');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    // Build query filter
    const filter: Record<string, unknown> = {};
    
    if (isActive !== null) {
      filter.isActive = isActive === 'true';
    }
    
    if (department) {
      filter.department = department;
    }

    // Get questions with pagination
    const questions = await Question.find(filter)
      .sort({ orderIndex: 1, createdAt: 1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await Question.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: {
        questions: questions.map((q: any) => ({
          _id: q._id.toString(),
          title: q.title,
          type: q.type,
          description: q.description,
          required: q.required,
          options: q.options,
          minValue: q.minValue,
          maxValue: q.maxValue,
          order: q.orderIndex || 0,
          isActive: q.isActive,
          department: q.department,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
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

export async function POST() {
  return NextResponse.json(
    { 
      success: false,
      error: {
        message: 'Method not allowed'
      }
    },
    { status: 405 }
  );
}