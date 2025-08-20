'use client';

import { createLazyComponent } from '@/lib/performance/lazyLoading';

// Lazy load heavy components for better performance
export const LazyFeedbackForm = createLazyComponent(
  () => import('@/components/feedback/FeedbackForm'),
  {
    chunkName: 'FeedbackForm',
    preload: false,
    retries: 3
  }
);

export const LazyPatientConsultationHistory = createLazyComponent(
  () => import('@/components/admin/PatientConsultationHistory'),
  {
    chunkName: 'PatientConsultationHistory',
    preload: false,
    retries: 3
  }
);

export const LazyBrandingSettings = createLazyComponent(
  () => import('@/components/admin/BrandingSettings'),
  {
    chunkName: 'BrandingSettings',
    preload: false,
    retries: 3
  }
);

export const LazyComplianceDashboard = createLazyComponent(
  () => import('@/components/compliance/ComplianceDashboard'),
  {
    chunkName: 'ComplianceDashboard',
    preload: false,
    retries: 3
  }
);

export const LazyPerformanceDashboard = createLazyComponent(
  () => import('@/components/performance/PerformanceDashboard'),
  {
    chunkName: 'PerformanceDashboard',
    preload: false,
    retries: 3
  }
);

export const LazyMonitoringDashboard = createLazyComponent(
  () => import('@/components/monitoring/MonitoringDashboard'),
  {
    chunkName: 'MonitoringDashboard',
    preload: false,
    retries: 3
  }
);

export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('@/components/admin/AnalyticsDashboard'),
  {
    chunkName: 'AnalyticsDashboard',
    preload: false,
    retries: 3
  }
);

// FeedbackAnalytics is part of AnalyticsDashboard - no separate component needed

// ReportGenerator component doesn't exist - removing lazy import

// Preload critical components
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used soon
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      (LazyFeedbackForm as any).preload?.();
    }, 2000);
  }
};

// Component registry for dynamic loading
export const componentRegistry = {
  FeedbackForm: LazyFeedbackForm,
  PatientConsultationHistory: LazyPatientConsultationHistory,
  BrandingSettings: LazyBrandingSettings,
  ComplianceDashboard: LazyComplianceDashboard,
  PerformanceDashboard: LazyPerformanceDashboard,
  MonitoringDashboard: LazyMonitoringDashboard,
  AnalyticsDashboard: LazyAnalyticsDashboard
};

export type ComponentName = keyof typeof componentRegistry;

// Dynamic component loader
export const getDynamicComponent = (name: ComponentName) => {
  return componentRegistry[name];
};

export default {
  LazyFeedbackForm,
  LazyPatientConsultationHistory,
  LazyBrandingSettings,
  LazyComplianceDashboard,
  LazyPerformanceDashboard,
  LazyMonitoringDashboard,
  LazyAnalyticsDashboard,
  preloadCriticalComponents,
  componentRegistry,
  getDynamicComponent
};