import { useParams, Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead, generateBreadcrumbs } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { HeroSection } from '../components/pages/shared/HeroSection';
import { BenefitsList, categoryPageBenefits } from '../components/pages/shared/BenefitsList';
import { ValueGateBanner } from '../components/pages/shared/ValueGateBanner';
import { StickyCTABar } from '../components/pages/shared/StickyCTABar';
import { ContentSections } from '../components/shared/ContentSections';
import { FAQSection } from '../components/pages/shared/FAQSection';
import { CTASection } from '../components/pages/shared/CTASection';
import { RelatedContent } from '../components/pages/shared/RelatedContent';
import { KeywordGeneratorWidget } from '../components/tools/KeywordGeneratorWidget';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { useSEOEntity, useRelatedEntities } from '../hooks/useSEOEntity';
import { useTracking, useScrollDepthTracking } from '../hooks/useTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp } from 'lucide-react';
import NotFound from '@/pages/NotFound';

export default function CategoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading } = useSEOEntity('category', slug || '');
  const { data: relatedKeywords } = useRelatedEntities('keyword', slug || '', 8);
  const { trackPageView } = useTracking();
  const generatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (entity) {
      trackPageView({
        page_type: 'category',
        entity_slug: slug,
        intent: entity.intent || undefined,
      });
    }
  }, [entity, slug, trackPageView]);

  useScrollDepthTracking('category', slug);

  const scrollToGenerator = () => {
    generatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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
  const categoryName = entity.title || slug || 'categoria';

  return (
    <SEOPublicLayout>
      <SEOHead entity={entity} breadcrumbs={breadcrumbs} />
      
      <div className="container">
        <Breadcrumbs items={breadcrumbs} className="pt-4" />

        {/* Hero Section */}
        <HeroSection
          title={`Keyword Ideas para ${categoryName}`}
          subtitle={entity.tldr || `Descubra keywords de alta intenção e baixa concorrência para o nicho de ${categoryName}`}
          ctaText={`Gerar Keywords de ${categoryName}`}
          ctaOnClick={scrollToGenerator}
          badge={categoryName}
          pageType="category"
          entitySlug={slug}
        />

        {/* Popular Keywords in Category */}
        {relatedKeywords && relatedKeywords.length > 0 && (
          <Card className="max-w-4xl mx-auto mb-12">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Keywords Populares em {categoryName}</span>
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Alta Intenção
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {relatedKeywords.slice(0, 8).map((kw) => (
                  <Link
                    key={kw.id}
                    to={`/keywords/${kw.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {kw.title}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={scrollToGenerator}
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                >
                  Ver mais keywords de {categoryName}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generator Widget */}
        <div ref={generatorRef} className="max-w-3xl mx-auto mb-12">
          <KeywordGeneratorWidget 
            initialSeedKeyword={categoryName.toLowerCase()}
            showResults={true}
            placement="hero"
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-8 py-8">
          <article className="space-y-12">
            {/* Why These Keywords Convert */}
            <BenefitsList
              title={`Porquê keywords de ${categoryName} convertem`}
              benefits={categoryPageBenefits}
              variant="list"
            />

            {/* Content Sections */}
            <ContentSections sections={entity.content?.sections} />

            {/* Inline CTA */}
            <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <p className="text-lg font-medium mb-3">
                Encontre keywords de baixa concorrência
              </p>
              <CTASection
                cta={{
                  type: 'try_tool',
                  text: `Keywords de Baixa Concorrência para ${categoryName}`,
                  url: '/tools/keyword-ideas',
                  variant: 'primary',
                }}
                variant="inline"
                pageType="category"
                entitySlug={slug}
              />
            </div>

            {/* FAQs */}
            {entity.content?.faqs && entity.content.faqs.length > 0 && (
              <FAQSection faqs={entity.content.faqs} />
            )}

            {/* Final CTA */}
            <CTASection
              cta={{
              type: 'try_tool',
                text: `Gerar Keyword Ideas para ${categoryName}`,
                url: '/tools/keyword-ideas',
                variant: 'primary',
              }}
              variant="hero"
              pageType="category"
              entitySlug={slug}
            />
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            <CTASection 
              variant="sidebar" 
              pageType="category" 
              entitySlug={slug}
              cta={{
                type: 'try_tool',
                text: 'Ver Keywords de Alta Intenção',
                url: '/tools/keyword-ideas',
                variant: 'primary',
              }}
            />
            <RelatedContent entityType="category" currentSlug={slug || ''} />
          </aside>
        </div>
      </div>

      {/* Value Gate Banner */}
      <ValueGateBanner
        variant="soft"
        pageType="category"
        entitySlug={slug}
        showAfterScroll={55}
      />

      {/* Sticky CTA */}
      <StickyCTABar
        ctaText={`Keywords de ${categoryName}`}
        ctaOnClick={scrollToGenerator}
        showAfterScroll={40}
        pageType="category"
        entitySlug={slug}
      />
    </SEOPublicLayout>
  );
}
