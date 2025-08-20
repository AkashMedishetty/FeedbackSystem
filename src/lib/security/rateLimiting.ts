import { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextApiRequest) => string;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

// In-memory store for rate limiting (in production, use Redis or similar)
const store = new Map<string, { count: number; resetTime: number }>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress || 'unknown';
  return ip.trim();
}

function defaultKeyGenerator(req: NextApiRequest): string {
  return getClientIP(req);
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator
  } = options;

  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    return new Promise((resolve, reject) => {
      const key = keyGenerator(req);
      const now = Date.now();
      const resetTime = now + windowMs;
      
      let current = store.get(key);
      
      if (!current || now > current.resetTime) {
        current = { count: 0, resetTime };
        store.set(key, current);
      }
      
      current.count++;
      
      const info: RateLimitInfo = {
        limit: max,
        current: current.count,
        remaining: Math.max(0, max - current.count),
        resetTime: new Date(current.resetTime)
      };
      
      // Set headers
      if (standardHeaders) {
        res.setHeader('RateLimit-Limit', max);
        res.setHeader('RateLimit-Remaining', info.remaining);
        res.setHeader('RateLimit-Reset', new Date(current.resetTime).toISOString());
      }
      
      if (legacyHeaders) {
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', info.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000));
      }
      
      if (current.count > max) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        
        // Don't count failed requests if skipFailedRequests is true
        if (skipFailedRequests) {
          current.count--;
        }
        
        const error = new Error(message);
        (error as any).status = 429;
        (error as any).rateLimitInfo = info;
        reject(error);
        return;
      }
      
      // Don't count successful requests if skipSuccessfulRequests is true
      if (skipSuccessfulRequests) {
        current.count--;
      }
      
      // Add rate limit info to request for potential use in handlers
      (req as any).rateLimitInfo = info;
      
      resolve();
    });
  };
}

// Predefined rate limiters
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many requests from this IP, please try again later.'
});

export const moderateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
});

export const lenientRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: 'Too many requests from this IP, please try again later.'
});

// API-specific rate limiters
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true // Don't count successful logins
});

export const feedbackRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 feedback submissions per minute
  message: 'Too many feedback submissions, please slow down.'
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  message: 'Too many file uploads, please wait before uploading again.'
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 API calls per minute
  message: 'API rate limit exceeded, please try again later.'
});

// Utility functions
export function getRateLimitInfo(req: NextApiRequest): RateLimitInfo | null {
  return (req as any).rateLimitInfo || null;
}

export function isRateLimited(error: any): boolean {
  return error && error.status === 429;
}

export function getRateLimitReset(error: any): Date | null {
  return error && error.rateLimitInfo ? error.rateLimitInfo.resetTime : null;
}

// Middleware wrapper for easier use
export function withRateLimit(options: RateLimitOptions) {
  const limiter = rateLimit(options);
  
  return function rateLimitMiddleware(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
  ) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        await limiter(req, res);
        return handler(req, res);
      } catch (error: any) {
        if (isRateLimited(error)) {
          return res.status(429).json({
            error: error.message,
            retryAfter: Math.ceil((error.rateLimitInfo?.resetTime?.getTime() - Date.now()) / 1000)
          });
        }
        throw error;
      }
    };
  };
}

export default rateLimit;