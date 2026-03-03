import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal, Eye, ShoppingCart, XCircle, ChevronDown, Star, Clock, Trophy } from "lucide-react";
import { ProcurementNeed } from "@/hooks/useProcurementNeeds";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface NeedsBoardTableProps {
  needs: ProcurementNeed[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onViewDetail: (need: ProcurementNeed) => void;
  onIgnore: (id: string) => void;
  onCreatePO: (id: string) => void;
  onChooseSupplier?: (needId: string, supplierId: string, unitPrice: number) => void;
}

const STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  open: { variant: "destructive", label: "Em Falta" },
  rfq_in_progress: { variant: "secondary", label: "RFQ Enviada" },
  ordered: { variant: "default", label: "Encomendado" },
  partially_received: { variant: "outline", label: "Parcial" },
  resolved: { variant: "outline", label: "Resolvido" },
  ignored: { variant: "outline", label: "Ignorado" },
};

function SourceBadges({ sources }: { sources: any[] }) {
  if (!sources?.length) return <span className="text-muted-foreground text-xs">—</span>;
  
  const counts: Record<string, number> = {};
  for (const s of sources) {
    counts[s.type] = (counts[s.type] || 0) + 1;
  }

  const labels: Record<string, string> = {
    proposal: "Propostas",
    order_note: "Encomendas",
    project: "Projetos",
  };

  return (
    <div className="flex gap-1 flex-wrap">
      {Object.entries(counts).map(([type, count]) => (
        <Badge key={type} variant="outline" className="text-[10px] px-1.5 py-0">
          {labels[type] || type} ({count})
        </Badge>
      ))}
    </div>
  );
}

function SupplierPopover({ need, onChoose }: { need: ProcurementNeed; onChoose?: (needId: string, supplierId: string, unitPrice: number) => void }) {
  const ranking: any[] = need.suggestion_json?.ranking || [];

  if (!ranking.length) {
    return <span className="text-xs text-muted-foreground">Sem fornecedor</span>;
  }

  const top = ranking[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-auto p-1 -ml-1 text-left font-normal hover:bg-accent/50" size="sm">
          <div className="flex items-center gap-1">
            <div>
              <p className="text-sm font-medium">{need.suppliers?.name || top.supplier_name}</p>
              {(need.suggested_unit_price || top.unit_price) && (
                <p className="text-xs text-muted-foreground">€{(need.suggested_unit_price || top.unit_price)?.toFixed(2)}/un</p>
              )}
            </div>
            {ranking.length > 1 && <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
          </div>
        </Button>
      </PopoverTrigger>
      {ranking.length > 0 && (
        <PopoverContent className="w-72 p-2" align="start">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Top {Math.min(ranking.length, 3)} fornecedores</p>
          <div className="space-y-1.5">
            {ranking.slice(0, 3).map((s: any, i: number) => (
              <div
                key={s.supplier_id}
                className={`flex items-center justify-between p-2 rounded-md border text-sm cursor-pointer hover:bg-accent/50 transition-colors ${
                  s.supplier_id === need.recommended_supplier_id ? "bg-primary/5 border-primary/30" : ""
                }`}
                onClick={() => onChoose?.(need.id, s.supplier_id, s.unit_price)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  {i === 0 && <Trophy className="h-3 w-3 text-primary shrink-0" />}
                  <span className="truncate">{s.supplier_name}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-medium">€{s.unit_price?.toFixed(2)}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {s.lead_time != null && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{s.lead_time}d</span>}
                    <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5" />{s.score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

export function NeedsBoardTable({
  needs, isLoading, selectedIds, onSelectionChange, onViewDetail, onIgnore, onCreatePO, onChooseSupplier,
}: NeedsBoardTableProps) {
  const allSelected = needs.length > 0 && selectedIds.length === needs.length;

  const toggleAll = () => {
    onSelectionChange(allSelected ? [] : needs.map(n => n.id));
  };

  const toggleOne = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter(i => i !== id)
        : [...selectedIds, id]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!needs.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">Sem necessidades de compra</p>
        <p className="text-sm mt-1">Clique em "Recalcular" para verificar procura vs stock</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Procura</TableHead>
            <TableHead className="text-right">Em Falta</TableHead>
            <TableHead>Data Urgente</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {needs.map((need) => {
            const statusConfig = STATUS_BADGES[need.status] || STATUS_BADGES.open;
            return (
              <TableRow key={need.id} className={selectedIds.includes(need.id) ? "bg-muted/30" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(need.id)}
                    onCheckedChange={() => toggleOne(need.id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm text-foreground">{need.products?.name || "—"}</p>
                    {need.products?.sku && (
                      <p className="text-xs text-muted-foreground">{need.products.sku}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{need.stock_available}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{need.demand_total}</TableCell>
                <TableCell className="text-right">
                  <span className={`tabular-nums font-bold ${need.shortage > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {need.shortage}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {need.earliest_due_date
                    ? format(new Date(need.earliest_due_date), "dd MMM yyyy", { locale: pt })
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <SourceBadges sources={need.demand_sources_json} />
                </TableCell>
                <TableCell>
                  <SupplierPopover need={need} onChoose={onChooseSupplier} />
                </TableCell>
                <TableCell>
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetail(need)}>
                        <Eye className="h-4 w-4 mr-2" /> Ver detalhe
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreatePO(need.id)} disabled={!need.recommended_supplier_id}>
                        <ShoppingCart className="h-4 w-4 mr-2" /> Criar OC
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onIgnore(need.id)}>
                        <XCircle className="h-4 w-4 mr-2" /> Ignorar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
