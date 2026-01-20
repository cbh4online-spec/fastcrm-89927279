import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, FileText } from 'lucide-react';
import { useRelatedEntities } from '../../../hooks/useSEOEntity';
import { Skeleton } from '@/components/ui/skeleton';
import type { EntityType } from '../../../types';

interface RelatedContentProps {
  entityType: EntityType;
  currentSlug: string;
  title?: string;
  limit?: number;
  className?: string;
}

export function RelatedContent({ 
  entityType, 
  currentSlug, 
  title = 'Conteúdo Relacionado',
  limit = 5,
  className = '' 
}: RelatedContentProps) {
  const { data: related, isLoading } = useRelatedEntities(entityType, currentSlug, limit);

  if (isLoading) {
    return (
      <section className={className}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!related || related.length === 0) return null;

  return (
    <section className={className}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        {title}
      </h3>
      <div className="space-y-3">
        {related.map((item) => (
          <Link 
            key={item.id} 
            to={`/${item.entity_type}s/${item.slug}`}
            className="block group"
          >
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium group-hover:text-primary transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    {item.tldr && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.tldr}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
