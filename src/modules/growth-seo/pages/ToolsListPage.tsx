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

export default function ToolsListPage() {
  const [page, setPage] = useState(1);
  const [intent, setIntent] = useState<string | null>(null);
  const { trackSEOPageView } = useTracking();

  const { data, isLoading } = useSEOEntitiesList('tool', {
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
    intent: intent || undefined,
  });

  useEffect(() => {
    trackSEOPageView({
      page_type: 'tool',
      intent: 'transactional',
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
        title="Ferramentas de CRM Grátis - Calculadoras e Utilitários"
        description="Experimente ferramentas gratuitas de CRM: calculadoras de ROI, geradores de emails, analisadores de leads e muito mais."
        canonicalUrl="https://fastcrm.lovable.app/tools"
      />
      
      <div className="container py-8">
        <Breadcrumbs
          items={[
            { name: 'Início', url: '/' },
            { name: 'Ferramentas', url: '/tools' },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Ferramentas Gratuitas de CRM</h1>
          <p className="text-muted-foreground text-lg">
            Calculadoras, geradores e utilitários gratuitos para otimizar as suas vendas.
          </p>
        </div>

        <EntityFilters
          onIntentFilter={setIntent}
          showIntentFilter={false}
          placeholder="Pesquisar ferramentas..."
        />

        <EntityGrid entities={data?.entities} isLoading={isLoading} />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <div className="mt-16">
          <CTASection variant="footer" pageType="tool" />
        </div>
      </div>
    </SEOPublicLayout>
  );
}
