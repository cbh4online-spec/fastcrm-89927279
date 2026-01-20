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

export default function ToolDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading } = useSEOEntity('tool', slug || '');
  const { trackPageView } = useTracking();

  useEffect(() => {
    if (entity) {
      trackPageView({
        page_type: 'tool',
        entity_slug: slug,
        intent: 'transactional',
      });
    }
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
          <article>
            <h1 className="text-3xl font-bold mb-4">{entity.h1 || entity.title}</h1>

            {entity.tldr && (
              <div className="bg-muted/50 border rounded-lg p-4 mb-8">
                <p className="text-lg text-muted-foreground">{entity.tldr}</p>
              </div>
            )}

            {/* Tool Widget - Primary Feature */}
            <div className="my-8">
              <ToolWidget
                toolId={entity.content?.toolConfig?.toolId || slug || ''}
                toolName={entity.title}
                placeholder={entity.content?.toolConfig?.placeholder}
                maxInputLength={entity.content?.toolConfig?.maxInputLength}
                showPreview={entity.content?.toolConfig?.showPreview ?? true}
              />
            </div>

            <ContentSections sections={entity.content?.sections} />

            {entity.content?.faqs && entity.content.faqs.length > 0 && (
              <div className="mt-12">
                <FAQSection faqs={entity.content.faqs} />
              </div>
            )}

            <div className="mt-12">
              <CTASection
                cta={entity.content?.cta}
                pageType="tool"
                entitySlug={slug}
              />
            </div>
          </article>

          <aside className="space-y-6">
            <CTASection variant="sidebar" pageType="tool" entitySlug={slug} />
            <RelatedContent entityType="tool" currentSlug={slug || ''} />
          </aside>
        </div>
      </div>
    </SEOPublicLayout>
  );
}
