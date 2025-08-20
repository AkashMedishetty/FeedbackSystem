'use client';

import { errorMonitor } from '../monitoring/errorMonitoring';

// Types and interfaces
interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  recommendations: OptimizationRecommendation[];
}

interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  isAsync: boolean;
  isEntry: boolean;
}

interface DependencyInfo {
  name: string;
  version: string;
  size: number;
  treeshakeable: boolean;
  duplicates: number;
}

interface OptimizationRecommendation {
  type: 'bundle_splitting' | 'lazy_loading' | 'tree_shaking' | 'compression' | 'caching' | 'preloading';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  implementation: string;
}

interface CacheStrategy {
  name: string;
  pattern: string;
  maxAge: number;
  staleWhileRevalidate?: number;
  cacheFirst?: boolean;
  networkFirst?: boolean;
}

interface OptimizationMetrics {
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  cacheHitRate: number;
  compressionRatio: number;
  treeShakingEfficiency: number;
}

// Production optimization manager
class ProductionOptimizer {
  private metrics: OptimizationMetrics = {
    bundleSize: 0,
    loadTime: 0,
    renderTime: 0,
    cacheHitRate: 0,
    compressionRatio: 0,
    treeShakingEfficiency: 0
  };

  private cacheStrategies: CacheStrategy[] = [
    {
      name: 'Static Assets',
      pattern: '\\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$',
      maxAge: 31536000, // 1 year
      cacheFirst: true
    },
    {
      name: 'API Responses',
      pattern: '^/api/',
      maxAge: 300, // 5 minutes
      staleWhileRevalidate: 60,
      networkFirst: true
    },
    {
      name: 'HTML Pages',
      pattern: '\\.(html)$',
      maxAge: 3600, // 1 hour
      staleWhileRevalidate: 300
    },
    {
      name: 'Dynamic Content',
      pattern: '^/dashboard|^/feedback',
      maxAge: 60, // 1 minute
      networkFirst: true
    }
  ];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeOptimizations();
    }
  }

  private initializeOptimizations() {
    // Initialize performance monitoring
    this.monitorLoadPerformance();
    
    // Setup resource hints
    this.setupResourceHints();
    
    // Initialize compression detection
    this.detectCompression();
    
    // Setup cache monitoring
    this.monitorCachePerformance();
  }

  private monitorLoadPerformance() {
    if (!('PerformanceObserver' in window)) return;

    // Monitor navigation timing
    const navigationObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'navigation') {
          this.metrics.loadTime = entry.loadEventEnd - entry.fetchStart;
          this.metrics.renderTime = entry.domContentLoadedEventEnd - entry.fetchStart;
          
          // Report slow loads
          if (this.metrics.loadTime > 3000) {
            errorMonitor.capturePerformanceIssue({
              type: 'slow_render',
              description: `Slow page load: ${this.metrics.loadTime.toFixed(0)}ms`,
              value: this.metrics.loadTime,
              threshold: 3000,
              context: {
                category: 'performance',
                severity: this.metrics.loadTime > 5000 ? 'critical' : 'high',
                timestamp: Date.now(),
                metadata: {
                  loadTime: this.metrics.loadTime,
                  renderTime: this.metrics.renderTime,
                  url: window.location.href
                }
              }
            });
          }
        }
      });
    });

    try {
      navigationObserver.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('Navigation observer not supported:', error);
    }

    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'resource') {
          // Calculate bundle size from loaded resources
          if (entry.name.includes('.js') || entry.name.includes('.css')) {
            this.metrics.bundleSize += entry.transferSize || 0;
          }
          
          // Monitor slow resources
          const loadTime = entry.responseEnd - entry.fetchStart;
          if (loadTime > 2000) {
            errorMonitor.capturePerformanceIssue({
              type: 'slow_render',
              description: `Slow resource load: ${entry.name}`,
              value: loadTime,
              threshold: 2000,
              context: {
                category: 'performance',
                severity: 'medium',
                timestamp: Date.now(),
                metadata: {
                  resourceUrl: entry.name,
                  loadTime,
                  transferSize: entry.transferSize,
                  encodedBodySize: entry.encodedBodySize
                }
              }
            });
          }
        }
      });
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }
  }

  private setupResourceHints() {
    // Add DNS prefetch for external domains
    const externalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'api.example.com'
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });

    // Preload critical resources
    const criticalResources = [
      { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2' },
      { href: '/api/health', as: 'fetch' }
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type) {
        link.type = resource.type;
      }
      if (resource.as === 'font') {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  }

  private detectCompression() {
    // Check if resources are compressed
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.transferSize && entry.encodedBodySize) {
            const compressionRatio = entry.transferSize / entry.encodedBodySize;
            this.metrics.compressionRatio = Math.min(this.metrics.compressionRatio || 1, compressionRatio);
            
            // Alert if resources are not compressed
            if (compressionRatio > 0.9 && entry.encodedBodySize > 10000) {
              errorMonitor.capturePerformanceIssue({
                type: 'large_bundle',
                description: `Uncompressed resource detected: ${entry.name}`,
                value: entry.encodedBodySize,
                threshold: 10000,
                context: {
                  category: 'performance',
                  severity: 'medium',
                  timestamp: Date.now(),
                  metadata: {
                    resourceUrl: entry.name,
                    transferSize: entry.transferSize,
                    encodedBodySize: entry.encodedBodySize,
                    compressionRatio
                  }
                }
              });
            }
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource compression observer not supported:', error);
      }
    }
  }

  private monitorCachePerformance() {
    let cacheHits = 0;
    let totalRequests = 0;

    // Override fetch to monitor cache performance
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      totalRequests++;
      
      try {
        const response = await originalFetch(...args);
        
        // Check if response came from cache
        if (response.headers.get('cf-cache-status') === 'HIT' ||
            response.headers.get('x-cache') === 'HIT' ||
            response.headers.get('cache-control')?.includes('max-age')) {
          cacheHits++;
        }
        
        this.metrics.cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
        
        return response;
      } catch (error) {
        throw error;
      }
    };
  }

  public analyzeBundleSize(): Promise<BundleAnalysis> {
    return new Promise((resolve) => {
      // Simulate bundle analysis (in real implementation, this would analyze webpack stats)
      const analysis: BundleAnalysis = {
        totalSize: this.metrics.bundleSize || 500000, // 500KB estimate
        gzippedSize: (this.metrics.bundleSize || 500000) * 0.3, // 30% compression estimate
        chunks: [
          {
            name: 'main',
            size: 200000,
            gzippedSize: 60000,
            modules: ['react', 'react-dom', 'app'],
            isAsync: false,
            isEntry: true
          },
          {
            name: 'vendor',
            size: 150000,
            gzippedSize: 45000,
            modules: ['lodash', 'axios', 'date-fns'],
            isAsync: false,
            isEntry: false
          },
          {
            name: 'dashboard',
            size: 100000,
            gzippedSize: 30000,
            modules: ['dashboard', 'charts'],
            isAsync: true,
            isEntry: false
          }
        ],
        dependencies: [
          {
            name: 'react',
            version: '18.2.0',
            size: 45000,
            treeshakeable: false,
            duplicates: 0
          },
          {
            name: 'lodash',
            version: '4.17.21',
            size: 70000,
            treeshakeable: true,
            duplicates: 0
          }
        ],
        recommendations: this.generateOptimizationRecommendations()
      };

      resolve(analysis);
    });
  }

  private generateOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Bundle size recommendations
    if (this.metrics.bundleSize > 1000000) {
      recommendations.push({
        type: 'bundle_splitting',
        priority: 'high',
        description: 'Bundle size is over 1MB, consider code splitting',
        impact: 'Reduce initial load time by 30-50%',
        implementation: 'Use dynamic imports and React.lazy for route-based splitting'
      });
    }

    // Load time recommendations
    if (this.metrics.loadTime > 3000) {
      recommendations.push({
        type: 'lazy_loading',
        priority: 'high',
        description: 'Page load time is over 3 seconds',
        impact: 'Improve user experience and SEO rankings',
        implementation: 'Implement lazy loading for images and non-critical components'
      });
    }

    // Compression recommendations
    if (this.metrics.compressionRatio > 0.8) {
      recommendations.push({
        type: 'compression',
        priority: 'medium',
        description: 'Resources are not well compressed',
        impact: 'Reduce transfer size by 60-80%',
        implementation: 'Enable gzip/brotli compression on server'
      });
    }

    // Cache recommendations
    if (this.metrics.cacheHitRate < 50) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        description: 'Low cache hit rate detected',
        impact: 'Reduce server load and improve response times',
        implementation: 'Implement proper cache headers and service worker caching'
      });
    }

    // Preloading recommendations
    recommendations.push({
      type: 'preloading',
      priority: 'low',
      description: 'Add resource hints for better performance',
      impact: 'Reduce perceived load time by 10-20%',
      implementation: 'Add dns-prefetch, preload, and prefetch hints'
    });

    return recommendations;
  }

  public getCacheStrategies(): CacheStrategy[] {
    return [...this.cacheStrategies];
  }

  public getOptimizationMetrics(): OptimizationMetrics {
    return { ...this.metrics };
  }

  public generateCacheHeaders(url: string): Record<string, string> {
    const strategy = this.cacheStrategies.find(s => 
      new RegExp(s.pattern).test(url)
    );

    if (!strategy) {
      return {
        'Cache-Control': 'no-cache'
      };
    }

    const headers: Record<string, string> = {};

    if (strategy.cacheFirst) {
      headers['Cache-Control'] = `public, max-age=${strategy.maxAge}, immutable`;
    } else if (strategy.networkFirst) {
      headers['Cache-Control'] = `public, max-age=${strategy.maxAge}, must-revalidate`;
    } else {
      headers['Cache-Control'] = `public, max-age=${strategy.maxAge}`;
    }

    if (strategy.staleWhileRevalidate) {
      headers['Cache-Control'] += `, stale-while-revalidate=${strategy.staleWhileRevalidate}`;
    }

    return headers;
  }

  public optimizeImages(images: HTMLImageElement[]) {
    images.forEach(img => {
      // Add loading="lazy" if not already present
      if (!img.hasAttribute('loading')) {
        img.loading = 'lazy';
      }

      // Add decoding="async" for better performance
      if (!img.hasAttribute('decoding')) {
        img.decoding = 'async';
      }

      // Monitor image load performance
      img.addEventListener('load', () => {
        const loadTime = performance.now();
        if (loadTime > 2000) {
          errorMonitor.capturePerformanceIssue({
            type: 'slow_render',
            description: `Slow image load: ${img.src}`,
            value: loadTime,
            threshold: 2000,
            context: {
              category: 'performance',
              severity: 'low',
              timestamp: Date.now(),
              metadata: {
                imageUrl: img.src,
                loadTime
              }
            }
          });
        }
      });
    });
  }

  public preloadCriticalResources(resources: string[]) {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.match(/\.(woff|woff2|ttf|otf)$/)) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
    });
  }

  public async generateOptimizationReport(): Promise<string> {
    const analysis = await this.analyzeBundleSize();
    
    return JSON.stringify({
      metrics: this.metrics,
      bundleAnalysis: analysis,
      cacheStrategies: this.cacheStrategies,
      timestamp: new Date().toISOString()
    }, null, 2);
  }
}

// Singleton instance
export const productionOptimizer = new ProductionOptimizer();

// React hook
export const useProductionOptimization = () => {
  return {
    analyzeBundleSize: () => productionOptimizer.analyzeBundleSize(),
    getMetrics: () => productionOptimizer.getOptimizationMetrics(),
    getCacheStrategies: () => productionOptimizer.getCacheStrategies(),
    generateCacheHeaders: (url: string) => productionOptimizer.generateCacheHeaders(url),
    optimizeImages: (images: HTMLImageElement[]) => productionOptimizer.optimizeImages(images),
    preloadResources: (resources: string[]) => productionOptimizer.preloadCriticalResources(resources),
    generateReport: () => productionOptimizer.generateOptimizationReport()
  };
};

export default productionOptimizer;