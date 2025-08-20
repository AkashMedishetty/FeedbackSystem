'use client';

import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import { performanceMonitor } from './performanceMonitor';

// Loading component interface
interface LoadingComponentProps {
  error?: Error;
  retry?: () => void;
  pastDelay?: boolean;
}

// Lazy loading options
interface LazyLoadOptions {
  fallback?: React.ComponentType<LoadingComponentProps>;
  delay?: number;
  timeout?: number;
  retries?: number;
  preload?: boolean;
  chunkName?: string;
}

// Default loading component
const DefaultLoadingComponent: React.FC<LoadingComponentProps> = ({ error, retry }) => {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm font-medium">Failed to load component</p>
        </div>
        {retry && (
          <button
            onClick={retry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  );
};

// Enhanced lazy loading with performance tracking and error handling
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> => {
  const {
    fallback = DefaultLoadingComponent,
    delay = 200,
    timeout = 10000,
    retries = 3,
    preload = false,
    chunkName
  } = options;

  let retryCount = 0;
  let preloadPromise: Promise<{ default: T }> | null = null;

  const enhancedImportFn = async (): Promise<{ default: T }> => {
    const startTime = performance.now();
    const componentName = chunkName || 'LazyComponent';
    
    performanceMonitor.markUserTiming(`${componentName}-load-start`);

    try {
      // Use preloaded promise if available
      const modulePromise = preloadPromise || importFn();
      
      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Component load timeout')), timeout);
      });

      const module = await Promise.race([modulePromise, timeoutPromise]);
      
      const loadTime = performance.now() - startTime;
      performanceMonitor.markUserTiming(`${componentName}-load-end`);
      performanceMonitor.measureUserTiming(
        `${componentName}-load`,
        `${componentName}-load-start`,
        `${componentName}-load-end`
      );

      // Log successful load
      console.debug(`Lazy component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
      
      retryCount = 0; // Reset retry count on success
      return module;
    } catch (error) {
      performanceMonitor.markUserTiming(`${componentName}-load-error`);
      
      console.error(`Failed to load lazy component ${componentName}:`, error);
      
      // Retry logic
      if (retryCount < retries) {
        retryCount++;
        console.warn(`Retrying lazy component load (${retryCount}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        return enhancedImportFn();
      }
      
      throw error;
    }
  };

  // Preload function
  const preloadComponent = () => {
    if (!preloadPromise) {
      preloadPromise = importFn();
    }
    return preloadPromise;
  };

  // Auto-preload if enabled
  if (preload && typeof window !== 'undefined') {
    // Preload after a short delay to not block initial render
    setTimeout(preloadComponent, 100);
  }

  const LazyComponent = React.lazy(enhancedImportFn);
  
  // Add preload method to the lazy component
  (LazyComponent as any).preload = preloadComponent;
  
  return LazyComponent;
};

// HOC for wrapping components with Suspense and error boundary
export const withLazyLoading = <P extends object>(
  LazyComponent: LazyExoticComponent<ComponentType<P>>,
  options: LazyLoadOptions = {}
) => {
  const {
    fallback = DefaultLoadingComponent,
    delay = 200
  } = options;

  return React.forwardRef<any, P>((props, ref) => {
    const [showFallback, setShowFallback] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    // Delay showing fallback to prevent flash
    React.useEffect(() => {
      const timer = setTimeout(() => setShowFallback(true), delay);
      return () => clearTimeout(timer);
    }, [delay]);

    const retry = React.useCallback(() => {
      setError(null);
      setShowFallback(false);
      // Force re-render by changing key
      window.location.reload();
    }, []);

    const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      React.useEffect(() => {
        const handleError = (event: ErrorEvent) => {
          if (event.error) {
            setError(event.error);
          }
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
          setError(new Error(event.reason));
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
          window.removeEventListener('error', handleError);
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
      }, []);

      if (error) {
        return React.createElement(fallback, { error, retry, pastDelay: true });
      }

      return <>{children}</>;
    };

    return (
      <ErrorBoundary>
        <Suspense
          fallback={
            showFallback ? React.createElement(fallback, { pastDelay: true }) : null
          }
        >
          <LazyComponent {...props} ref={ref} />
        </Suspense>
      </ErrorBoundary>
    );
  });
};

// Intersection Observer based lazy loading for images and content
export const useLazyIntersection = (
  threshold = 0.1,
  rootMargin = '50px'
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element || hasIntersected) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          setHasIntersected(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
};

// Lazy image component
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  className = '',
  onLoad,
  onError,
  ...props
}) => {
  const { elementRef, isIntersecting } = useLazyIntersection();
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const handleLoad = React.useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError]);

  return (
    <div ref={elementRef} className={`relative overflow-hidden ${className}`}>
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {placeholder ? (
            <img src={placeholder} alt="" className="opacity-50" />
          ) : (
            <div className="text-gray-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      )}
      
      {isIntersecting && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
      
      {imageError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Preload utilities
export const preloadRoute = (routePath: string) => {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = routePath;
  document.head.appendChild(link);
};

export const preloadComponent = (importFn: () => Promise<any>) => {
  if (typeof window === 'undefined') return Promise.resolve();
  
  return importFn().catch(error => {
    console.warn('Failed to preload component:', error);
  });
};

// Bundle analyzer helper
export const analyzeBundleSize = () => {
  if (typeof window === 'undefined') return;
  
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const totalSize = scripts.reduce((total, script) => {
    const src = script.getAttribute('src');
    if (src && src.includes('/_next/static/')) {
      // This is a rough estimation - in production you'd want actual file sizes
      return total + 1;
    }
    return total;
  }, 0);
  
  console.log(`Estimated bundle count: ${totalSize} chunks`);
  return totalSize;
};

export default {
  createLazyComponent,
  withLazyLoading,
  useLazyIntersection,
  LazyImage,
  preloadRoute,
  preloadComponent,
  analyzeBundleSize
};