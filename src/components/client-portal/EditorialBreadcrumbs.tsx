import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface EditorialBreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Mostra ícone Home no primeiro item se ele tiver `to` (default: true) */
  showHomeIcon?: boolean;
}

/**
 * Breadcrumbs editoriais para o portal profissional.
 * Estilo: pequeno, uppercase tracking, separador chevron, último item em ink.
 */
export function EditorialBreadcrumbs({
  items,
  showHomeIcon = true,
}: EditorialBreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center text-xs uppercase tracking-[0.18em] text-muted-foreground"
    >
      <ol className="flex items-center flex-wrap gap-y-1">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const isFirst = idx === 0;

          return (
            <Fragment key={`${item.label}-${idx}`}>
              <li className="flex items-center">
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="inline-flex items-center gap-1.5 hover:text-[hsl(var(--editorial-ink))] transition-colors"
                  >
                    {isFirst && showHomeIcon && (
                      <Home className="h-3 w-3" aria-hidden="true" />
                    )}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      isLast ? "text-[hsl(var(--editorial-ink))]" : ""
                    }`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {isFirst && showHomeIcon && (
                      <Home className="h-3 w-3" aria-hidden="true" />
                    )}
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="flex items-center">
                  <ChevronRight className="h-3 w-3 mx-2 opacity-60" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
