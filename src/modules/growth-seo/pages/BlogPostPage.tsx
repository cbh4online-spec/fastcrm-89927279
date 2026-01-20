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
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarDays, Eye, Clock } from 'lucide-react';
import NotFound from '@/pages/NotFound';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading } = useSEOEntity('blog', slug || '');
  const { trackSEOPageView } = useTracking();

  useEffect(() => {
    if (entity) {
      trackSEOPageView({
        page_type: 'blog',
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
  const publishedDate = entity.published_at ? new Date(entity.published_at) : null;

  // Estimate reading time (roughly 200 words per minute)
  const wordCount = entity.content?.sections?.reduce((acc, section) => {
    return acc + (section.content?.split(' ').length || 0);
  }, 0) || 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <SEOPublicLayout>
      <SEOHead entity={entity} breadcrumbs={breadcrumbs} />
      
      <div className="container py-8">
        <Breadcrumbs items={breadcrumbs} />

        <article className="max-w-3xl mx-auto mt-6">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{entity.h1 || entity.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {publishedDate && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <time dateTime={entity.published_at || ''}>
                    {format(publishedDate, "d 'de' MMMM, yyyy", { locale: pt })}
                  </time>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{readingTime} min de leitura</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{entity.views_count.toLocaleString('pt-PT')} visualizações</span>
              </div>
            </div>
          </header>

          {entity.tldr && (
            <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-4 mb-8">
              <p className="text-lg font-medium">{entity.tldr}</p>
            </div>
          )}

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ContentSections sections={entity.content?.sections} />
          </div>

          {entity.content?.faqs && entity.content.faqs.length > 0 && (
            <div className="mt-12">
              <FAQSection faqs={entity.content.faqs} />
            </div>
          )}

          <div className="mt-12">
            <CTASection
              cta={entity.content?.cta}
              pageType="blog"
              entitySlug={slug}
            />
          </div>

          <div className="mt-12 pt-8 border-t">
            <RelatedContent entityType="blog" currentSlug={slug || ''} title="Artigos Relacionados" />
          </div>
        </article>
      </div>
    </SEOPublicLayout>
  );
}
