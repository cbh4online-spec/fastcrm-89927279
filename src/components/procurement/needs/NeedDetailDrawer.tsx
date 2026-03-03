import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProcurementNeed } from "@/hooks/useProcurementNeeds";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ShoppingCart, XCircle, Package, FileText, Target } from "lucide-react";

interface NeedDetailDrawerProps {
  need: ProcurementNeed | null;
  onClose: () => void;
  onIgnore: (id: string) => void;
  onCreatePO: (id: string) => void;
}

const SOURCE_ICONS: Record<string, any> = {
  proposal: Target,
  order_note: Package,
  project: FileText,
};

const SOURCE_LABELS: Record<string, string> = {
  proposal: "Proposta",
  order_note: "Nota de Encomenda",
  project: "Projeto",
};

export function NeedDetailDrawer({ need, onClose, onIgnore, onCreatePO }: NeedDetailDrawerProps) {
  if (!need) return null;

  const sources = need.demand_sources_json || [];
  const ranking = need.suggestion_json?.ranking || [];

  return (
    <Sheet open={!!need} onOpenChange={() => onClose()}>
      <SheetContent className="w-[440px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{need.products?.name || "Produto"}</SheetTitle>
          <SheetDescription>
            {need.products?.sku && <span>SKU: {need.products.sku} · </span>}
            Última atualização: {need.last_computed_at ? format(new Date(need.last_computed_at), "dd/MM/yyyy HH:mm") : "—"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Stock summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Stock Disponível</p>
              <p className="text-xl font-bold">{need.stock_available}</p>
              <p className="text-[10px] text-muted-foreground">On-hand: {need.stock_on_hand} | Alocado: {need.stock_allocated}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Em Falta</p>
              <p className={`text-xl font-bold ${need.shortage > 0 ? "text-destructive" : "text-muted-foreground"}`}>{need.shortage}</p>
              <p className="text-[10px] text-muted-foreground">Procura total: {need.demand_total}</p>
            </div>
          </div>

          {need.earliest_due_date && (
            <div className="rounded-lg border p-3 bg-accent/50">
              <p className="text-xs text-muted-foreground">Data mais urgente</p>
              <p className="text-sm font-medium">{format(new Date(need.earliest_due_date), "dd MMMM yyyy", { locale: pt })}</p>
            </div>
          )}

          <Separator />

          {/* Demand sources */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Fontes de Procura ({sources.length})</h3>
            <div className="space-y-2">
              {sources.map((source: any, i: number) => {
                const Icon = SOURCE_ICONS[source.type] || FileText;
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{SOURCE_LABELS[source.type] || source.type}</span>
                      <Badge variant="outline" className="text-[10px]">{source.id?.slice(0, 8)}</Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{source.qty} un</span>
                      {source.due_date && (
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(source.due_date), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Supplier ranking */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Fornecedores Recomendados</h3>
            {ranking.length > 0 ? (
              <div className="space-y-2">
                {ranking.map((s: any, i: number) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded border text-sm ${i === 0 ? "bg-primary/5 border-primary/20" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                      <span>{s.supplier_name}</span>
                      {s.is_preferred && <Badge variant="secondary" className="text-[10px]">Preferido</Badge>}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{s.unit_price?.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">Score: {s.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem fornecedores no catálogo para este produto</p>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => { onCreatePO(need.id); onClose(); }}
              disabled={!need.recommended_supplier_id}
            >
              <ShoppingCart className="h-4 w-4 mr-1" /> Criar OC
            </Button>
            <Button
              variant="outline"
              onClick={() => { onIgnore(need.id); onClose(); }}
            >
              <XCircle className="h-4 w-4 mr-1" /> Ignorar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
