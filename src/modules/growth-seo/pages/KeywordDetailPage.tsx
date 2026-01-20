import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead, generateBreadcrumbs } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { ContentSections } from '../components/shared/ContentSections';
import { FAQSection } from '../components/pages/shared/FAQSection';
import { CTASection } from '../components/pages/shared/CTASection';
import { RelatedContent } from '../components/pages/shared/RelatedContent';
import { ToolWidget } from '../components/pages/shared/ToolWidget';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { useSEOEntity } from '../hooks/useSEOEntity';
import { useTracking } from '../hooks/useTracking';
import NotFound from '@/pages/NotFound';

export default function KeywordDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading } = useSEOEntity('keyword', slug || '');
  const { trackPageView, trackScrollDepth } = useTracking();

  useEffect(() => {
    if (entity) {
      trackPageView({
        page_type: 'keyword',
        entity_slug: slug,
        intent: entity.intent || undefined,
      });
    }
  }, [entity, slug]);

  // Track scroll depth
  useEffect(() => {
    if (!entity) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;

      if (scrollPercent >= 25 && scrollPercent < 50) {
        trackScrollDepth({ depth: 25, page_type: 'keyword', entity_slug: slug });
      } else if (scrollPercent >= 50 && scrollPercent < 75) {
        trackScrollDepth({ depth: 50, page_type: 'keyword', entity_slug: slug });
      } else if (scrollPercent >= 75 && scrollPercent < 100) {
        trackScrollDepth({ depth: 75, page_type: 'keyword', entity_slug: slug });
      } else if (scrollPercent >= 100) {
        trackScrollDepth({ depth: 100, page_type: 'keyword', entity_slug: slug });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [entity, slug]);

  if (isLoading) {
    return (
      <SEOPublicLayout>
        <PageSkeleton variant="detail" />
      </SEOPublicLayout>
    );
  }

  if (!entity) {
    return <NotFound />;
  }

  const breadcrumbs = generateBreadcrumbs(entity);

  return (
    <SEOPublicLayout>
      <SEOHead entity={entity} breadcrumbs={breadcrumbs} />
      
      <div className="container py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid lg:grid-cols-[1fr_300px] gap-8 mt-6">
          {/* Main Content */}
          <article>
            <h1 className="text-3xl font-bold mb-4">{entity.h1 || entity.title}</h1>

            {entity.tldr && (
              <div className="bg-muted/50 border rounded-lg p-4 mb-8">
                <p className="text-lg text-muted-foreground">{entity.tldr}</p>
              </div>
            )}

            <ContentSections sections={entity.content?.sections} />

            {entity.content?.toolConfig && (
              <div className="my-8">
                <ToolWidget
                  toolId={entity.content.toolConfig.toolId}
                  toolName={entity.title}
                  placeholder={entity.content.toolConfig.placeholder}
                  maxInputLength={entity.content.toolConfig.maxInputLength}
                  showPreview={entity.content.toolConfig.showPreview}
                />
              </div>
            )}

            {entity.content?.faqs && entity.content.faqs.length > 0 && (
              <div className="mt-12">
                <FAQSection faqs={entity.content.faqs} />
              </div>
            )}

            <div className="mt-12">
              <CTASection
                cta={entity.content?.cta}
                pageType="keyword"
                entitySlug={slug}
              />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            <CTASection variant="sidebar" pageType="keyword" entitySlug={slug} />
            <RelatedContent entityType="keyword" currentSlug={slug || ''} />
          </aside>
        </div>
      </div>
    </SEOPublicLayout>
  );
}
