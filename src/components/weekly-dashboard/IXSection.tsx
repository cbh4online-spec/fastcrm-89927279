import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IXSectionProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Renderiza o conteúdo sem o "cartão" branco interior — útil para blocos que já têm a sua própria moldura. */
  bare?: boolean;
  id?: string;
}

/**
 * Wrapper visual ao estilo InvoiceXpress:
 * - Título grande + subtítulo discreto
 * - Cartão branco arejado com sombra subtil
 * - Espaçamento generoso entre secções
 */
export function IXSection({
  title,
  subtitle,
  actions,
  children,
  className,
  bare = false,
  id,
}: IXSectionProps) {
  return (
    <section id={id} className={cn("space-y-4", className)}>
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>

      {bare ? (
        <div>{children}</div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 sm:p-6">
          {children}
        </div>
      )}
    </section>
  );
}
