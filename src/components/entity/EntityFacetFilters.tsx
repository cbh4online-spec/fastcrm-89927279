import { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface FacetDef {
  key: string;
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}

/**
 * Constrói as opções de um facet a partir de uma lista de registos.
 * O getter devolve um valor ou uma lista de valores (ex.: tags).
 */
export function buildFacetOptions<T>(
  items: T[],
  getter: (item: T) => string | string[] | null | undefined,
  labelize: (value: string) => string = (v) => v,
): FacetOption[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const raw = getter(item);
    const values = Array.isArray(raw) ? raw : [raw];
    for (const v of values) {
      const value = (v ?? "").toString().trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count, label: labelize(value) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Verifica se um registo passa num facet (OR dentro do facet). */
export function matchesFacet(
  selected: string[],
  raw: string | string[] | null | undefined,
): boolean {
  if (selected.length === 0) return true;
  const values = (Array.isArray(raw) ? raw : [raw])
    .map((v) => (v ?? "").toString().trim())
    .filter(Boolean);
  return values.some((v) => selected.includes(v));
}

function FacetSection({ facet }: { facet: FacetDef }) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? facet.options.filter((o) => o.label.toLowerCase().includes(q))
      : facet.options;
    return list.slice(0, 200);
  }, [facet.options, query]);

  const toggle = (value: string) => {
    facet.onChange(
      facet.selected.includes(value)
        ? facet.selected.filter((v) => v !== value)
        : [...facet.selected, value],
    );
  };

  return (
    <div className="space-y-2 border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {facet.label}
        </span>
        {facet.selected.length > 0 && (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => facet.onChange([])}
          >
            Limpar
          </button>
        )}
      </div>

      {facet.options.length > 8 && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Pesquisar ${facet.label.toLowerCase()}`}
          className="h-8 text-xs"
          aria-label={`Pesquisar ${facet.label}`}
        />
      )}

      {facet.options.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem valores disponíveis.</p>
      ) : (
        <ScrollArea className={cn(facet.options.length > 6 ? "h-40" : "")}>
          <div className="space-y-1 pr-2">
            {options.map((o) => {
              const id = `${facet.key}-${o.value}`;
              return (
                <label
                  key={o.value}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent/50"
                >
                  <Checkbox
                    id={id}
                    checked={facet.selected.includes(o.value)}
                    onCheckedChange={() => toggle(o.value)}
                  />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {o.count}
                  </span>
                </label>
              );
            })}
            {options.length === 0 && (
              <p className="text-xs text-muted-foreground">Sem resultados.</p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface EntityFacetFiltersProps {
  facets: FacetDef[];
  className?: string;
}

/** Botão + popover de filtros multi-seleção (origem, tags, estado, …). */
export function EntityFacetFilters({ facets, className }: EntityFacetFiltersProps) {
  const activeCount = facets.reduce((acc, f) => acc + f.selected.length, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 gap-2", activeCount > 0 && "border-primary/50 text-primary", className)}
          aria-label="Filtros avançados"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs tabular-nums">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Filtros</span>
          {activeCount > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => facets.forEach((f) => f.onChange([]))}
            >
              Limpar tudo
            </button>
          )}
        </div>
        {facets.map((facet) => (
          <FacetSection key={facet.key} facet={facet} />
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Chips com os filtros ativos, removíveis individualmente. */
export function EntityFacetChips({ facets }: { facets: FacetDef[] }) {
  const active = facets.flatMap((f) =>
    f.selected.map((value) => ({ facet: f, value })),
  );
  if (active.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {active.map(({ facet, value }) => (
        <Badge
          key={`${facet.key}-${value}`}
          variant="secondary"
          className="gap-1 pl-2 pr-1 text-xs font-normal"
        >
          <span className="text-muted-foreground">{facet.label}:</span>
          <span className="font-medium">
            {facet.options.find((o) => o.value === value)?.label ?? value}
          </span>
          <button
            type="button"
            aria-label={`Remover filtro ${facet.label}: ${value}`}
            className="rounded-full p-0.5 hover:bg-muted"
            onClick={() =>
              facet.onChange(facet.selected.filter((v) => v !== value))
            }
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <button
        type="button"
        className="text-xs text-muted-foreground hover:underline"
        onClick={() => facets.forEach((f) => f.onChange([]))}
      >
        Limpar tudo
      </button>
    </div>
  );
}
