import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, ShoppingCart, XCircle } from "lucide-react";
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

export function NeedsBoardTable({
  needs, isLoading, selectedIds, onSelectionChange, onViewDetail, onIgnore, onCreatePO,
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
                  {need.suppliers?.name ? (
                    <div>
                      <p className="text-sm">{need.suppliers.name}</p>
                      {need.suggested_unit_price && (
                        <p className="text-xs text-muted-foreground">€{need.suggested_unit_price.toFixed(2)}/un</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem fornecedor</span>
                  )}
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
