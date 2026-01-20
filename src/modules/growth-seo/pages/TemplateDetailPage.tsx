import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead, generateBreadcrumbs } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { ContentSections } from '../components/shared/ContentSections';
import { FAQSection } from '../components/pages/shared/FAQSection';
import { CTASection } from '../components/pages/shared/CTASection';
import { RelatedContent } from '../components/pages/shared/RelatedContent';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { useSEOEntity } from '../hooks/useSEOEntity';
import { useTracking } from '../hooks/useTracking';
import NotFound from '@/pages/NotFound';

export default function TemplateDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading } = useSEOEntity('template', slug || '');
  const { trackSEOPageView } = useTracking();

  useEffect(() => {
    if (entity) {
      trackSEOPageView({
        page_type: 'template',
        entity_slug: slug,
        intent: entity.intent || undefined,
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

            <ContentSections sections={entity.content?.sections} />

            {entity.content?.faqs && entity.content.faqs.length > 0 && (
              <div className="mt-12">
                <FAQSection faqs={entity.content.faqs} />
              </div>
            )}

            <div className="mt-12">
              <CTASection
                cta={entity.content?.cta}
                pageType="template"
                entitySlug={slug}
              />
            </div>
          </article>

          <aside className="space-y-6">
            <CTASection variant="sidebar" pageType="template" entitySlug={slug} />
            <RelatedContent entityType="template" currentSlug={slug || ''} />
          </aside>
        </div>
      </div>
    </SEOPublicLayout>
  );
}
