import { Link } from 'react-router-dom';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { HeroSection } from '../components/pages/shared/HeroSection';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { useSEOComparisonsList } from '../hooks/useSEOEntity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Scale } from 'lucide-react';

const breadcrumbs = [
  { name: 'Início', url: '/' },
  { name: 'Comparações', url: '/compare' },
];

export default function CompareListPage() {
  const { data, isLoading } = useSEOComparisonsList({ limit: 50 });

  if (isLoading) {
    return (
      <SEOPublicLayout>
        <PageSkeleton variant="list" />
      </SEOPublicLayout>
    );
  }

  const comparisons = data?.comparisons || [];

  return (
    <SEOPublicLayout>
      <SEOHead
        title="Comparações de Ferramentas de Keywords | FastCRM"
        description="Compare o FastCRM com as principais ferramentas de keyword research. Veja preços, funcionalidades e qual é melhor para si."
        breadcrumbs={breadcrumbs}
      />

      <div className="container">
        <Breadcrumbs items={breadcrumbs} className="pt-4" />

        <HeroSection
          title="Comparações de Ferramentas"
          subtitle="Veja como o FastCRM se compara às principais ferramentas de keyword research do mercado."
          ctaText="Experimentar Grátis"
          ctaOnClick={() => {}}
          badge="Comparações"
          pageType="compare"
        />

        <div className="max-w-4xl mx-auto grid gap-4 mb-16">
          {comparisons.map((comparison) => (
            <Link key={comparison.id} to={`/compare/${comparison.slug}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{comparison.title}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {comparison.meta_description}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline">Comparação</Badge>
                    {comparison.winner === 'a' && (
                      <Badge variant="secondary">FastCRM vence</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {comparisons.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              Nenhuma comparação disponível de momento.
            </p>
          )}
        </div>
      </div>
    </SEOPublicLayout>
  );
}
