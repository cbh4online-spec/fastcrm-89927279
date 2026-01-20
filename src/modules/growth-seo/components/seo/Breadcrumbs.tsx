import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type { Breadcrumb } from '../../types';

interface BreadcrumbsProps {
  items: Breadcrumb[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${className}`}>
      <ol className="flex items-center flex-wrap gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={item.url} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
              )}
              
              {isLast ? (
                <span className="text-foreground font-medium" aria-current="page">
                  {isFirst && <Home className="w-4 h-4 inline mr-1" />}
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.url}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {isFirst && <Home className="w-4 h-4 inline mr-1" />}
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
