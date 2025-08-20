import { NextApiRequest, NextApiResponse } from 'next';
import { rateLimit } from '../../../lib/security/rateLimiting';
import { validateInput } from '../../../lib/security/inputSanitization';
import { encryptData } from '../../../lib/security/encryption';
import { auditTrail } from '../../../lib/compliance/auditTrail';

// Rate limiting for error reporting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 error reports per minute
  message: 'Too many error reports, please try again later'
});

interface ErrorReport {
  type: 'error' | 'performance';
  data: {
    id: string;
    message: string;
    stack?: string;
    context: {
      userId?: string;
      sessionId?: string;
      userAgent?: string;
      url?: string;
      timestamp: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      category: 'javascript' | 'network' | 'database' | 'authentication' | 'validation' | 'security' | 'performance';
      tags?: Record<string, string>;
      metadata?: Record<string, any>;
    };
    fingerprint: string;
    count: number;
    firstSeen: number;
    lastSeen: number;
  };
}

interface PerformanceIssue {
  type: 'performance';
  data: {
    id: string;
    type: 'slow_query' | 'memory_leak' | 'high_cpu' | 'slow_render' | 'large_bundle';
    description: string;
    value: number;
    threshold: number;
    context: {
      userId?: string;
      sessionId?: string;
      userAgent?: string;
      url?: string;
      timestamp: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      category: 'performance';
      tags?: Record<string, string>;
      metadata?: Record<string, any>;
    };
  };
}

type MonitoringReport = ErrorReport | PerformanceIssue;

// In-memory storage for demonstration (in production, use a proper database)
const errorStorage = new Map<string, ErrorReport['data']>();
const performanceStorage: PerformanceIssue['data'][] = [];
const MAX_STORED_ERRORS = 10000;
const MAX_STORED_PERFORMANCE = 5000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Apply rate limiting
  try {
    await limiter(req, res);
  } catch (error) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  if (req.method === 'POST') {
    try {
      // Validate and sanitize input
      const report = validateInput(req.body) as MonitoringReport;
      
      if (!report || !report.type || !report.data) {
        return res.status(400).json({ error: 'Invalid report format' });
      }

      // Process error reports
      if (report.type === 'error') {
        const errorReport = report as ErrorReport;
        const { data } = errorReport;
        
        // Validate required fields
        if (!data.id || !data.message || !data.context) {
          return res.status(400).json({ error: 'Missing required error fields' });
        }

        // Store or update error
        const existingError = errorStorage.get(data.fingerprint);
        if (existingError) {
          existingError.count += data.count || 1;
          existingError.lastSeen = data.lastSeen || Date.now();
          existingError.context = data.context; // Update with latest context
        } else {
          const errorData = {
            ...data,
            encryptedStack: data.stack ? await encryptData(data.stack) : undefined
          };
          errorStorage.set(data.fingerprint, errorData);
          
          // Limit stored errors
          if (errorStorage.size > MAX_STORED_ERRORS) {
            const oldestKey = errorStorage.keys().next().value;
            if (oldestKey) {
              errorStorage.delete(oldestKey);
            }
          }
        }

        // Log critical errors to audit trail
        if (data.context.severity === 'critical') {
          await auditTrail.logEvent(
            'critical_error_reported',
            'system',
            data.id,
            data.context.userId,
            {
              message: data.message,
              category: data.context.category,
              url: data.context.url,
              userAgent: data.context.userAgent,
              fingerprint: data.fingerprint,
              count: data.count,
              severity: data.context.severity
            }
          );
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Error report received',
          id: data.id
        });
      }

      // Process performance issues
      if (report.type === 'performance') {
        const performanceReport = report as PerformanceIssue;
        const { data } = performanceReport;
        
        // Validate required fields
        if (!data.id || !data.description || !data.context) {
          return res.status(400).json({ error: 'Missing required performance fields' });
        }

        // Store performance issue
        performanceStorage.push(data);
        
        // Limit stored performance issues
        if (performanceStorage.length > MAX_STORED_PERFORMANCE) {
          performanceStorage.shift();
        }

        // Log critical performance issues to audit trail
        if (data.context.severity === 'critical') {
          await auditTrail.logEvent(
            'critical_performance_issue',
            'system',
            data.id,
            data.context.userId,
            {
              type: data.type,
              description: data.description,
              value: data.value,
              threshold: data.threshold,
              url: data.context.url,
              severity: data.context.severity,
              category: data.context.category
            }
          );
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Performance issue reported',
          id: data.id
        });
      }

      return res.status(400).json({ error: 'Unknown report type' });

    } catch (error: unknown) {
      console.error('Error processing monitoring report:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET') {
    try {
      // Return monitoring statistics (for admin users only)
      const { type, limit = '50' } = req.query;
      const limitNum = parseInt(limit as string, 10);

      if (type === 'errors') {
        const errors = Array.from(errorStorage.values())
          .sort((a, b) => b.lastSeen - a.lastSeen)
          .slice(0, limitNum);
        
        return res.status(200).json({
          success: true,
          data: errors,
          total: errorStorage.size
        });
      }

      if (type === 'performance') {
        const issues = performanceStorage
          .sort((a, b) => b.context.timestamp - a.context.timestamp)
          .slice(0, limitNum);
        
        return res.status(200).json({
          success: true,
          data: issues,
          total: performanceStorage.length
        });
      }

      if (type === 'stats') {
        const errors = Array.from(errorStorage.values());
        const totalErrors = errors.reduce((sum, error) => sum + error.count, 0);
        const criticalErrors = errors.filter(error => error.context.severity === 'critical').length;
        const recentErrors = errors.filter(error => 
          error.lastSeen > Date.now() - (60 * 60 * 1000) // Last hour
        ).length;

        const errorsByCategory = errors.reduce((acc, error) => {
          acc[error.context.category] = (acc[error.context.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const errorsBySeverity = errors.reduce((acc, error) => {
          acc[error.context.severity] = (acc[error.context.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const recentPerformanceIssues = performanceStorage.filter(issue => 
          issue.context.timestamp > Date.now() - (60 * 60 * 1000) // Last hour
        ).length;

        return res.status(200).json({
          success: true,
          data: {
            errors: {
              totalUniqueErrors: errorStorage.size,
              totalErrorOccurrences: totalErrors,
              criticalErrors,
              recentErrors,
              errorsByCategory,
              errorsBySeverity
            },
            performance: {
              totalIssues: performanceStorage.length,
              recentIssues: recentPerformanceIssues
            },
            lastUpdated: new Date().toISOString()
          }
        });
      }

      // Return overview by default
      return res.status(200).json({
        success: true,
        data: {
          totalErrors: errorStorage.size,
          totalPerformanceIssues: performanceStorage.length,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error: unknown) {
      console.error('Error retrieving monitoring data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Clear monitoring data (admin only)
      const { type } = req.query;

      if (type === 'errors') {
        errorStorage.clear();
        return res.status(200).json({ 
          success: true, 
          message: 'Error data cleared' 
        });
      }

      if (type === 'performance') {
        performanceStorage.length = 0;
        return res.status(200).json({ 
          success: true, 
          message: 'Performance data cleared' 
        });
      }

      if (type === 'all') {
        errorStorage.clear();
        performanceStorage.length = 0;
        return res.status(200).json({ 
          success: true, 
          message: 'All monitoring data cleared' 
        });
      }

      return res.status(400).json({ error: 'Invalid clear type' });

    } catch (error: unknown) {
      console.error('Error clearing monitoring data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}

// Export storage for testing purposes
export { errorStorage, performanceStorage };