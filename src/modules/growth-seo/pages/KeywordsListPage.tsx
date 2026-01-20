import { useEffect, useState } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { EntityGrid } from '../components/shared/EntityGrid';
import { EntityFilters } from '../components/shared/EntityFilters';
import { Pagination } from '../components/shared/Pagination';
import { CTASection } from '../components/pages/shared/CTASection';
import { useSEOEntitiesList } from '../hooks/useSEOEntity';
import { useTracking } from '../hooks/useTracking';
import { PageSkeleton } from '../components/shared/PageSkeleton';

const ITEMS_PER_PAGE = 12;

export default function KeywordsListPage() {
  const [page, setPage] = useState(1);
  const [intent, setIntent] = useState<string | null>(null);
  const { trackPageView } = useTracking();

  const { data, isLoading } = useSEOEntitiesList('keyword', {
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
    intent: intent || undefined,
  });

  useEffect(() => {
    trackPageView({
      page_type: 'keyword',
      intent: 'informational',
    });
  }, []);

  const totalPages = data?.total ? Math.ceil(data.total / ITEMS_PER_PAGE) : 1;

  if (isLoading && page === 1) {
    return (
      <SEOPublicLayout>
        <PageSkeleton variant="list" />
      </SEOPublicLayout>
    );
  }

  return (
    <SEOPublicLayout>
      <SEOHead
        title="Keywords de CRM - Encontre as Melhores Palavras-Chave"
        description="Explore as principais keywords de CRM para otimizar a sua estratégia de marketing. Descubra palavras-chave com alto potencial de conversão."
        canonicalUrl="https://fastcrm.lovable.app/keywords"
      />
      
      <div className="container py-8">
        <Breadcrumbs
          items={[
            { name: 'Início', url: '/' },
            { name: 'Keywords', url: '/keywords' },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Keywords de CRM</h1>
          <p className="text-muted-foreground text-lg">
            Explore as principais palavras-chave para a sua estratégia de CRM e vendas.
          </p>
        </div>

        <EntityFilters
          onIntentFilter={setIntent}
          placeholder="Pesquisar keywords..."
        />

        <EntityGrid entities={data?.entities} isLoading={isLoading} />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <div className="mt-16">
          <CTASection variant="footer" pageType="keyword" />
        </div>
      </div>
    </SEOPublicLayout>
  );
}
