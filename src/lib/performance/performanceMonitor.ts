'use client';

// Memory info interface
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Performance metrics interface
interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  memoryUsage?: MemoryInfo;
  connectionType?: string;
  timestamp: number;
}

// Performance observer for Core Web Vitals
class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (this.isInitialized) return;
    
    try {
      // Observe Core Web Vitals
      this.observeWebVitals();
      
      // Monitor page load performance
      this.monitorPageLoad();
      
      // Monitor memory usage
      this.monitorMemoryUsage();
      
      // Monitor network information
      this.monitorNetworkInfo();
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error);
    }
  }

  private observeWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      this.updateMetric('largestContentfulPaint', lastEntry.startTime);
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (e) {
      console.warn('LCP observer failed:', e);
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.updateMetric('firstInputDelay', entry.processingStart - entry.startTime);
      });
    });
    
    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (e) {
      console.warn('FID observer failed:', e);
    }

    // Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.updateMetric('cumulativeLayoutShift', clsValue);
    });
    
    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (e) {
      console.warn('CLS observer failed:', e);
    }

    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          this.updateMetric('firstContentfulPaint', entry.startTime);
        }
      });
    });
    
    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);
    } catch (e) {
      console.warn('FCP observer failed:', e);
    }
  }

  private monitorPageLoad() {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          const timeToInteractive = navigation.domInteractive - navigation.fetchStart;
          
          this.updateMetric('pageLoadTime', pageLoadTime);
          this.updateMetric('timeToInteractive', timeToInteractive);
        }
      }, 0);
    });
  }

  private monitorMemoryUsage() {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        this.updateMetric('memoryUsage', {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });
      }
    }, 30000); // Check every 30 seconds
  }

  private monitorNetworkInfo() {
    if (typeof window === 'undefined' || !('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    if (connection) {
      this.updateMetric('connectionType', connection.effectiveType);
      
      connection.addEventListener('change', () => {
        this.updateMetric('connectionType', connection.effectiveType);
      });
    }
  }

  private updateMetric(key: keyof PerformanceMetrics, value: any) {
    const currentMetrics = this.getCurrentMetrics();
    (currentMetrics as any)[key] = value;
    currentMetrics.timestamp = Date.now();
    
    // Keep only the last 100 metrics to prevent memory leaks
    if (this.metrics.length >= 100) {
      this.metrics.shift();
    }
    
    this.metrics.push({ ...currentMetrics });
    
    // Emit custom event for real-time monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance-metric-updated', {
        detail: { key, value, metrics: currentMetrics }
      }));
    }
  }

  private getCurrentMetrics(): PerformanceMetrics {
    const latest = this.metrics[this.metrics.length - 1];
    return latest ? { ...latest } : {
      pageLoadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      timeToInteractive: 0,
      timestamp: Date.now()
    };
  }

  // Public methods
  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? { ...this.metrics[this.metrics.length - 1] } : null;
  }

  public getAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) return {};

    const totals = this.metrics.reduce((acc, metric) => {
      acc.pageLoadTime += metric.pageLoadTime;
      acc.firstContentfulPaint += metric.firstContentfulPaint;
      acc.largestContentfulPaint += metric.largestContentfulPaint;
      acc.firstInputDelay += metric.firstInputDelay;
      acc.cumulativeLayoutShift += metric.cumulativeLayoutShift;
      acc.timeToInteractive += metric.timeToInteractive;
      return acc;
    }, {
      pageLoadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      timeToInteractive: 0
    });

    const count = this.metrics.length;
    return {
      pageLoadTime: totals.pageLoadTime / count,
      firstContentfulPaint: totals.firstContentfulPaint / count,
      largestContentfulPaint: totals.largestContentfulPaint / count,
      firstInputDelay: totals.firstInputDelay / count,
      cumulativeLayoutShift: totals.cumulativeLayoutShift / count,
      timeToInteractive: totals.timeToInteractive / count
    };
  }

  public getPerformanceScore(): number {
    const latest = this.getLatestMetrics();
    if (!latest) return 0;

    // Calculate score based on Core Web Vitals thresholds
    let score = 100;

    // LCP: Good < 2.5s, Needs Improvement < 4s, Poor >= 4s
    if (latest.largestContentfulPaint > 4000) score -= 30;
    else if (latest.largestContentfulPaint > 2500) score -= 15;

    // FID: Good < 100ms, Needs Improvement < 300ms, Poor >= 300ms
    if (latest.firstInputDelay > 300) score -= 25;
    else if (latest.firstInputDelay > 100) score -= 10;

    // CLS: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
    if (latest.cumulativeLayoutShift > 0.25) score -= 25;
    else if (latest.cumulativeLayoutShift > 0.1) score -= 10;

    // FCP: Good < 1.8s, Needs Improvement < 3s, Poor >= 3s
    if (latest.firstContentfulPaint > 3000) score -= 20;
    else if (latest.firstContentfulPaint > 1800) score -= 10;

    return Math.max(0, score);
  }

  public markUserTiming(name: string, startTime?: number) {
    if (typeof window === 'undefined' || !performance.mark) return;
    
    try {
      if (startTime) {
        performance.measure(name, { start: startTime, end: performance.now() });
      } else {
        performance.mark(name);
      }
    } catch (error) {
      console.warn('Failed to mark user timing:', error);
    }
  }

  public measureUserTiming(name: string, startMark: string, endMark?: string) {
    if (typeof window === 'undefined' || !performance.measure) return;
    
    try {
      performance.measure(name, startMark, endMark);
    } catch (error) {
      console.warn('Failed to measure user timing:', error);
    }
  }

  public exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      averages: this.getAverageMetrics(),
      score: this.getPerformanceScore(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  public cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect performance observer:', error);
      }
    });
    this.observers = [];
    this.metrics = [];
    this.isInitialized = false;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Hook for React components
export const usePerformanceMonitor = () => {
  return {
    getMetrics: () => performanceMonitor.getMetrics(),
    getLatestMetrics: () => performanceMonitor.getLatestMetrics(),
    getAverageMetrics: () => performanceMonitor.getAverageMetrics(),
    getPerformanceScore: () => performanceMonitor.getPerformanceScore(),
    markUserTiming: (name: string, startTime?: number) => performanceMonitor.markUserTiming(name, startTime),
    measureUserTiming: (name: string, startMark: string, endMark?: string) => performanceMonitor.measureUserTiming(name, startMark, endMark),
    exportMetrics: () => performanceMonitor.exportMetrics()
  };
};

// Utility functions for performance optimization
export const withPerformanceTracking = <T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T => {
  return ((...args: any[]) => {
    const startTime = performance.now();
    performanceMonitor.markUserTiming(`${name}-start`);
    
    try {
      const result = fn(...args);
      
      // Handle both sync and async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          performanceMonitor.markUserTiming(`${name}-end`);
          performanceMonitor.measureUserTiming(name, `${name}-start`, `${name}-end`);
        });
      } else {
        performanceMonitor.markUserTiming(`${name}-end`);
        performanceMonitor.measureUserTiming(name, `${name}-start`, `${name}-end`);
        return result;
      }
    } catch (error) {
      performanceMonitor.markUserTiming(`${name}-error`);
      throw error;
    }
  }) as T;
};

export default performanceMonitor;