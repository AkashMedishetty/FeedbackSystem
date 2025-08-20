import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB } from '@/lib/db/connection';
import FeedbackSession from '@/lib/db/models/FeedbackSession';

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
    const format = searchParams.get('format') || 'csv'; // csv or json
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const consultationType = searchParams.get('consultationType');
    const includePersonalData = searchParams.get('includePersonalData') === 'true';

    // Build match conditions
    const matchConditions: Record<string, unknown> = {};
    
    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (dateFrom) createdAtFilter.$gte = new Date(dateFrom);
      if (dateTo) createdAtFilter.$lte = new Date(dateTo);
      matchConditions.createdAt = createdAtFilter;
    }
    
    if (consultationType && consultationType !== 'all') {
      matchConditions.questionnaireType = consultationType;
    }

    // Fetch feedback data
    const feedbackData = await FeedbackSession.find(matchConditions)
      .populate('patientId', includePersonalData ? 'name mobileNumber age gender' : 'mobileNumber')
      .sort({ createdAt: -1 })
      .lean();

    // Transform data for export
    const exportData = feedbackData.flatMap(session => 
      session.responses.map((response: { questionId: string; questionTitle: string; questionType: string; responseText?: string; responseNumber?: number; createdAt: Date }) => ({
        submissionId: session._id,
        mobileNumber: includePersonalData ? session.patientId?.mobileNumber : '***masked***',
        patientName: includePersonalData ? session.patientId?.name : '***masked***',
        age: includePersonalData ? session.patientId?.age : null,
        gender: includePersonalData ? session.patientId?.gender : null,
        consultationNumber: session.consultationNumber,
        consultationType: session.questionnaireType,
        submittedAt: session.submittedAt,
        questionId: response.questionId,
        questionTitle: response.questionTitle,
        questionType: response.questionType,
        responseText: response.responseText || '',
        responseNumber: response.responseNumber || null,
        responseDate: response.createdAt
      }))
    );

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Submission ID',
        'Mobile Number',
        ...(includePersonalData ? ['Patient Name', 'Age', 'Gender'] : []),
        'Consultation Number',
        'Consultation Type',
        'Submitted At',
        'Question ID',
        'Question Title',
        'Question Type',
        'Response Text',
        'Response Number',
        'Response Date'
      ];

      const csvRows = [
        headers.join(','),
        ...exportData.map(row => [
          row.submissionId,
          `"${row.mobileNumber}"`,
          ...(includePersonalData ? [
            `"${row.patientName || ''}"`,
            row.age || '',
            `"${row.gender || ''}"`
          ] : []),
          row.consultationNumber,
          `"${row.consultationType}"`,
          new Date(row.submittedAt).toISOString(),
          row.questionId,
          `"${row.questionTitle.replace(/"/g, '""')}"`,
          `"${row.questionType}"`,
          `"${(row.responseText || '').replace(/"/g, '""')}"`,
          row.responseNumber || '',
          new Date(row.responseDate).toISOString()
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const filename = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    } else {
      // Return JSON format
      const filename = `feedback-export-${new Date().toISOString().split('T')[0]}.json`;
      
      return NextResponse.json({
        success: true,
        data: {
          exportDate: new Date().toISOString(),
          totalRecords: exportData.length,
          filters: {
            dateFrom,
            dateTo,
            consultationType,
            includePersonalData
          },
          records: exportData
        }
      }, {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

  } catch (error) {
    console.error('Error exporting feedback data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'EXPORT_ERROR', 
          message: 'Failed to export feedback data' 
        } 
      },
      { status: 500 }
    );
  }
}