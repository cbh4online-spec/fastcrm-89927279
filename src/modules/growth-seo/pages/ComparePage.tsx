import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { ComparisonTable, ComparisonConclusion } from '../components/shared/ComparisonTable';
import { FAQSection } from '../components/pages/shared/FAQSection';
import { CTASection } from '../components/pages/shared/CTASection';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { useSEOComparison } from '../hooks/useSEOEntity';
import { useTracking } from '../hooks/useTracking';
import NotFound from '@/pages/NotFound';

export default function ComparePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: comparison, isLoading } = useSEOComparison(slug || '');
  const { trackPageView } = useTracking();

  useEffect(() => {
    if (comparison) {
      trackPageView({
        page_type: 'compare',
        entity_slug: slug,
        intent: 'commercial',
      });
    }
  }, [comparison, slug]);

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

  return (
    <SEOPublicLayout>
      <SEOHead
        comparison={comparison}
        breadcrumbs={breadcrumbs}
        title={comparison.title}
        description={comparison.meta_description || undefined}
      />
      
      <div className="container py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="max-w-4xl mx-auto mt-6">
          <h1 className="text-3xl font-bold mb-4 text-center">{comparison.title}</h1>

          {comparison.content?.introduction && (
            <p className="text-lg text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              {comparison.content.introduction}
            </p>
          )}

          <ComparisonTable
            criteria={comparison.content?.criteria}
            entityA={comparison.entity_a}
            entityB={comparison.entity_b}
          />

          <ComparisonConclusion
            winner={comparison.winner}
            conclusion={comparison.content?.conclusion}
            entityA={comparison.entity_a}
            entityB={comparison.entity_b}
          />

          {comparison.content?.faqs && comparison.content.faqs.length > 0 && (
            <div className="mt-12">
              <FAQSection faqs={comparison.content.faqs} />
            </div>
          )}

          <div className="mt-12">
            <CTASection variant="hero" pageType="compare" entitySlug={slug} />
          </div>
        </div>
      </div>
    </SEOPublicLayout>
  );
}
