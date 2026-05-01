import { ReactNode } from "react";

interface EditorialPageHeaderProps {
  /** Pequeno texto em maiúsculas acima do título (eyebrow) */
  eyebrow?: string;
  /** Título principal (serif editorial) */
  title: string;
  /** Subtítulo / descrição abaixo do título — pode incluir badges */
  subtitle?: ReactNode;
  /** Ações alinhadas à direita (botões pill) */
  actions?: ReactNode;
}

/**
 * Cabeçalho editorial reutilizável para o portal profissional (Dashboard, Catálogo, etc.).
 * Garante hierarquia, espaçamento e tipografia consistentes.
 */
export function EditorialPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: EditorialPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-editorial text-4xl sm:text-5xl tracking-tight text-[hsl(var(--editorial-ink))]">
          {title}
        </h1>
        {subtitle && (
          <div className="text-muted-foreground mt-2 text-base">
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
