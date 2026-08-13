import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { IXCard } from "@/components/entity/ix/IXCard";
import { useCheckoutOrderBumps } from "@/hooks/useCheckoutOrderBumps";
import { useCheckoutOffers } from "@/hooks/useCheckoutOffers";
import { toast } from "sonner";

export function FunnelBumpsEditor({ funnelId }: { funnelId: string }) {
  const { bumps, addBump, updateBump, removeBump } = useCheckoutOrderBumps(funnelId);
  const { offers } = useCheckoutOffers();
  const [offerId, setOfferId] = useState("");

  const list = bumps.data ?? [];

  function handleAdd() {
    if (!offerId) { toast.error("Escolha uma oferta"); return; }
    addBump.mutate({ offerId, displayOrder: list.length + 1 }, { onSuccess: () => setOfferId("") });
  }

  function move(index: number, direction: -1 | 1) {
    const a = list[index];
    const b = list[index + direction];
    if (!a || !b) return;
    updateBump.mutate({ id: a.id, display_order: b.display_order });
    updateBump.mutate({ id: b.id, display_order: a.display_order });
  }

  if (bumps.isError) {
    return (
      <IXCard title="Order bumps">
        <div className="space-y-3">
          <p className="text-sm text-destructive">Não foi possível carregar os order bumps.</p>
          <Button variant="outline" onClick={() => bumps.refetch()}>Tentar novamente</Button>
        </div>
      </IXCard>
    );
  }

  return (
    <IXCard title="Order bumps" description="Ofertas adicionais mostradas dentro do próprio checkout.">
      <div className="space-y-5">
        {bumps.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem order bumps associados a este funil.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {list.map((bump: any, index: number) => (
              <li key={bump.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {bump.offer?.name ?? "Oferta removida"}
                  {bump.offer && <span className="ml-2 text-muted-foreground">{Number(bump.offer.price).toFixed(2)} {bump.offer.currency}</span>}
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`bump-active-${bump.id}`} className="text-xs text-muted-foreground">Ativo</Label>
                  <Switch
                    id={`bump-active-${bump.id}`}
                    checked={!!bump.is_active}
                    onCheckedChange={(checked) => updateBump.mutate({ id: bump.id, is_active: checked })}
                  />
                </div>
                <Button variant="ghost" size="icon" aria-label="Mover para cima" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Mover para baixo" disabled={index === list.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Remover order bump" onClick={() => removeBump.mutate(bump.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="bump-offer" className="text-xs text-muted-foreground">Oferta</Label>
            <Select value={offerId} onValueChange={setOfferId}>
              <SelectTrigger id="bump-offer"><SelectValue placeholder="Escolher oferta" /></SelectTrigger>
              <SelectContent>
                {(offers.data ?? []).map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.name} — {Number(o.price).toFixed(2)} {o.currency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => setOfferDialogOpen(true)} aria-label="Criar nova oferta">
            <Plus className="mr-2 h-4 w-4" /> Nova oferta
          </Button>
          <Button onClick={handleAdd} disabled={addBump.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Associar
          </Button>
        </div>

        {!offers.isLoading && !(offers.data ?? []).length && (
          <div className="space-y-2 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">
              Ainda não tem ofertas. Um order bump é um extra de baixo valor mostrado dentro do próprio checkout, antes do
              pagamento.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={() => setOfferDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Criar primeira oferta
              </Button>
              <Link to="/dashboard/checkout/offers" className="text-xs text-muted-foreground underline">
                Gerir em Checkout &gt; Ofertas
              </Link>
            </div>
          </div>
        )}

        <OfferFormDialog
          open={offerDialogOpen}
          onOpenChange={setOfferDialogOpen}
          defaultOfferType="order_bump"
          onCreated={(offer) => setOfferId(offer.id)}
        />
      </div>
    </IXCard>
  );
}
