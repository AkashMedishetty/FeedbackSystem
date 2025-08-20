import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import Question from '@/lib/db/models/Question';
import { ApiResponse, IQuestion } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    const question = await Question.findById(id).lean();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found'
          }
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<IQuestion> = {
      success: true,
      data: {
        ...question,
        _id: String((question as { _id: unknown })._id),
      } as unknown as IQuestion
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch question'
        }
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.title) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Type and title are required'
          }
        },
        { status: 400 }
      );
    }

    await connectDB();

    const question = await Question.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found'
          }
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<IQuestion> = {
      success: true,
      data: {
        ...question.toObject(),
        _id: question._id.toString(),
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update question'
        }
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    const question = await Question.findByIdAndDelete(id);

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found'
          }
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete question'
        }
      },
      { status: 500 }
    );
  }
}