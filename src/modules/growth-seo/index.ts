// =============================================
// GROWTH/SEO MODULE - PUBLIC EXPORTS
// =============================================

// Types
export * from './types';

// Hooks
export { useConsent } from './hooks/useConsent';
export { useTracking, useScrollDepthTracking } from './hooks/useTracking';
export { 
  useSEOEntity, 
  useSEOEntitiesList, 
  useSEOComparison,
  useSEOComparisonsList,
  useRelatedEntities,
  useSEOFAQs,
} from './hooks/useSEOEntity';

// Components - Consent
export { GDPRBanner } from './components/consent/GDPRBanner';

// Components - Tracking
export { GTMProvider } from './components/tracking/GTMProvider';

// Components - SEO
export { SEOHead, generateBreadcrumbs } from './components/seo/SEOHead';
export { Breadcrumbs } from './components/seo/Breadcrumbs';

// Components - Page Sections
export { FAQSection } from './components/pages/shared/FAQSection';
export { CTASection } from './components/pages/shared/CTASection';
export { RelatedContent } from './components/pages/shared/RelatedContent';
export { ToolWidget } from './components/pages/shared/ToolWidget';
