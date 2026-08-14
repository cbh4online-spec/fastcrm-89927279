import { cn } from "@/lib/utils";
import type { ListColumnDef } from "./ListColumnsPicker";

interface ListColumnsHeaderProps {
  /** Chaves das colunas visíveis, pela ordem de renderização das linhas. */
  orderedColumns: string[];
  /** Definições das colunas (para obter o rótulo). */
  definitions: Pick<ListColumnDef, "key" | "label">[];
  /** Mapa de larguras usado nas linhas, para alinhamento exacto. */
  columnWidth: Record<string, string>;
  /** Largura da coluna de ações à direita (default: botão de 32px). */
  actionsWidth?: string;
  /** Chaves de colunas numéricas — o rótulo alinha à direita, como as células. */
  rightAlignedKeys?: string[];
  className?: string;
}

/**
 * Cabeçalho de colunas para listagens em cartão (Contactos, Empresas, Leads).
 * Replica o mesmo layout flex das linhas e fica sempre visível (sticky).
 */
export function ListColumnsHeader({
  orderedColumns,
  definitions,
  columnWidth,
  actionsWidth = "w-8",
  className,
}: ListColumnsHeaderProps) {
  const labelOf = (key: string) =>
    definitions.find((d) => d.key === key)?.label ?? key;

  return (
    <div
      role="row"
      className={cn(
        "sticky top-0 z-10 mb-2 flex items-center gap-4 overflow-hidden rounded-xl border border-border/60 bg-muted/40 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-muted/60",
        className,
      )}
    >
      {orderedColumns.map((col) => (
        <div
          key={col}
          role="columnheader"
          className={cn(
            "flex min-w-0 items-center overflow-hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
            columnWidth[col] ?? "min-w-[120px]",
          )}
        >
          <span className="truncate">{labelOf(col)}</span>
        </div>
      ))}
      <div className={cn("ml-auto shrink-0", actionsWidth)} aria-hidden />
    </div>
  );
}
