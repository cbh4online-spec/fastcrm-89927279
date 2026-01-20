import { useCallback, useEffect, useRef } from 'react';
import { useConsent } from './useConsent';

// Push event to dataLayer (GTM will handle routing to GA4/Meta/Clarity)
function pushToDataLayer(event: string, params?: object) {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event,
      ...params,
      timestamp: new Date().toISOString(),
    });
  }
}

export function useTracking() {
  const { consent } = useConsent();
  const scrollDepthsTracked = useRef<Set<number>>(new Set());

  // Check if tracking is allowed based on consent
  const canTrackAnalytics = consent.analytics;
  const canTrackMarketing = consent.marketing;

  // SEO/Content Events
  const trackPageView = useCallback((params: GA4PageViewParams) => {
    if (!canTrackAnalytics) return;
    pushToDataLayer('seo_page_view', params);
  }, [canTrackAnalytics]);

  const trackSearch = useCallback((params: GA4SearchParams) => {
    if (!canTrackAnalytics) return;
    pushToDataLayer('internal_search', params);
  }, [canTrackAnalytics]);

  const trackCTAClick = useCallback((params: GA4CTAClickParams) => {
    // CTA clicks are tracked even without analytics consent (essential for product)
    pushToDataLayer('cta_click', params);
    
    // Also push Meta Lead event if marketing consent
    if (canTrackMarketing && (params.cta_type === 'signup' || params.cta_type === 'contact')) {
      pushToDataLayer('meta_lead', { content_name: params.cta_type });
    }
  }, [canTrackMarketing]);

  const trackOutboundClick = useCallback((destination: string, context?: string) => {
    if (!canTrackAnalytics) return;
    pushToDataLayer('outbound_click', {
      destination_domain: new URL(destination).hostname,
      link_context: context,
    });
  }, [canTrackAnalytics]);

  const trackScrollDepth = useCallback((params: GA4ScrollParams) => {
    if (!canTrackAnalytics) return;
    if (scrollDepthsTracked.current.has(params.depth)) return;
    
    scrollDepthsTracked.current.add(params.depth);
    pushToDataLayer('scroll_depth', params);
  }, [canTrackAnalytics]);

  // Product/Activation Events
  const trackSignupStarted = useCallback((method: string) => {
    pushToDataLayer('signup_started', { method });
    if (canTrackMarketing) {
      pushToDataLayer('meta_lead', { content_name: 'signup_started' });
    }
  }, [canTrackMarketing]);

  const trackSignupCompleted = useCallback((method: string) => {
    pushToDataLayer('signup_completed', { method });
    if (canTrackMarketing) {
      pushToDataLayer('meta_complete_registration', { content_name: method });
    }
  }, [canTrackMarketing]);

  const trackLogin = useCallback((method: string) => {
    pushToDataLayer('login', { method });
  }, []);

  const trackOnboardingStarted = useCallback(() => {
    pushToDataLayer('onboarding_started', {});
  }, []);

  const trackOnboardingCompleted = useCallback(() => {
    pushToDataLayer('onboarding_completed', {});
  }, []);

  const trackToolRunStarted = useCallback((params: Omit<GA4ToolParams, 'result_type' | 'credits_used'>) => {
    pushToDataLayer('tool_run_started', params);
  }, []);

  const trackToolRunCompleted = useCallback((params: GA4ToolParams) => {
    pushToDataLayer('tool_run_completed', params);
  }, []);

  const trackExportStarted = useCallback((exportType: string) => {
    pushToDataLayer('export_started', { export_type: exportType });
  }, []);

  const trackExportCompleted = useCallback((exportType: string) => {
    pushToDataLayer('export_completed', { export_type: exportType });
  }, []);

  const trackSaveTemplate = useCallback((templateSlug: string) => {
    pushToDataLayer('save_template', { template_slug: templateSlug });
  }, []);

  const trackCreateProject = useCallback((source: string) => {
    pushToDataLayer('create_project', { source });
  }, []);

  // Conversion Events
  const trackPricingViewed = useCallback(() => {
    pushToDataLayer('pricing_viewed', {});
    if (canTrackMarketing) {
      pushToDataLayer('meta_view_content', { 
        content_name: 'pricing',
        content_category: 'transactional',
      });
    }
  }, [canTrackMarketing]);

  const trackUpgradeClick = useCallback((plan: string) => {
    pushToDataLayer('upgrade_click', { plan });
    if (canTrackMarketing) {
      pushToDataLayer('meta_initiate_checkout', { content_name: plan });
    }
  }, [canTrackMarketing]);

  const trackPurchaseCompleted = useCallback((params: GA4PurchaseParams) => {
    pushToDataLayer('purchase_completed', params);
    if (canTrackMarketing) {
      pushToDataLayer('meta_purchase', {
        value: params.value,
        currency: params.currency,
        content_name: params.plan,
      });
    }
  }, [canTrackMarketing]);

  // Error/Quality Events
  const trackError = useCallback((errorType: string, context: string) => {
    pushToDataLayer('error_shown', { error_type: errorType, context });
  }, []);

  const trackEmptyState = useCallback((context: string) => {
    pushToDataLayer('empty_state_seen', { context });
  }, []);

  // Reset scroll tracking on route change
  const resetScrollTracking = useCallback(() => {
    scrollDepthsTracked.current.clear();
  }, []);

  return {
    // Content/SEO
    trackPageView,
    trackSearch,
    trackCTAClick,
    trackOutboundClick,
    trackScrollDepth,
    resetScrollTracking,
    
    // Product
    trackSignupStarted,
    trackSignupCompleted,
    trackLogin,
    trackOnboardingStarted,
    trackOnboardingCompleted,
    trackToolRunStarted,
    trackToolRunCompleted,
    trackExportStarted,
    trackExportCompleted,
    trackSaveTemplate,
    trackCreateProject,
    
    // Conversion
    trackPricingViewed,
    trackUpgradeClick,
    trackPurchaseCompleted,
    
    // Quality
    trackError,
    trackEmptyState,
  };
}

// Hook for scroll depth tracking
export function useScrollDepthTracking(pageType: string, entitySlug?: string) {
  const { trackScrollDepth, resetScrollTracking } = useTracking();

  useEffect(() => {
    resetScrollTracking();

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (window.scrollY / scrollHeight) * 100;

      const depths = [25, 50, 75, 100] as const;
      for (const depth of depths) {
        if (scrollPercent >= depth) {
          trackScrollDepth({ depth, page_type: pageType, entity_slug: entitySlug });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pageType, entitySlug, trackScrollDepth, resetScrollTracking]);
}
