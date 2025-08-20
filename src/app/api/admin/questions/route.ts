import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Question } from '@/models/Question';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('active');
    const department = searchParams.get('department');
    
    const filter: { isActive?: boolean; department?: string } = {};
    if (isActive !== null) {
      filter.isActive = isActive === 'true';
    }
    if (department) {
      filter.department = department;
    }

    const questions = await Question.find(filter)
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: questions
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
    
    // Validate required fields
    if (!body.type || !body.title) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Type and title are required' 
          } 
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get the next order index
    const lastQuestion = await Question.findOne().sort({ orderIndex: -1 });
    const orderIndex = lastQuestion ? lastQuestion.orderIndex + 1 : 0;

    const questionData = {
      ...body,
      orderIndex,
      isActive: true,
    };

    const question = new Question(questionData);
    await question.save();

    return NextResponse.json({
      success: true,
      data: question
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
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

export async function PUT(request: NextRequest) {
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
    
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Expected array of questions' 
          } 
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Update questions in bulk (for reordering)
    const bulkOps = body.map((question, index) => ({
      updateOne: {
        filter: { _id: question._id },
        update: { 
          ...question,
          orderIndex: index,
          updatedAt: new Date()
        }
      }
    }));

    await Question.bulkWrite(bulkOps);

    return NextResponse.json({
      success: true,
      data: { updated: body.length }
    });
  } catch (error) {
    console.error('Error updating questions:', error);
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