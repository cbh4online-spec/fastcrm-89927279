import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, FileDown, ShoppingCart, FileText, AlertTriangle } from "lucide-react";

interface NeedsBoardHeaderProps {
  totalNeeds: number;
  totalShortage: number;
  totalValue: number;
  isRecomputing: boolean;
  onRecompute: () => void;
  selectedCount: number;
  onBulkCreatePO: () => void;
  onBulkCreateRFQ: () => void;
  onExportCSV: () => void;
  isCreatingPO: boolean;
  isCreatingRFQ: boolean;
}

export function NeedsBoardHeader({
  totalNeeds, totalShortage, totalValue,
  isRecomputing, onRecompute,
  selectedCount, onBulkCreatePO, onBulkCreateRFQ, onExportCSV,
  isCreatingPO, isCreatingRFQ,
}: NeedsBoardHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Necessidades de Compra
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Produtos que precisam ser comprados para cumprir vendas ativas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExportCSV}>
            <FileDown className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onRecompute} disabled={isRecomputing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRecomputing ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Itens em falta</p>
          <p className="text-2xl font-bold text-foreground">{totalNeeds}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Unidades em falta</p>
          <p className="text-2xl font-bold text-destructive">{totalShortage}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor estimado</p>
          <p className="text-2xl font-bold text-foreground">€{totalValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Badge variant="secondary">{selectedCount} selecionado(s)</Badge>
          <Button size="sm" onClick={onBulkCreateRFQ} disabled={isCreatingRFQ}>
            <FileText className="h-4 w-4 mr-1" /> Criar RFQ
          </Button>
          <Button size="sm" onClick={onBulkCreatePO} disabled={isCreatingPO}>
            <ShoppingCart className="h-4 w-4 mr-1" /> Criar OC
          </Button>
        </div>
      )}
    </div>
  );
}
