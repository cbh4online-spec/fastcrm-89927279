import { useEffect } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { KeywordGeneratorWidget } from '../components/tools/KeywordGeneratorWidget';
import { FAQSection } from '../components/pages/shared/FAQSection';
import { CTASection } from '../components/pages/shared/CTASection';
import { useTracking } from '../hooks/useTracking';
import { Lightbulb, Target, TrendingUp, Zap } from 'lucide-react';

const features = [
  {
    icon: Lightbulb,
    title: 'Ideias Instantâneas',
    description: 'Gere dezenas de keyword ideas em segundos com IA avançada.',
  },
  {
    icon: Target,
    title: 'Long-tail Keywords',
    description: 'Descubra keywords de cauda longa com baixa concorrência.',
  },
  {
    icon: TrendingUp,
    title: 'Estimativas de Volume',
    description: 'Veja estimativas de volume de pesquisa e dificuldade.',
  },
  {
    icon: Zap,
    title: 'Perguntas Populares',
    description: 'Encontre as perguntas que os utilizadores fazem sobre o tema.',
  },
];

const faqs = [
  {
    question: 'Como funciona o gerador de keyword ideas?',
    answer: 'O nosso gerador usa inteligência artificial para analisar a sua seed keyword e gerar variações relevantes, incluindo keywords principais, long-tail e perguntas que os utilizadores pesquisam.',
  },
  {
    question: 'As estimativas de volume são precisas?',
    answer: 'As estimativas são indicativas (alto, médio, baixo) baseadas em padrões de pesquisa. Para dados exatos, recomendamos cruzar com ferramentas como Google Keyword Planner.',
  },
  {
    question: 'Posso usar as keywords para SEO e Google Ads?',
    answer: 'Sim! As keywords geradas são úteis tanto para otimização orgânica (SEO) quanto para campanhas pagas (Google Ads, Meta Ads).',
  },
  {
    question: 'Quantas keywords posso gerar gratuitamente?',
    answer: 'Utilizadores gratuitos podem ver 5 keywords de preview. Para desbloquear todas as keywords e exportar em CSV, crie uma conta gratuita.',
  },
  {
    question: 'O que são keywords de cauda longa (long-tail)?',
    answer: 'São frases de pesquisa mais longas e específicas (3-5 palavras) que geralmente têm menor volume mas maior intenção de conversão e menos concorrência.',
  },
];

export default function KeywordIdeasToolPage() {
  const { trackPageView } = useTracking();

  useEffect(() => {
    trackPageView({
      page_type: 'tool',
      entity_slug: 'keyword-ideas',
      intent: 'transactional',
    });
  }, []);

  const breadcrumbs = [
    { name: 'Início', url: '/' },
    { name: 'Ferramentas', url: '/tools' },
    { name: 'Keyword Ideas', url: '/tools/keyword-ideas' },
  ];

  return (
    <SEOPublicLayout>
      <SEOHead
        title="Gerador de Keyword Ideas Grátis - Descubra Keywords com IA"
        description="Gere dezenas de keyword ideas instantaneamente com IA. Descubra long-tail keywords, perguntas populares e estimativas de volume para SEO e Google Ads."
        canonicalUrl="https://fastcrm.lovable.app/tools/keyword-ideas"
      />

      <div className="container py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Gerador de Keyword Ideas com IA
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Descubra keywords de alto potencial para SEO e campanhas pagas. 
              Insira uma seed keyword e receba dezenas de ideias em segundos.
            </p>
          </div>

          {/* Main Widget */}
          <KeywordGeneratorWidget className="mb-12" />

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature) => (
              <div key={feature.title} className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Como Usar</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Insira a Seed Keyword</h3>
                <p className="text-sm text-muted-foreground">
                  Digite a keyword principal sobre a qual quer gerar ideias.
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Gere as Keywords</h3>
                <p className="text-sm text-muted-foreground">
                  A nossa IA analisa e gera dezenas de variações relevantes.
                </p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Exporte e Use</h3>
                <p className="text-sm text-muted-foreground">
                  Copie keywords individuais ou exporte todas em CSV.
                </p>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <FAQSection faqs={faqs} />

          {/* CTA */}
          <div className="mt-12">
            <CTASection pageType="tool" entitySlug="keyword-ideas" />
          </div>
        </div>
      </div>
    </SEOPublicLayout>
  );
}
