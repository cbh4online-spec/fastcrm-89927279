import { useParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead, generateBreadcrumbs } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { HeroSection } from '../components/pages/shared/HeroSection';
import { BenefitsList } from '../components/pages/shared/BenefitsList';
import { ValueGateBanner } from '../components/pages/shared/ValueGateBanner';
import { StickyCTABar } from '../components/pages/shared/StickyCTABar';
import { ContentSections } from '../components/shared/ContentSections';
import { FAQSection } from '../components/pages/shared/FAQSection';
import { CTASection } from '../components/pages/shared/CTASection';
import { RelatedContent } from '../components/pages/shared/RelatedContent';
import { KeywordGeneratorWidget } from '../components/tools/KeywordGeneratorWidget';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { useSEOEntity } from '../hooks/useSEOEntity';
import { useTracking, useScrollDepthTracking } from '../hooks/useTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lightbulb, Target, Zap } from 'lucide-react';
import NotFound from '@/pages/NotFound';

const templateBenefits = [
  {
    icon: Lightbulb,
    title: 'Configuração Guiada',
    description: 'Template pré-configurado para o seu caso de uso específico.',
  },
  {
    icon: Target,
    title: 'Resultados Otimizados',
    description: 'Keywords mais relevantes para o seu nicho e objetivo.',
  },
  {
    icon: Zap,
    title: 'Mais Rápido',
    description: 'Poupe tempo com configurações já testadas e otimizadas.',
  },
];

export default function TemplateDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading } = useSEOEntity('template', slug || '');
  const { trackPageView } = useTracking();
  const generatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (entity) {
      trackPageView({
        page_type: 'template',
        entity_slug: slug,
        intent: entity.intent || undefined,
      });
    }
  }, [entity, slug, trackPageView]);

  useScrollDepthTracking('template', slug);

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
  const templateName = entity.title || slug || 'Template';

  // Example seed for this template
  const exampleSeed = entity.content?.toolConfig?.placeholder || 'marketing digital';

  return (
    <SEOPublicLayout>
      <SEOHead entity={entity} breadcrumbs={breadcrumbs} />
      
      <div className="container">
        <Breadcrumbs items={breadcrumbs} className="pt-4" />

        {/* Hero Section */}
        <HeroSection
          title={`Template: ${templateName}`}
          subtitle={entity.tldr || 'Use este template para gerar keywords otimizadas para o seu caso de uso específico'}
          ctaText="Usar Este Template"
          ctaOnClick={scrollToGenerator}
          badge="Template de Keywords"
          pageType="template"
          entitySlug={slug}
        />

        {/* What This Template Does */}
        <section className="max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">O que este template faz</h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { step: '1', title: 'Escolha o Template', desc: 'Já está selecionado! Este template está otimizado para o seu caso.' },
              { step: '2', title: 'Introduza a Keyword', desc: 'Adicione a sua keyword principal e personalize se necessário.' },
              { step: '3', title: 'Gere e Exporte', desc: 'Receba keywords filtradas e otimizadas para exportar.' },
            ].map((item) => (
              <div key={item.step}>
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pre-filled Example */}
        <Card className="max-w-3xl mx-auto mb-12 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Exemplo Pré-preenchido</span>
              <Badge variant="outline" className="text-primary border-primary">
                <CheckCircle className="h-3 w-3 mr-1" />
                Template Aplicado
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/50 mb-4">
              <p className="text-sm text-muted-foreground mb-1">Keyword Seed:</p>
              <p className="font-medium text-lg">"{exampleSeed}"</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Este template já está configurado para gerar keywords otimizadas. 
              Pode usar a keyword de exemplo ou substituir pela sua.
            </p>
          </CardContent>
        </Card>

        {/* Generator Widget */}
        <div ref={generatorRef} className="max-w-3xl mx-auto mb-12">
          <KeywordGeneratorWidget 
            initialSeedKeyword={exampleSeed}
            showResults={true}
            placement="page"
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-8 py-8">
          <article className="space-y-12">
            {/* Benefits */}
            <BenefitsList
              title="Vantagens deste template"
              benefits={templateBenefits}
              variant="cards"
              columns={3}
            />

            {/* Content Sections */}
            <ContentSections sections={entity.content?.sections} />

            {/* Use Cases */}
            {entity.content?.examples && entity.content.examples.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Casos de Uso</h2>
                <div className="grid gap-4">
                  {entity.content.examples.map((example, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex gap-4">
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">{example.title}</p>
                            {example.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {example.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* FAQs */}
            {entity.content?.faqs && entity.content.faqs.length > 0 && (
              <FAQSection faqs={entity.content.faqs} />
            )}

            {/* Final CTA */}
            <CTASection
              cta={{
              type: 'try_tool',
                text: 'Personalizar e Exportar Keywords',
                url: '/tools/keyword-ideas',
                variant: 'primary',
              }}
              variant="hero"
              pageType="template"
              entitySlug={slug}
            />
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            <CTASection 
              variant="sidebar" 
              pageType="template" 
              entitySlug={slug}
              cta={{
                type: 'try_tool',
                text: 'Gerar Keywords com Template',
                url: '/tools/keyword-ideas',
                variant: 'primary',
              }}
            />
            <RelatedContent entityType="template" currentSlug={slug || ''} />
          </aside>
        </div>
      </div>

      {/* Value Gate Banner */}
      <ValueGateBanner
        variant="soft"
        pageType="template"
        entitySlug={slug}
        showAfterScroll={60}
      />

      {/* Sticky CTA */}
      <StickyCTABar
        ctaText="Usar Template"
        ctaOnClick={scrollToGenerator}
        showAfterScroll={35}
        pageType="template"
        entitySlug={slug}
      />
    </SEOPublicLayout>
  );
}
