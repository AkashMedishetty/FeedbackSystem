import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import FeedbackSession from '@/lib/db/models/FeedbackSession';
import Patient from '@/lib/db/models/Patient';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '7'; // days
    const consultationType = searchParams.get('consultationType');
    
    // Get date ranges
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysBack = parseInt(dateRange);
    const startOfPeriod = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
    // Build match conditions
    const matchConditions: Record<string, unknown> = {};
    if (consultationType && consultationType !== 'all') {
      matchConditions.questionnaireType = consultationType;
    }

    // Total responses
    const totalResponses = await FeedbackSession.countDocuments(matchConditions);

    // Total patients
    const totalPatients = await Patient.countDocuments();

    // Today's responses
    const todayResponses = await FeedbackSession.countDocuments({
      ...matchConditions,
      createdAt: { $gte: startOfToday }
    });

    // Period responses for growth calculation
    const periodResponses = await FeedbackSession.countDocuments({
      ...matchConditions,
      createdAt: { $gte: startOfPeriod }
    });
    const previousPeriodResponses = await FeedbackSession.countDocuments({
      ...matchConditions,
      createdAt: { 
        $gte: new Date(startOfPeriod.getTime() - daysBack * 24 * 60 * 60 * 1000),
        $lt: startOfPeriod
      }
    });

    // Calculate growth
    const growthRate = previousPeriodResponses > 0 
      ? Math.round(((periodResponses - previousPeriodResponses) / previousPeriodResponses) * 100)
      : periodResponses > 0 ? 100 : 0;

    // Average rating calculation with consultation type filter
    const ratingAggregation = await FeedbackSession.aggregate([
      { $match: matchConditions },
      { $unwind: '$responses' },
      { 
        $match: { 
          'responses.questionType': 'rating',
          'responses.responseNumber': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$responses.responseNumber' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const averageRating = ratingAggregation.length > 0 ? ratingAggregation[0].averageRating : 0;

    // Responses by day for the selected period
    const responsesByDay = await FeedbackSession.aggregate([
      {
        $match: {
          ...matchConditions,
          createdAt: { $gte: startOfPeriod }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Rating distribution
    const ratingDistribution = await FeedbackSession.aggregate([
      { $match: matchConditions },
      { $unwind: '$responses' },
      { 
        $match: { 
          'responses.questionType': 'rating',
          'responses.responseNumber': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$responses.responseNumber',
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Consultation type distribution
    const consultationTypeDistribution = await FeedbackSession.aggregate([
      {
        $group: {
          _id: '$questionnaireType',
          count: { $sum: 1 },
          averageRating: {
            $avg: {
              $avg: {
                $map: {
                  input: {
                    $filter: {
                      input: '$responses',
                      cond: { 
                        $and: [
                          { $eq: ['$$this.questionType', 'rating'] },
                          { $ne: ['$$this.responseNumber', null] }
                        ]
                      }
                    }
                  },
                  as: 'response',
                  in: '$$response.responseNumber'
                }
              }
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Monthly trend (last 12 months)
    const monthlyTrend = await FeedbackSession.aggregate([
      {
        $match: {
          ...matchConditions,
          createdAt: { $gte: new Date(today.getFullYear() - 1, today.getMonth(), 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          averageRating: {
            $avg: {
              $avg: {
                $map: {
                  input: {
                    $filter: {
                      input: '$responses',
                      cond: { 
                        $and: [
                          { $eq: ['$$this.questionType', 'rating'] },
                          { $ne: ['$$this.responseNumber', null] }
                        ]
                      }
                    }
                  },
                  as: 'response',
                  in: '$$response.responseNumber'
                }
              }
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top questions by response rate
    const questionAnalytics = await FeedbackSession.aggregate([
      { $match: matchConditions },
      { $unwind: '$responses' },
      {
        $group: {
          _id: {
            questionId: '$responses.questionId',
            questionTitle: '$responses.questionTitle',
            questionType: '$responses.questionType'
          },
          responseCount: { $sum: 1 },
          averageRating: {
            $avg: {
              $cond: [
                { $eq: ['$responses.questionType', 'rating'] },
                '$responses.responseNumber',
                null
              ]
            }
          }
        }
      },
      { $sort: { responseCount: -1 } },
      { $limit: 10 }
    ]);

    // Recent feedback (last 10)
    const recentFeedback = await FeedbackSession.find(matchConditions)
      .populate('patientId', 'name mobileNumber')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('patientId consultationNumber createdAt responses questionnaireType');

    const stats = {
      totalResponses,
      totalPatients,
      averageRating: Math.round(averageRating * 10) / 10,
      todayResponses,
      growthRate: growthRate > 0 ? `+${growthRate}%` : `${growthRate}%`,
      responsesByDay: responsesByDay.map(item => ({
        date: item._id,
        count: item.count
      })),
      ratingDistribution: ratingDistribution.map(item => ({
        rating: item._id,
        count: item.count,
        percentage: Math.round((item.count / (ratingAggregation[0]?.totalRatings || 1)) * 100)
      })),
      consultationTypeDistribution: consultationTypeDistribution.map(item => ({
        type: item._id,
        count: item.count,
        averageRating: Math.round((item.averageRating || 0) * 10) / 10,
        percentage: Math.round((item.count / totalResponses) * 100)
      })),
      monthlyTrend: monthlyTrend.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        count: item.count,
        averageRating: Math.round((item.averageRating || 0) * 10) / 10
      })),
      questionAnalytics: questionAnalytics.map(item => ({
        questionId: item._id.questionId,
        questionTitle: item._id.questionTitle,
        questionType: item._id.questionType,
        responseCount: item.responseCount,
        averageRating: item.averageRating ? Math.round(item.averageRating * 10) / 10 : null
      })),
      recentFeedback: recentFeedback.map(feedback => ({
        id: feedback._id,
        patientName: feedback.patientId?.name || 'Unknown',
        mobileNumber: feedback.mobileNumber,
        consultationNumber: feedback.consultationNumber,
        consultationType: feedback.questionnaireType,
        createdAt: feedback.createdAt,
        averageRating: feedback.responses
          .filter((r: { questionType: string; responseNumber?: number }) => r.questionType === 'rating' && r.responseNumber)
          .reduce((sum: number, r: { responseNumber?: number }, _: number, arr: { responseNumber?: number }[]) => 
            arr.length > 0 ? sum + (r.responseNumber || 0) / arr.length : 0, 0)
      }))
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Failed to fetch dashboard statistics' 
        } 
      },
      { status: 500 }
    );
  }
}