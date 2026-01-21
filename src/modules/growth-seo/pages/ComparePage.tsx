import { useParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { HeroSection } from '../components/pages/shared/HeroSection';
import { StickyCTABar } from '../components/pages/shared/StickyCTABar';
import { ComparisonTable, ComparisonConclusion } from '../components/shared/ComparisonTable';
import { FAQSection } from '../components/pages/shared/FAQSection';
import { CTASection } from '../components/pages/shared/CTASection';
import { KeywordGeneratorWidget } from '../components/tools/KeywordGeneratorWidget';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { useSEOComparison } from '../hooks/useSEOEntity';
import { useTracking, useScrollDepthTracking } from '../hooks/useTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, Zap, ArrowRight } from 'lucide-react';
import NotFound from '@/pages/NotFound';

export default function ComparePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: comparison, isLoading } = useSEOComparison(slug || '');
  const { trackPageView } = useTracking();
  const generatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (comparison) {
      trackPageView({
        page_type: 'compare',
        entity_slug: slug,
        intent: 'commercial',
      });
    }
  }, [comparison, slug, trackPageView]);

  useScrollDepthTracking('compare', slug);

  const scrollToGenerator = () => {
    generatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (isLoading) {
    return (
      <SEOPublicLayout>
        <PageSkeleton variant="comparison" />
      </SEOPublicLayout>
    );
  }

  if (!comparison) {
    return <NotFound />;
  }

  const breadcrumbs = [
    { name: 'Início', url: '/' },
    { name: 'Comparações', url: '/compare' },
    { name: comparison.title, url: `/compare/${slug}` },
  ];

  // Determine the competitor name for display
  const competitorName = comparison.entity_b?.title || 'Concorrente';

  // Reasons why users switch
  const switchReasons = [
    {
      icon: Zap,
      title: 'Mais Rápido',
      description: 'Gere keywords em segundos, não minutos.',
    },
    {
      icon: Users,
      title: 'Mais Intuitivo',
      description: 'Interface simples e focada no que importa.',
    },
    {
      icon: CheckCircle,
      title: 'Grátis para Começar',
      description: 'Experimente todas as funcionalidades sem pagar.',
    },
  ];

  return (
    <SEOPublicLayout>
      <SEOHead
        comparison={comparison}
        breadcrumbs={breadcrumbs}
        title={comparison.title}
        description={comparison.meta_description || undefined}
      />
      
      <div className="container">
        <Breadcrumbs items={breadcrumbs} className="pt-4" />

        {/* Hero Section */}
        <HeroSection
          title={comparison.title}
          subtitle={comparison.content?.introduction || `Compare as funcionalidades e veja qual ferramenta é melhor para gerar keyword ideas`}
          ctaText="Gerar Keyword Ideas com FastCRM"
          ctaOnClick={scrollToGenerator}
          secondaryCTAText="Experimentar Grátis"
          secondaryCTAUrl="/auth"
          badge="Comparação"
          pageType="compare"
          entitySlug={slug}
        />

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto mb-12">
          <ComparisonTable
            criteria={comparison.content?.criteria}
            entityA={comparison.entity_a}
            entityB={comparison.entity_b}
          />
        </div>

        {/* Conclusion */}
        <div className="max-w-4xl mx-auto mb-12">
          <ComparisonConclusion
            winner={comparison.winner}
            conclusion={comparison.content?.conclusion}
            entityA={comparison.entity_a}
            entityB={comparison.entity_b}
          />
        </div>

        {/* Why Users Switch */}
        <Card className="max-w-4xl mx-auto mb-12 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Porquê utilizadores mudam de {competitorName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {switchReasons.map((reason, index) => {
                const Icon = reason.icon;
                return (
                  <div key={index} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{reason.title}</h3>
                      <p className="text-sm text-muted-foreground">{reason.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Try It CTA */}
        <div className="max-w-3xl mx-auto mb-12 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Experimente e veja a diferença
          </h2>
          <p className="text-muted-foreground mb-6">
            Gere keyword ideas agora mesmo e compare com a sua ferramenta atual.
          </p>
        </div>

        {/* Generator Widget */}
        <div ref={generatorRef} className="max-w-3xl mx-auto mb-12">
          <KeywordGeneratorWidget 
            showResults={true}
            placement="page"
          />
        </div>

        {/* FAQs */}
        {comparison.content?.faqs && comparison.content.faqs.length > 0 && (
          <div className="max-w-3xl mx-auto mb-12">
            <FAQSection faqs={comparison.content.faqs} />
          </div>
        )}

        {/* Final CTA */}
        <div className="max-w-2xl mx-auto mb-16">
          <CTASection
            cta={{
              type: 'try_tool',
              text: 'Gerar Keyword Ideas Agora',
              url: '/tools/keyword-ideas',
              variant: 'primary',
            }}
            variant="hero"
            pageType="compare"
            entitySlug={slug}
          />
        </div>
      </div>

      {/* Sticky CTA Bar */}
      <StickyCTABar
        ctaText="Experimentar Grátis"
        ctaUrl="/auth"
        showAfterScroll={25}
        pageType="compare"
        entitySlug={slug}
      />
    </SEOPublicLayout>
  );
}
