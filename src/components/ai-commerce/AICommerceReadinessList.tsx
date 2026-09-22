import { useMemo, useState } from "react";
import { Search, Sparkles, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAICommerceProducts } from "@/hooks/useAICommerce";
import { ProductAICommerceTab } from "./ProductAICommerceTab";
import { BulkAICommerceDialog } from "./BulkAICommerceDialog";

type Filter = "all" | "enabled" | "errors" | "ready" | "disabled" | "no-content";

export function AICommerceReadinessList() {
  const { data, isLoading } = useAICommerceProducts();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const pageSize = 25;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data || []).filter((row) => {
      if (term) {
        const haystack = `${row.product.name ?? ""} ${row.product.sku ?? ""} ${row.product.brand ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      const enabled = !!row.ai?.ai_commerce_enabled;
      if (filter === "enabled") return enabled;
      if (filter === "disabled") return !enabled;
      if (filter === "ready") return enabled && row.readiness.isReady;
      if (filter === "errors") return enabled && !row.readiness.isReady;
      if (filter === "no-content") {
        return !row.ai?.ai_long_description || !row.ai?.ai_short_description || !row.ai?.ai_title;
      }
      return true;
    });
  }, [data, search, filter]);

  const paged = rows.slice(page * pageSize, page * pageSize + pageSize);
  const selected = (data || []).find((r) => r.product.id === selectedId) || null;

  const checkedRows = useMemo(() => rows.filter((r) => checked[r.product.id]), [rows, checked]);
  const allPagedChecked = paged.length > 0 && paged.every((r) => checked[r.product.id]);

  const togglePage = () => {
    setChecked((prev) => {
      const next = { ...prev };
      paged.forEach((r) => {
        if (allPagedChecked) delete next[r.product.id];
        else next[r.product.id] = true;
      });
      return next;
    });
  };

  const bulkTargets = useMemo(
    () =>
      (checkedRows.length > 0 ? checkedRows : rows).map((r) => ({
        id: r.product.id,
        name: r.product.name || "Produto sem nome",
        sku: r.product.sku,
      })),
    [checkedRows, rows],
  );

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Pesquisar produtos"
            placeholder="Pesquisar por nome, SKU ou marca"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {(
          [
            ["all", "Todos"],
            ["enabled", "AI ativo"],
            ["ready", "AI-ready"],
            ["errors", "Com erros"],
            ["disabled", "Sem AI"],
            ["no-content", "Sem conteúdo IA"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => {
              setFilter(value);
              setPage(0);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
        <span className="text-sm text-muted-foreground">
          {checkedRows.length > 0
            ? `${checkedRows.length} selecionado${checkedRows.length > 1 ? "s" : ""}`
            : `Sem seleção — serão processados os ${rows.length} produtos filtrados`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" disabled={paged.length === 0} onClick={togglePage}>
            {allPagedChecked ? "Limpar esta página" : "Selecionar esta página"}
          </Button>
          <Button size="sm" className="gap-2" disabled={bulkTargets.length === 0} onClick={() => setBulkOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Enriquecer com IA ({bulkTargets.length})
          </Button>
        </div>
      </div>

      <BulkAICommerceDialog open={bulkOpen} onOpenChange={setBulkOpen} targets={bulkTargets} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[200px]">Readiness</TableHead>
                <TableHead>Problemas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Sem produtos para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {paged.map((row) => (
                <TableRow key={row.product.id}>
                  <TableCell>
                    <div className="font-medium">{row.product.name}</div>
                    <div className="text-xs text-muted-foreground">{row.product.sku || "sem SKU"}</div>
                  </TableCell>
                  <TableCell>{row.product.brand || "—"}</TableCell>
                  <TableCell>
                    {row.ai?.ai_commerce_enabled ? (
                      <Badge variant={row.readiness.isReady ? "default" : "destructive"}>
                        {row.readiness.isReady ? "AI-ready" : "Incompleto"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={row.readiness.score} className="h-2" />
                      <span className="w-10 text-right text-sm tabular-nums">{row.readiness.score}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.readiness.issues.length === 0
                      ? "—"
                      : row.readiness.issues
                          .slice(0, 2)
                          .map((i) => i.label)
                          .join(", ") + (row.readiness.issues.length > 2 ? "…" : "")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(row.product.id)}>
                      <Wrench className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Corrigir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {rows.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} de {rows.length}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={(page + 1) * pageSize >= rows.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Seguinte
            </Button>
          </div>
        </div>
      )}

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{selected?.product.name || "Produto"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {selected && <ProductAICommerceTab product={selected.product} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
