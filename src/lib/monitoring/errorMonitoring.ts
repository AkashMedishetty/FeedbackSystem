'use client';

// Error types and interfaces
interface ErrorContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'javascript' | 'network' | 'database' | 'authentication' | 'validation' | 'security' | 'performance';
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  fingerprint: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

interface PerformanceIssue {
  id: string;
  type: 'slow_query' | 'memory_leak' | 'high_cpu' | 'slow_render' | 'large_bundle';
  description: string;
  value: number;
  threshold: number;
  context: ErrorContext;
}

// Error monitoring class
class ErrorMonitor {
  private errors: Map<string, ErrorReport> = new Map();
  private performanceIssues: PerformanceIssue[] = [];
  private isInitialized = false;
  private maxErrors = 1000;
  private maxPerformanceIssues = 500;
  private reportingEndpoint?: string;

  constructor(options?: {
    maxErrors?: number;
    maxPerformanceIssues?: number;
    reportingEndpoint?: string;
  }) {
    this.maxErrors = options?.maxErrors || 1000;
    this.maxPerformanceIssues = options?.maxPerformanceIssues || 500;
    this.reportingEndpoint = options?.reportingEndpoint;
    
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (this.isInitialized) return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        category: 'javascript',
        severity: 'high',
        url: event.filename,
        metadata: {
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        category: 'javascript',
        severity: 'high',
        metadata: {
          type: 'unhandled_promise_rejection',
          reason: event.reason
        }
      });
    });

    // Network error monitoring
    this.monitorNetworkErrors();

    // Performance monitoring
    this.monitorPerformanceIssues();

    // Memory leak detection
    this.monitorMemoryLeaks();

    this.isInitialized = true;
  }

  private monitorNetworkErrors() {
    // Override fetch to monitor network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.captureError(new Error(`Network error: ${response.status} ${response.statusText}`), {
            category: 'network',
            severity: response.status >= 500 ? 'high' : 'medium',
            metadata: {
              url: args[0],
              status: response.status,
              statusText: response.statusText
            }
          });
        }
        
        return response;
      } catch (error) {
        this.captureError(error as Error, {
          category: 'network',
          severity: 'high',
          metadata: {
            url: args[0],
            type: 'fetch_error'
          }
        });
        throw error;
      }
    };
  }

  private monitorPerformanceIssues() {
    if (!('PerformanceObserver' in window)) return;

    // Monitor long tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.duration > 50) {
            this.capturePerformanceIssue({
              type: 'slow_render',
              description: `Long task detected: ${entry.duration.toFixed(2)}ms`,
              value: entry.duration,
              threshold: 50,
              context: {
                category: 'performance',
                severity: entry.duration > 100 ? 'high' : 'medium',
                timestamp: Date.now(),
                metadata: {
                  entryType: entry.entryType,
                  startTime: entry.startTime
                }
              }
            });
          }
        });
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task observer not supported:', error);
    }

    // Monitor layout shifts
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.value > 0.1) {
            this.capturePerformanceIssue({
              type: 'slow_render',
              description: `High layout shift: ${entry.value.toFixed(3)}`,
              value: entry.value,
              threshold: 0.1,
              context: {
                category: 'performance',
                severity: entry.value > 0.25 ? 'high' : 'medium',
                timestamp: Date.now(),
                metadata: {
                  hadRecentInput: entry.hadRecentInput
                }
              }
            });
          }
        });
      });
      
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Layout shift observer not supported:', error);
    }
  }

  private monitorMemoryLeaks() {
    if (!('memory' in performance)) return;

    let lastMemoryCheck = 0;
    const memoryCheckInterval = 60000; // Check every minute

    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        const currentMemory = memory.usedJSHeapSize;
        
        if (lastMemoryCheck > 0) {
          const memoryIncrease = currentMemory - lastMemoryCheck;
          const increasePercentage = (memoryIncrease / lastMemoryCheck) * 100;
          
          if (increasePercentage > 20) {
            this.capturePerformanceIssue({
              type: 'memory_leak',
              description: `Potential memory leak: ${increasePercentage.toFixed(1)}% increase`,
              value: currentMemory,
              threshold: lastMemoryCheck * 1.2,
              context: {
                category: 'performance',
                severity: increasePercentage > 50 ? 'critical' : 'high',
                timestamp: Date.now(),
                metadata: {
                  previousMemory: lastMemoryCheck,
                  currentMemory,
                  increase: memoryIncrease,
                  increasePercentage
                }
              }
            });
          }
        }
        
        lastMemoryCheck = currentMemory;
      }
    }, memoryCheckInterval);
  }

  public captureError(error: Error, context: Partial<ErrorContext> = {}) {
    const fingerprint = this.generateFingerprint(error);
    const timestamp = Date.now();
    
    const fullContext: ErrorContext = {
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp,
      severity: 'medium',
      category: 'javascript',
      ...context
    };

    const existingError = this.errors.get(fingerprint);
    
    if (existingError) {
      existingError.count++;
      existingError.lastSeen = timestamp;
      existingError.context = fullContext; // Update with latest context
    } else {
      const errorReport: ErrorReport = {
        id: this.generateId(),
        message: error.message,
        stack: error.stack,
        context: fullContext,
        fingerprint,
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp
      };
      
      this.errors.set(fingerprint, errorReport);
      
      // Limit stored errors
      if (this.errors.size > this.maxErrors) {
        const oldestKey = this.errors.keys().next().value;
        if (oldestKey) {
          this.errors.delete(oldestKey);
        }
      }
    }

    // Report to external service if configured
    if (this.reportingEndpoint) {
      this.reportError(this.errors.get(fingerprint)!);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', error, fullContext);
    }
  }

  public capturePerformanceIssue(issue: Omit<PerformanceIssue, 'id'>) {
    const performanceIssue: PerformanceIssue = {
      id: this.generateId(),
      ...issue
    };
    
    this.performanceIssues.push(performanceIssue);
    
    // Limit stored performance issues
    if (this.performanceIssues.length > this.maxPerformanceIssues) {
      this.performanceIssues.shift();
    }

    // Report critical performance issues immediately
    if (issue.context.severity === 'critical' && this.reportingEndpoint) {
      this.reportPerformanceIssue(performanceIssue);
    }
  }

  private generateFingerprint(error: Error): string {
    const message = error.message || 'Unknown error';
    const stack = error.stack || '';
    const stackLines = stack.split('\n').slice(0, 3).join('\n');
    
    return btoa(message + stackLines).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from various sources
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return userData.id || userData._id;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return undefined;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private async reportError(error: ErrorReport) {
    if (!this.reportingEndpoint) return;
    
    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'error',
          data: error
        })
      });
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  }

  private async reportPerformanceIssue(issue: PerformanceIssue) {
    if (!this.reportingEndpoint) return;
    
    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'performance',
          data: issue
        })
      });
    } catch (reportingError) {
      console.warn('Failed to report performance issue:', reportingError);
    }
  }

  // Public methods
  public getErrors(): ErrorReport[] {
    return Array.from(this.errors.values());
  }

  public getPerformanceIssues(): PerformanceIssue[] {
    return [...this.performanceIssues];
  }

  public getErrorsByCategory(category: ErrorContext['category']): ErrorReport[] {
    return this.getErrors().filter(error => error.context.category === category);
  }

  public getErrorsBySeverity(severity: ErrorContext['severity']): ErrorReport[] {
    return this.getErrors().filter(error => error.context.severity === severity);
  }

  public getRecentErrors(minutes: number = 60): ErrorReport[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.getErrors().filter(error => error.lastSeen > cutoff);
  }

  public getErrorStats() {
    const errors = this.getErrors();
    const totalErrors = errors.reduce((sum, error) => sum + error.count, 0);
    
    return {
      totalUniqueErrors: errors.length,
      totalErrorOccurrences: totalErrors,
      errorsByCategory: this.groupBy(errors, 'context.category'),
      errorsBySeverity: this.groupBy(errors, 'context.severity'),
      recentErrors: this.getRecentErrors(60).length,
      criticalErrors: this.getErrorsBySeverity('critical').length
    };
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = key.split('.').reduce((obj, k) => obj?.[k], item);
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  public exportData(): string {
    return JSON.stringify({
      errors: this.getErrors(),
      performanceIssues: this.getPerformanceIssues(),
      stats: this.getErrorStats(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  public clearData() {
    this.errors.clear();
    this.performanceIssues = [];
  }
}

// Singleton instance
export const errorMonitor = new ErrorMonitor({
  reportingEndpoint: process.env.NODE_ENV === 'production' 
    ? '/api/monitoring/errors' 
    : undefined
});

// React hook
export const useErrorMonitoring = () => {
  return {
    captureError: (error: Error, context?: Partial<ErrorContext>) => 
      errorMonitor.captureError(error, context),
    capturePerformanceIssue: (issue: Omit<PerformanceIssue, 'id'>) => 
      errorMonitor.capturePerformanceIssue(issue),
    getErrors: () => errorMonitor.getErrors(),
    getPerformanceIssues: () => errorMonitor.getPerformanceIssues(),
    getErrorStats: () => errorMonitor.getErrorStats(),
    exportData: () => errorMonitor.exportData(),
    clearData: () => errorMonitor.clearData()
  };
};

// Utility functions
export const withErrorBoundary = <T extends (...args: any[]) => any>(
  fn: T,
  context?: Partial<ErrorContext>
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorMonitor.captureError(error, context);
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      errorMonitor.captureError(error as Error, context);
      throw error;
    }
  }) as T;
};

export default errorMonitor;