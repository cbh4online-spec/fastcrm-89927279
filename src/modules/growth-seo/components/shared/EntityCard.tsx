import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, ArrowRight } from 'lucide-react';
import type { SEOEntity, EntityType } from '../../types';

interface EntityCardProps {
  entity: SEOEntity;
}

const intentLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  informational: { label: 'Informativo', variant: 'secondary' },
  commercial: { label: 'Comercial', variant: 'default' },
  transactional: { label: 'Transacional', variant: 'outline' },
};

const typeRoutes: Record<EntityType, string> = {
  keyword: 'keywords',
  template: 'templates',
  category: 'categories',
  tool: 'tools',
  glossary: 'glossary',
  guide: 'guides',
  blog: 'blog',
  profile: 'profiles',
};

export function EntityCard({ entity }: EntityCardProps) {
  const intent = entity.intent ? intentLabels[entity.intent] : null;
  const route = typeRoutes[entity.entity_type];

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <Link to={`/${route}/${entity.slug}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {entity.title}
            </h3>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
          </div>
          {intent && (
            <Badge variant={intent.variant} className="w-fit">
              {intent.label}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {entity.tldr && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {entity.tldr}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{entity.views_count.toLocaleString('pt-PT')} visualizações</span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
