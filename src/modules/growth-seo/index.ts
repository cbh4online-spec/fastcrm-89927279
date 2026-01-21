// =============================================
// GROWTH/SEO MODULE - PUBLIC EXPORTS
// =============================================

// Types
export * from './types';
export * from './types/keywords';

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
export { useKeywordGenerator } from './hooks/useKeywordGenerator';

// Components - Consent
export { GDPRBanner } from './components/consent/GDPRBanner';

// Components - Tracking
export { GTMProvider } from './components/tracking/GTMProvider';

// Components - SEO
export { SEOHead, generateBreadcrumbs } from './components/seo/SEOHead';
export { Breadcrumbs } from './components/seo/Breadcrumbs';

// Components - Layout
export { SEOPublicLayout } from './components/layout/SEOPublicLayout';
export { SEOHeader } from './components/layout/SEOHeader';
export { SEOFooter } from './components/layout/SEOFooter';

// Components - Shared
export { EntityGrid } from './components/shared/EntityGrid';
export { EntityCard } from './components/shared/EntityCard';
export { EntityFilters } from './components/shared/EntityFilters';
export { ContentSections } from './components/shared/ContentSections';
export { ComparisonTable, ComparisonConclusion } from './components/shared/ComparisonTable';
export { PageSkeleton } from './components/shared/PageSkeleton';
export { Pagination } from './components/shared/Pagination';

// Components - Page Sections
export { FAQSection } from './components/pages/shared/FAQSection';
export { CTASection } from './components/pages/shared/CTASection';
export { RelatedContent } from './components/pages/shared/RelatedContent';
export { ToolWidget } from './components/pages/shared/ToolWidget';

// Components - Tools (Keyword Generator)
export { KeywordGeneratorWidget } from './components/tools/KeywordGeneratorWidget';
export { KeywordResultCard } from './components/tools/KeywordResultCard';
export { KeywordResultsList } from './components/tools/KeywordResultsList';
export { KeywordUnlockCTA } from './components/tools/KeywordUnlockCTA';

// Components - Admin
export { SEOContentGenerator } from './components/admin/SEOContentGenerator';
export { SitemapManager } from './components/admin/SitemapManager';

// Hooks - Content Generation
export { useGenerateSEOContent } from './hooks/useGenerateSEOContent';
export { 
  useAdminSEOEntities, 
  useUpdateEntityStatus, 
  useDeleteEntity, 
  useBulkUpdateStatus,
  useSEOStats,
  useTopPerformingPages,
} from './hooks/useAdminSEOEntities';

// Pages
export { default as KeywordsListPage } from './pages/KeywordsListPage';
export { default as KeywordDetailPage } from './pages/KeywordDetailPage';
export { default as TemplatesListPage } from './pages/TemplatesListPage';
export { default as TemplateDetailPage } from './pages/TemplateDetailPage';
export { default as ToolsListPage } from './pages/ToolsListPage';
export { default as ToolDetailPage } from './pages/ToolDetailPage';
export { default as KeywordIdeasToolPage } from './pages/KeywordIdeasToolPage';
export { default as CategoriesListPage } from './pages/CategoriesListPage';
export { default as CategoryDetailPage } from './pages/CategoryDetailPage';
export { default as ComparePage } from './pages/ComparePage';
export { default as BlogListPage } from './pages/BlogListPage';
export { default as BlogPostPage } from './pages/BlogPostPage';
export { default as GuidePage } from './pages/GuidePage';
export { default as GlossaryListPage } from './pages/GlossaryListPage';
export { default as GlossaryTermPage } from './pages/GlossaryTermPage';
