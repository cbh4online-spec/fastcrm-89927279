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

export default function BlogListPage() {
  const [page, setPage] = useState(1);
  const { trackPageView } = useTracking();

  const { data, isLoading } = useSEOEntitiesList('blog', {
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  });

  useEffect(() => {
    trackPageView({
      page_type: 'blog',
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
        title="Blog FastCRM - Dicas de Vendas e CRM"
        description="Artigos, tutoriais e insights sobre CRM, vendas, marketing e produtividade. Aprenda com os melhores especialistas."
        canonicalUrl="https://fastcrm.lovable.app/blog"
      />
      
      <div className="container py-8">
        <Breadcrumbs
          items={[
            { name: 'Início', url: '/' },
            { name: 'Blog', url: '/blog' },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Blog FastCRM</h1>
          <p className="text-muted-foreground text-lg">
            Artigos, tutoriais e insights sobre CRM, vendas e produtividade.
          </p>
        </div>

        <EntityFilters
          showIntentFilter={false}
          placeholder="Pesquisar artigos..."
        />

        <EntityGrid entities={data?.entities} isLoading={isLoading} />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <div className="mt-16">
          <CTASection variant="footer" pageType="blog" />
        </div>
      </div>
    </SEOPublicLayout>
  );
}
