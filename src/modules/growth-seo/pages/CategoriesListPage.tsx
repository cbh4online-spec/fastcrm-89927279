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

export default function CategoriesListPage() {
  const [page, setPage] = useState(1);
  const { trackSEOPageView } = useTracking();

  const { data, isLoading } = useSEOEntitiesList('category', {
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  });

  useEffect(() => {
    trackSEOPageView({
      page_type: 'category',
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
        title="Categorias de CRM - Explore por Tema"
        description="Explore conteúdos de CRM organizados por categoria: vendas, marketing, automação, gestão de leads e muito mais."
        canonicalUrl="https://fastcrm.lovable.app/categories"
      />
      
      <div className="container py-8">
        <Breadcrumbs
          items={[
            { name: 'Início', url: '/' },
            { name: 'Categorias', url: '/categories' },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Categorias de CRM</h1>
          <p className="text-muted-foreground text-lg">
            Explore conteúdos organizados por tema para encontrar o que precisa.
          </p>
        </div>

        <EntityFilters
          showIntentFilter={false}
          placeholder="Pesquisar categorias..."
        />

        <EntityGrid entities={data?.entities} isLoading={isLoading} />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <div className="mt-16">
          <CTASection variant="footer" pageType="category" />
        </div>
      </div>
    </SEOPublicLayout>
  );
}
