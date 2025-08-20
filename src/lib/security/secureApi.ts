import { NextRequest, NextResponse } from 'next/server';
import { sanitizeFeedbackData, sanitizePatientData } from './sanitization';
import { encryptData, decryptData, generateHash, verifyHash } from './encryption';

export interface SecureApiOptions {
  requireAuth?: boolean;
  validateCSRF?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  sanitizeBody?: boolean;
  encryptResponse?: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class SecureApiHandler {
  private static instance: SecureApiHandler;
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  static getInstance(): SecureApiHandler {
    if (!SecureApiHandler.instance) {
      SecureApiHandler.instance = new SecureApiHandler();
    }
    return SecureApiHandler.instance;
  }

  /**
   * Validates request headers for security
   */
  private validateHeaders(request: NextRequest): { isValid: boolean; error?: string } {
    const contentType = request.headers.get('content-type');
    const userAgent = request.headers.get('user-agent');
    
    // Check for suspicious user agents
    if (!userAgent || userAgent.length < 10) {
      return { isValid: false, error: 'Invalid user agent' };
    }
    
    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      if (!contentType || !contentType.includes('application/json')) {
        return { isValid: false, error: 'Invalid content type' };
      }
    }
    
    return { isValid: true };
  }

  /**
   * Implements rate limiting
   */
  private checkRateLimit(
    request: NextRequest,
    options: { windowMs: number; maxRequests: number }
  ): { allowed: boolean; resetTime?: number } {
    const ip = this.getClientIP(request);
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;
    
    const record = this.rateLimitMap.get(key);
    
    if (!record || record.resetTime < windowStart) {
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return { allowed: true };
    }
    
    if (record.count >= options.maxRequests) {
      return { allowed: false, resetTime: record.resetTime };
    }
    
    record.count++;
    return { allowed: true };
  }

  /**
   * Gets client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return request.headers.get('x-real-ip') || 'unknown';
  }

  /**
   * Validates CSRF token
   */
  private validateCSRF(request: NextRequest): boolean {
    const token = request.headers.get('x-csrf-token');
    const cookie = request.cookies.get('csrf-token')?.value;
    
    if (!token || !cookie) {
      return false;
    }
    
    return token === cookie;
  }

  /**
   * Sanitizes request body based on endpoint type
   */
  private sanitizeRequestBody(body: any, endpoint: string): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    // Determine sanitization strategy based on endpoint
    if (endpoint.includes('feedback')) {
      return sanitizeFeedbackData(body);
    }
    
    if (endpoint.includes('patient')) {
      return sanitizePatientData(body);
    }
    
    // General sanitization for other endpoints
    const sanitized = { ...body };
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitized[key].trim();
      }
    });
    
    return sanitized;
  }

  /**
   * Creates a secure API response
   */
  private createSecureResponse(
    data: any,
    status: number = 200,
    options: { encrypt?: boolean; hash?: boolean } = {}
  ): NextResponse {
    let responseData = data;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    };
    
    // Encrypt sensitive data if requested
    if (options.encrypt && data) {
      try {
        responseData = {
          encrypted: true,
          data: encryptData(JSON.stringify(data))
        };
      } catch (error) {
        console.error('Response encryption failed:', error);
      }
    }
    
    // Add data integrity hash if requested
    if (options.hash && responseData) {
      const dataString = JSON.stringify(responseData);
      headers['X-Data-Hash'] = generateHash(dataString);
    }
    
    return NextResponse.json(responseData, { status, headers });
  }

  /**
   * Creates an error response
   */
  private createErrorResponse(error: ApiError, status: number = 400): NextResponse {
    return this.createSecureResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(process.env.NODE_ENV === 'development' && { details: error.details })
        }
      },
      status
    );
  }

  /**
   * Main handler for secure API endpoints
   */
  async handleSecureRequest(
    request: NextRequest,
    handler: (req: NextRequest, sanitizedBody?: any) => Promise<any>,
    options: SecureApiOptions = {}
  ): Promise<NextResponse> {
    try {
      // Validate headers
      const headerValidation = this.validateHeaders(request);
      if (!headerValidation.isValid) {
        return this.createErrorResponse(
          { code: 'INVALID_HEADERS', message: headerValidation.error! },
          400
        );
      }

      // Check rate limiting
      if (options.rateLimit) {
        const rateLimitResult = this.checkRateLimit(request, options.rateLimit);
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
            {
              status: 429,
              headers: {
                'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString(),
                'X-RateLimit-Limit': options.rateLimit.maxRequests.toString(),
                'X-RateLimit-Remaining': '0'
              }
            }
          );
        }
      }

      // Validate CSRF token for state-changing operations
      if (options.validateCSRF && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        if (!this.validateCSRF(request)) {
          return this.createErrorResponse(
            { code: 'CSRF_VALIDATION_FAILED', message: 'CSRF token validation failed' },
            403
          );
        }
      }

      // Parse and sanitize request body
      let sanitizedBody;
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          
          if (options.sanitizeBody) {
            sanitizedBody = this.sanitizeRequestBody(body, request.nextUrl.pathname);
          } else {
            sanitizedBody = body;
          }
        } catch (error) {
          return this.createErrorResponse(
            { code: 'INVALID_JSON', message: 'Invalid JSON in request body' },
            400
          );
        }
      }

      // Call the actual handler
      const result = await handler(request, sanitizedBody);
      
      // Return secure response
      return this.createSecureResponse(
        result,
        200,
        {
          encrypt: options.encryptResponse,
          hash: true
        }
      );
      
    } catch (error) {
      console.error('Secure API handler error:', error);
      
      return this.createErrorResponse(
        {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        },
        500
      );
    }
  }

  /**
   * Middleware for protecting API routes
   */
  createSecureMiddleware(options: SecureApiOptions = {}) {
    return async (request: NextRequest, handler: (req: NextRequest, sanitizedBody?: any) => Promise<any>) => {
      return this.handleSecureRequest(request, handler, {
        requireAuth: false,
        validateCSRF: true,
        sanitizeBody: true,
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 100
        },
        ...options
      });
    };
  }
}

// Export singleton instance
export const secureApiHandler = SecureApiHandler.getInstance();

// Utility functions for common use cases
export const withSecurity = (options: SecureApiOptions = {}) => {
  return (handler: (req: NextRequest, body?: any) => Promise<any>) => {
    return async (request: NextRequest) => {
      return secureApiHandler.handleSecureRequest(request, handler, options);
    };
  };
};

export const withHighSecurity = withSecurity({
  requireAuth: true,
  validateCSRF: true,
  sanitizeBody: true,
  encryptResponse: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const withBasicSecurity = withSecurity({
  sanitizeBody: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});