import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { EntityFilters } from '../components/shared/EntityFilters';
import { Pagination } from '../components/shared/Pagination';
import { CTASection } from '../components/pages/shared/CTASection';
import { useSEOEntitiesList } from '../hooks/useSEOEntity';
import { useTracking } from '../hooks/useTracking';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const ITEMS_PER_PAGE = 24;

// Group terms by first letter
function groupByLetter(entities: Array<{ title: string; slug: string }>) {
  return entities.reduce((acc, entity) => {
    const letter = entity.title.charAt(0).toUpperCase();
    if (!acc[letter]) {
      acc[letter] = [];
    }
    acc[letter].push(entity);
    return acc;
  }, {} as Record<string, typeof entities>);
}

export default function GlossaryListPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const { trackSEOPageView } = useTracking();

  const { data, isLoading } = useSEOEntitiesList('glossary', {
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  });

  useEffect(() => {
    trackSEOPageView({
      page_type: 'glossary',
      intent: 'informational',
    });
  }, []);

  const totalPages = data?.total ? Math.ceil(data.total / ITEMS_PER_PAGE) : 1;

  // Filter and group entities
  const filteredEntities = data?.entities?.filter(entity =>
    entity.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  const groupedEntities = groupByLetter(filteredEntities);
  const letters = Object.keys(groupedEntities).sort();

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
        title="Glossário de CRM - Termos e Definições"
        description="Descubra o significado de termos de CRM, vendas e marketing. Guia completo de A a Z com explicações claras e exemplos práticos."
        canonicalUrl="https://fastcrm.lovable.app/glossary"
      />
      
      <div className="container py-8">
        <Breadcrumbs
          items={[
            { name: 'Início', url: '/' },
            { name: 'Glossário', url: '/glossary' },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Glossário de CRM</h1>
          <p className="text-muted-foreground text-lg">
            Termos e definições essenciais para dominar CRM, vendas e marketing.
          </p>
        </div>

        <EntityFilters
          onSearch={setSearchQuery}
          showIntentFilter={false}
          placeholder="Pesquisar termos..."
        />

        {/* Alphabet Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {letters.map(letter => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-8 h-8 rounded bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-sm font-medium transition-colors"
            >
              {letter}
            </a>
          ))}
        </div>

        {/* Terms by Letter */}
        <div className="space-y-8">
          {letters.map(letter => (
            <section key={letter} id={`letter-${letter}`} className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-4 border-b pb-2">{letter}</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {groupedEntities[letter].map(entity => (
                  <Card key={entity.slug} className="group hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <Link
                        to={`/glossary/${entity.slug}`}
                        className="flex items-center justify-between"
                      >
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {entity.title}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        {filteredEntities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum termo encontrado.</p>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <div className="mt-16">
          <CTASection variant="footer" pageType="glossary" />
        </div>
      </div>
    </SEOPublicLayout>
  );
}
