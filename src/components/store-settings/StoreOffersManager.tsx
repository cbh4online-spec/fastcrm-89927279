import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useStoreOffers, useRespondToOffer, type StoreOffer } from "@/hooks/useStoreOffers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HandCoins, Check, X, ArrowLeftRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  accepted: { label: "Aceite", variant: "default" },
  rejected: { label: "Recusada", variant: "destructive" },
  countered: { label: "Contraproposta", variant: "secondary" },
  expired: { label: "Expirada", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "secondary" },
};

export function StoreOffersManager() {
  const { currentWorkspace } = useWorkspace();
  const { data: offers = [], isLoading } = useStoreOffers(currentWorkspace?.id || "");
  const respond = useRespondToOffer();
  const [selected, setSelected] = useState<StoreOffer | null>(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  const handleAction = (action: "accepted" | "rejected" | "countered") => {
    if (!selected || !currentWorkspace) return;
    respond.mutate(
      {
        offerId: selected.id,
        workspaceId: currentWorkspace.id,
        action,
        counterPrice: action === "countered" ? parseFloat(counterPrice) : undefined,
        adminMessage: adminMessage.trim() || undefined,
        productId: selected.product_id,
      },
      { onSuccess: () => { setSelected(null); setCounterPrice(""); setAdminMessage(""); } }
    );
  };

  const pending = offers.filter((o) => o.status === "pending");
  const others = offers.filter((o) => o.status !== "pending");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HandCoins className="h-5 w-5" />
          Ofertas Recebidas
        </CardTitle>
        <CardDescription>Gerir propostas de preço dos clientes</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : offers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma oferta recebida ainda.</p>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Pendentes ({pending.length})</h4>
                <div className="space-y-2">
                  {pending.map((o) => (
                    <OfferRow key={o.id} offer={o} onClick={() => setSelected(o)} />
                  ))}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Histórico</h4>
                <div className="space-y-2">
                  {others.slice(0, 20).map((o) => (
                    <OfferRow key={o.id} offer={o} onClick={() => setSelected(o)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Response Dialog */}
        <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Responder à Oferta</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Cliente:</span> <strong>{selected.customer_name}</strong></div>
                  <div><span className="text-muted-foreground">Email:</span> {selected.customer_email}</div>
                  <div><span className="text-muted-foreground">Preço original:</span> €{selected.original_price}</div>
                  <div><span className="text-muted-foreground">Oferta:</span> <strong className="text-primary">€{selected.offered_price}</strong></div>
                </div>
                {selected.message && (
                  <div className="text-sm bg-muted rounded-lg p-3">
                    <p className="text-muted-foreground text-xs mb-1">Mensagem do cliente:</p>
                    {selected.message}
                  </div>
                )}

                {selected.status === "pending" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Contraproposta (€) — opcional</Label>
                      <Input type="number" step="0.01" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} placeholder="Valor da contraproposta" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mensagem (opcional)</Label>
                      <Textarea value={adminMessage} onChange={(e) => setAdminMessage(e.target.value)} rows={2} placeholder="Resposta ao cliente..." />
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 gap-1" onClick={() => handleAction("accepted")} disabled={respond.isPending}>
                        <Check className="h-4 w-4" /> Aceitar
                      </Button>
                      <Button variant="outline" className="flex-1 gap-1" onClick={() => handleAction("countered")} disabled={respond.isPending || !counterPrice}>
                        <ArrowLeftRight className="h-4 w-4" /> Contrapropor
                      </Button>
                      <Button variant="destructive" className="flex-1 gap-1" onClick={() => handleAction("rejected")} disabled={respond.isPending}>
                        <X className="h-4 w-4" /> Recusar
                      </Button>
                    </div>
                  </>
                )}

                {selected.status !== "pending" && (
                  <div className="text-sm text-muted-foreground">
                    Esta oferta já foi {STATUS_MAP[selected.status]?.label?.toLowerCase() || selected.status}.
                    {selected.coupon_code && (
                      <p className="mt-1">Cupão gerado: <strong>{selected.coupon_code}</strong></p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function OfferRow({ offer, onClick }: { offer: StoreOffer; onClick: () => void }) {
  const st = STATUS_MAP[offer.status] || { label: offer.status, variant: "secondary" as const };
  const discount = Math.round(((offer.original_price - offer.offered_price) / offer.original_price) * 100);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{offer.customer_name}</p>
        <p className="text-xs text-muted-foreground">{offer.customer_email}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-primary">€{offer.offered_price}</p>
        <p className="text-[10px] text-muted-foreground">-{discount}%</p>
      </div>
      <Badge variant={st.variant} className="text-[10px] flex-shrink-0">{st.label}</Badge>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">
        {format(new Date(offer.created_at), "dd MMM", { locale: pt })}
      </span>
    </button>
  );
}
