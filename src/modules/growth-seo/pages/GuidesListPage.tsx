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

export default function GuidesListPage() {
  const [page, setPage] = useState(1);
  const { trackPageView } = useTracking();

  const { data, isLoading } = useSEOEntitiesList('guide', {
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  });

  useEffect(() => {
    trackPageView({
      page_type: 'guide',
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
        title="Guias FastCRM - Tutoriais e Passo a Passo"
        description="Guias completos sobre CRM, vendas, automação e produtividade. Aprenda a tirar o máximo partido do FastCRM."
        canonicalUrl="https://fastcrm.lovable.app/guides"
      />
      
      <div className="container py-8">
        <Breadcrumbs
          items={[
            { name: 'Início', url: '/' },
            { name: 'Guias', url: '/guides' },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Guias FastCRM</h1>
          <p className="text-muted-foreground text-lg">
            Tutoriais completos e guias passo a passo para dominar o CRM e as vendas.
          </p>
        </div>

        <EntityFilters
          showIntentFilter={false}
          placeholder="Pesquisar guias..."
        />

        <EntityGrid entities={data?.entities} isLoading={isLoading} />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <div className="mt-16">
          <CTASection variant="footer" pageType="guide" />
        </div>
      </div>
    </SEOPublicLayout>
  );
}
