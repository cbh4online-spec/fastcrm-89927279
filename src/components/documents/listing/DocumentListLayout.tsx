import { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DocumentListLayoutProps {
  title: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  chips?: ReactNode;
  toolbar?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shell visual partilhado para listagens de documentos (faturas, propostas,
 * encomendas, guias). Replica o padrão InvoiceXpress mas com os tokens do
 * design system FastCRM (primary = azul).
 */
export function DocumentListLayout({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Pesquisar por detalhes do documento, cliente ou item",
  primaryAction,
  secondaryAction,
  chips,
  toolbar,
  summary,
  children,
  className,
}: DocumentListLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-4 p-6", className)}>
      {/* Header: título + pesquisa + CTAs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>

        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center lg:max-w-3xl lg:justify-end">
          {onSearchChange && (
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-12 rounded-full border-border bg-card pl-11 pr-4 text-sm shadow-sm focus-visible:ring-primary"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            {secondaryAction}
            {primaryAction}
          </div>
        </div>
      </div>

      {/* Chips de filtros */}
      {chips && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {chips}
        </div>
      )}

      {/* Toolbar (selecionar, ordenar, paginação) */}
      {toolbar && <div>{toolbar}</div>}

      {/* Cartão-resumo */}
      {summary && <div>{summary}</div>}

      {/* Conteúdo (lista de documentos) */}
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}
