import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import FeedbackSession from '@/lib/db/models/FeedbackSession';
import Patient from '@/lib/db/models/Patient';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const mobileNumber = searchParams.get('mobileNumber');
    const consultationNumber = searchParams.get('consultationNumber');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const department = searchParams.get('department');
    const searchQuery = searchParams.get('search') || searchParams.get('searchQuery');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'submittedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    await connectDB();
    
    // Ensure Patient model is registered
    Patient;

    // Build query filters
    const query: Record<string, unknown> = {};
    
    if (mobileNumber) {
      query.mobileNumber = { $regex: mobileNumber, $options: 'i' };
    }
    
    if (consultationNumber) {
      query.consultationNumber = parseInt(consultationNumber);
    }

    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (dateFrom) {
        dateQuery.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateQuery.$lte = new Date(dateTo);
      }
      query.submittedAt = dateQuery;
    }

    if (department) {
      query.questionnaireType = department;
    }

    // Handle search query - search across multiple fields
    if (searchQuery && searchQuery.trim()) {
      const searchRegex = { $regex: searchQuery.trim(), $options: 'i' };
      
      // First, find patients that match the search query
      const matchingPatients = await Patient.find({
        $or: [
          { name: searchRegex },
          { mobileNumber: searchRegex }
        ]
      }).select('_id');
      
      const patientIds = matchingPatients.map(p => p._id);
      
      // Build search conditions with proper typing
      const searchConditions: Array<Record<string, any>> = [
        { mobileNumber: searchRegex },
        { questionnaireType: searchRegex }
      ];
      
      // Add patient ID matches if any patients were found
      if (patientIds.length > 0) {
        searchConditions.push({ patientId: { $in: patientIds } });
      }
      
      // Add to existing query with $and to combine with other filters
      if (Object.keys(query).length > 0) {
        query.$and = [
          { ...query },
          { $or: searchConditions }
        ];
        // Remove the individual conditions since they're now in $and
        Object.keys(query).forEach(key => {
          if (key !== '$and') {
            delete query[key];
          }
        });
      } else {
        query.$or = searchConditions;
      }
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get feedback sessions with patient information
    const sessions = await FeedbackSession.find(query)
      .sort(sort)
      .limit(limit)
      .skip(offset)
      .populate('patientId', 'name mobileNumber age gender')
      .lean();

    const total = await FeedbackSession.countDocuments(query);

    // Get aggregated statistics
    const stats = await FeedbackSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          uniquePatients: { $addToSet: '$patientId' },
          avgResponsesPerSession: { $avg: { $size: '$responses' } },
          consultationDistribution: {
            $push: '$consultationNumber'
          }
        }
      },
      {
        $project: {
          totalSessions: 1,
          uniquePatients: { $size: '$uniquePatients' },
          avgResponsesPerSession: { $round: ['$avgResponsesPerSession', 2] },
          consultationDistribution: 1
        }
      }
    ]);

    // Calculate rating statistics from responses
    const ratingStats = await FeedbackSession.aggregate([
      { $match: query },
      { $unwind: '$responses' },
      {
        $match: {
          'responses.questionType': { $in: ['rating', 'scale'] },
          'responses.responseNumber': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$responses.responseNumber' },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$responses.responseNumber'
          }
        }
      }
    ]);

    const response: ApiResponse<{
      sessions: typeof sessions;
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
      statistics: {
        totalSessions: number;
        uniquePatients: number;
        avgResponsesPerSession: number;
        avgRating: number;
        totalRatings: number;
      };
    }> = {
      success: true,
      data: {
        sessions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        statistics: {
          totalSessions: stats[0]?.totalSessions || 0,
          uniquePatients: stats[0]?.uniquePatients || 0,
          avgResponsesPerSession: stats[0]?.avgResponsesPerSession || 0,
          avgRating: ratingStats[0]?.avgRating || 0,
          totalRatings: ratingStats[0]?.totalRatings || 0
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching admin feedback:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch feedback data' 
        } 
      },
      { status: 500 }
    );
  }
}