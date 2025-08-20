import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db/connection';
import { performanceMonitor } from '@/lib/performance/performanceMonitor';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      responseTime?: number;
    };
    performance: {
      status: 'monitoring' | 'disabled';
      score?: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
    responseTime?: number;
  }[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const checks: HealthCheckResponse['checks'] = [];
  
  try {
    // Database health check
    let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    let dbResponseTime: number | undefined;
    
    try {
      const dbStartTime = Date.now();
      await connectDB();
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = 'connected';
      
      checks.push({
        name: 'database_connection',
        status: 'pass',
        responseTime: dbResponseTime
      });
    } catch (error) {
      dbStatus = 'error';
      checks.push({
        name: 'database_connection',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Database connection failed'
      });
    }

    // Performance monitoring check
    let performanceStatus: 'monitoring' | 'disabled' = 'disabled';
    let performanceScore: number | undefined;
    
    try {
      performanceScore = performanceMonitor.getPerformanceScore();
      performanceStatus = 'monitoring';
      
      checks.push({
        name: 'performance_monitoring',
        status: 'pass',
        message: `Score: ${performanceScore}`
      });
    } catch (error) {
      checks.push({
        name: 'performance_monitoring',
        status: 'fail',
        message: 'Performance monitoring unavailable'
      });
    }

    // Memory usage check
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
    
    checks.push({
      name: 'memory_usage',
      status: memoryPercentage < 90 ? 'pass' : 'fail',
      message: `${memoryPercentage}% used (${memoryUsedMB}MB / ${memoryTotalMB}MB)`
    });

    // Environment variables check
    const requiredEnvVars = [
      'MONGODB_URI',
      'NEXTAUTH_SECRET',
      'JWT_SECRET'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    checks.push({
      name: 'environment_variables',
      status: missingEnvVars.length === 0 ? 'pass' : 'fail',
      message: missingEnvVars.length > 0 
        ? `Missing: ${missingEnvVars.join(', ')}` 
        : 'All required environment variables present'
    });

    // API response time check
    const responseTime = Date.now() - startTime;
    checks.push({
      name: 'api_response_time',
      status: responseTime < 1000 ? 'pass' : 'fail',
      responseTime,
      message: `${responseTime}ms`
    });

    // Determine overall health status
    const failedChecks = checks.filter(check => check.status === 'fail');
    const overallStatus: 'healthy' | 'unhealthy' = failedChecks.length === 0 ? 'healthy' : 'unhealthy';

    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      services: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime
        },
        performance: {
          status: performanceStatus,
          score: performanceScore
        },
        memory: {
          used: memoryUsedMB,
          total: memoryTotalMB,
          percentage: memoryPercentage
        }
      },
      checks
    };

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    // Add cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(statusCode).json(healthResponse);
    
  } catch (error: unknown) {
    console.error('Health check failed:', error);
    
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      services: {
        database: {
          status: 'error'
        },
        performance: {
          status: 'disabled'
        },
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        }
      },
      checks: [
        {
          name: 'health_check_execution',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Health check execution failed'
        }
      ]
    };
    
    return res.status(503).json(errorResponse);
  }
}