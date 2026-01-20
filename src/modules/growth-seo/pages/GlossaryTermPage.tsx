import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead, generateBreadcrumbs } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { ContentSections } from '../components/shared/ContentSections';
import { CTASection } from '../components/pages/shared/CTASection';
import { RelatedContent } from '../components/pages/shared/RelatedContent';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { useSEOEntity } from '../hooks/useSEOEntity';
import { useTracking } from '../hooks/useTracking';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Lightbulb } from 'lucide-react';
import NotFound from '@/pages/NotFound';

export default function GlossaryTermPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading } = useSEOEntity('glossary', slug || '');
  const { trackPageView } = useTracking();

  useEffect(() => {
    if (entity) {
      trackPageView({
        page_type: 'glossary',
        entity_slug: slug,
        intent: 'informational',
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

        <div className="max-w-3xl mx-auto mt-6">
          <article>
            <header className="mb-8">
              <div className="flex items-center gap-2 text-primary mb-2">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-medium">Glossário</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{entity.h1 || entity.title}</h1>
            </header>

            {/* Definition Card */}
            <Card className="mb-8 border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h2 className="font-semibold mb-2">Definição</h2>
                    <p className="text-lg text-muted-foreground">
                      {entity.tldr || entity.meta_description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Extended Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ContentSections sections={entity.content?.sections} />
            </div>

            {/* Examples */}
            {entity.content?.examples && entity.content.examples.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Exemplos Práticos</h2>
                <div className="space-y-4">
                  {entity.content.examples.map((example, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-2">{example.title}</h3>
                        {example.description && (
                          <p className="text-muted-foreground">{example.description}</p>
                        )}
                        {example.input && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <span className="font-medium">Input:</span> {example.input}
                          </div>
                        )}
                        {example.output && (
                          <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                            <span className="font-medium">Output:</span> {example.output}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12">
              <CTASection
                cta={entity.content?.cta}
                pageType="glossary"
                entitySlug={slug}
              />
            </div>

            <div className="mt-12 pt-8 border-t">
              <RelatedContent 
                entityType="glossary" 
                currentSlug={slug || ''} 
                title="Termos Relacionados" 
              />
            </div>
          </article>
        </div>
      </div>
    </SEOPublicLayout>
  );
}
