import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { IXCard } from "@/components/entity/ix/IXCard";
import { useCheckoutFunnelSteps } from "@/hooks/useCheckoutFunnels";
import { useCheckoutOffers } from "@/hooks/useCheckoutOffers";
import { toast } from "sonner";

const STEP_LABELS: Record<string, string> = {
  upsell: "Upsell",
  downsell: "Downsell",
  thank_you: "Agradecimento",
  checkout: "Checkout",
};

export function FunnelStepsEditor({ funnelId }: { funnelId: string }) {
  const { steps, upsertStep, removeStep } = useCheckoutFunnelSteps(funnelId);
  const { offers } = useCheckoutOffers();
  const [stepType, setStepType] = useState("upsell");
  const [offerId, setOfferId] = useState<string>("");

  const list = steps.data ?? [];

  function handleAdd() {
    if (stepType !== "thank_you" && !offerId) {
      toast.error("Escolha uma oferta para este passo");
      return;
    }
    upsertStep.mutate(
      {
        step_type: stepType,
        offer_id: stepType === "thank_you" ? null : offerId,
        step_order: list.length + 1,
      },
      { onSuccess: () => { setOfferId(""); toast.success("Passo adicionado"); } },
    );
  }

  function move(index: number, direction: -1 | 1) {
    const a = list[index];
    const b = list[index + direction];
    if (!a || !b) return;
    upsertStep.mutate({ id: a.id, step_type: a.step_type, offer_id: a.offer_id, step_order: b.step_order });
    upsertStep.mutate({ id: b.id, step_type: b.step_type, offer_id: b.offer_id, step_order: a.step_order });
  }

  if (steps.isError) {
    return (
      <IXCard title="Passos do funil">
        <div className="space-y-3">
          <p className="text-sm text-destructive">Não foi possível carregar os passos.</p>
          <Button variant="outline" onClick={() => steps.refetch()}>Tentar novamente</Button>
        </div>
      </IXCard>
    );
  }

  return (
    <IXCard title="Passos do funil" description="Sequência apresentada após o pagamento (upsell, downsell, agradecimento).">
      <div className="space-y-5">
        {steps.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem passos configurados. Após o pagamento o cliente vai direto para a página de sucesso.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {list.map((step: any, index: number) => (
              <li key={step.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-sm text-muted-foreground">{index + 1}</span>
                <Badge variant="secondary">{STEP_LABELS[step.step_type] ?? step.step_type}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {step.offer?.name ?? "—"}
                  {step.offer && <span className="ml-2 text-muted-foreground">{Number(step.offer.price).toFixed(2)} {step.offer.currency}</span>}
                </span>
                <Button variant="ghost" size="icon" aria-label="Mover para cima" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Mover para baixo" disabled={index === list.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Remover passo" onClick={() => removeStep.mutate(step.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[160px_1fr_auto_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="step-type" className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={stepType} onValueChange={setStepType}>
              <SelectTrigger id="step-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upsell">Upsell</SelectItem>
                <SelectItem value="downsell">Downsell</SelectItem>
                <SelectItem value="thank_you">Agradecimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="step-offer" className="text-xs text-muted-foreground">Oferta</Label>
            <Select value={offerId} onValueChange={setOfferId} disabled={stepType === "thank_you"}>
              <SelectTrigger id="step-offer"><SelectValue placeholder="Escolher oferta" /></SelectTrigger>
              <SelectContent>
                {(offers.data ?? []).map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.name} — {Number(o.price).toFixed(2)} {o.currency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => setOfferDialogOpen(true)}
            disabled={stepType === "thank_you"}
            aria-label="Criar nova oferta"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova oferta
          </Button>
          <Button onClick={handleAdd} disabled={upsertStep.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>

        {!offers.isLoading && !(offers.data ?? []).length && (
          <div className="space-y-2 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">
              Ainda não tem ofertas. Uma oferta é o produto extra mostrado depois do pagamento (upsell) ou em alternativa
              se o cliente recusar (downsell).
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
          defaultOfferType={stepType === "downsell" ? "downsell" : "upsell"}
          onCreated={(offer) => setOfferId(offer.id)}
        />
      </div>
    </IXCard>
  );
}
