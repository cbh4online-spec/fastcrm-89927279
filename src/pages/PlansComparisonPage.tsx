import { useMemo, useState } from "react";
import {
  useBillingPlans, useBillingPlanFeatures, useBillingAddons,
  useWorkspaceSubscription, useCreateChangeRequest, type BillingPlan,
} from "@/hooks/useBillingPlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Sparkles, Building2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useStartCheckout } from "@/hooks/useBillingStripe";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2 } from "lucide-react";

const COMPARISON_KEYS: { key: string; label: string }[] = [
  { key: "agents_seats", label: "Agentes incluídos" },
  { key: "whatsapp_messages_monthly", label: "Mensagens WhatsApp/mês" },
  { key: "ai_conversation_analysis", label: "Análises IA" },
  { key: "ai_audio_transcription_minutes", label: "Minutos transcrição" },
  { key: "automation_runs_monthly", label: "Execuções de automação" },
  { key: "support_tickets", label: "Tickets de suporte" },
  { key: "storage_media_mb", label: "Storage (MB)" },
  { key: "quality_reviews", label: "Quality Reviews" },
  { key: "team_inbox", label: "Team Inbox" },
  { key: "ai_coaching", label: "Coaching AI" },
  { key: "support_sla", label: "Suporte SLA" },
  { key: "smart_workflows", label: "Smart Workflows avançados" },
  { key: "multi_provider", label: "Multi-provider" },
];

export default function PlansComparisonPage() {
  const { data: plans = [] } = useBillingPlans();
  const { data: features = [] } = useBillingPlanFeatures();
  const { data: addons = [] } = useBillingAddons();
  const { data: sub } = useWorkspaceSubscription();

  const currentPlanId = sub?.billing_plan_id;

  const featureMap = useMemo(() => {
    const m = new Map<string, Map<string, any>>();
    features.forEach((f) => {
      if (!m.has(f.plan_id)) m.set(f.plan_id, new Map());
      m.get(f.plan_id)!.set(f.feature_key, f);
    });
    return m;
  }, [features]);

  const renderCell = (plan: BillingPlan, key: string) => {
    const f = featureMap.get(plan.id)?.get(key);
    if (!f || !f.included) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
    if (f.limit_value != null) return <span className="text-sm font-medium">{f.limit_value.toLocaleString("pt-PT")}</span>;
    if (f.display_value) return <span className="text-sm">{f.display_value}</span>;
    return <Check className="w-4 h-4 text-primary mx-auto" />;
  };

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight">Planos</h1>
        <p className="text-muted-foreground mt-2">
          Escolha o plano adequado ao volume e maturidade da sua operação.
        </p>
      </header>

      {/* Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} isCurrent={p.id === currentPlanId} />
        ))}
      </div>

      {/* Tabela comparativa */}
      <Card>
        <CardHeader><CardTitle>Comparação detalhada</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Funcionalidade</th>
                {plans.map((p) => (
                  <th key={p.id} className="text-center py-3 px-2 font-medium">
                    <div className="flex flex-col items-center gap-1">
                      <span>{p.name}</span>
                      {p.recommended && <Badge variant="default" className="text-[10px] py-0">Recomendado</Badge>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_KEYS.map((row) => (
                <tr key={row.key} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-2 text-muted-foreground">{row.label}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="text-center py-3 px-2">{renderCell(p, row.key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add-ons */}
      <section id="addons" className="space-y-4">
        <h2 className="text-2xl font-bold">Add-ons</h2>
        <p className="text-muted-foreground">
          Reforce o seu plano com pacotes adicionais quando o volume cresce.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {addons.map((a) => (
            <AddonCard key={a.id} addon={a} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PlanCard({ plan, isCurrent }: { plan: BillingPlan; isCurrent: boolean }) {
  return (
    <Card className={`relative flex flex-col ${plan.recommended ? "border-primary shadow-lg" : ""}`}>
      {plan.recommended && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <Badge className="gap-1"><Sparkles className="w-3 h-3" /> Recomendado</Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {plan.enterprise && <Crown className="w-5 h-5 text-amber-500" />}
          {plan.name}
        </CardTitle>
        <div className="flex items-baseline gap-1 pt-2">
          <span className="text-3xl font-bold">
            {plan.enterprise ? "Sob consulta" : plan.monthly_price != null ? `${plan.monthly_price}€` : "—"}
          </span>
          {!plan.enterprise && plan.monthly_price != null && (
            <span className="text-sm text-muted-foreground">/mês</span>
          )}
        </div>
        {plan.public_description && (
          <p className="text-xs text-muted-foreground mt-2 min-h-[3rem]">{plan.public_description}</p>
        )}
      </CardHeader>
      <CardContent className="mt-auto">
        {isCurrent ? (
          <Button disabled className="w-full" variant="secondary">Plano atual</Button>
        ) : plan.enterprise ? (
          <EnterpriseQuickRequest />
        ) : (
          <UpgradeQuickRequest planId={plan.id} planName={plan.name} />
        )}
      </CardContent>
    </Card>
  );
}

function UpgradeQuickRequest({ planId, planName }: { planId: string; planName: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const create = useCreateChangeRequest();
  const { data: sub } = useWorkspaceSubscription();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Pedir {planName}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pedir plano {planName}</DialogTitle>
          <DialogDescription>A equipa vai validar e entrar em contacto.</DialogDescription>
        </DialogHeader>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={create.isPending}
            onClick={async () => {
              await create.mutateAsync({
                requested_plan_id: planId,
                current_plan_id: sub?.billing_plan_id ?? null,
                request_type: "upgrade",
                notes,
              });
              setOpen(false); setNotes("");
            }}
          >Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnterpriseQuickRequest() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const create = useCreateChangeRequest();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Building2 className="w-4 h-4" /> Contactar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuração Enterprise</DialogTitle>
          <DialogDescription>Conte-nos sobre a sua operação.</DialogDescription>
        </DialogHeader>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Volume, agentes, países, integrações…" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={create.isPending}
            onClick={async () => {
              await create.mutateAsync({ request_type: "enterprise_contact", notes });
              setOpen(false); setNotes("");
            }}
          >Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddonCard({ addon }: { addon: any }) {
  const [open, setOpen] = useState(false);
  const create = useCreateChangeRequest();
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="text-xs uppercase text-muted-foreground">{addon.category}</div>
        <div className="font-semibold">{addon.name}</div>
        <p className="text-xs text-muted-foreground min-h-[2rem]">{addon.description}</p>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-bold">
            {addon.price_per_unit != null ? `${addon.price_per_unit}€` : "—"}
            <span className="text-xs text-muted-foreground font-normal"> / {addon.unit_name}</span>
          </span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline">Pedir</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pedir add-on: {addon.name}</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">A equipa vai entrar em contacto para activar este add-on.</p>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  disabled={create.isPending}
                  onClick={async () => {
                    await create.mutateAsync({
                      request_type: "addon",
                      requested_addon_id: addon.id,
                      notes: `Pedido add-on ${addon.name}`,
                    });
                    setOpen(false);
                  }}
                >Confirmar pedido</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
