import { useMemo, useState } from "react";
import {
  useWorkspaceSubscription, useBillingPlans, useBillingPlanFeatures,
  useWorkspaceAddons, useChangeRequests, useCreateChangeRequest,
  type BillingPlan,
} from "@/hooks/useBillingPlans";
import { useCostGuardSummary } from "@/hooks/useCostGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Sparkles, ArrowUpRight, Plus, AlertTriangle, Building2, CreditCard, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStartCheckout, useOpenCustomerPortal } from "@/hooks/useBillingStripe";

export default function MyPlanPage() {
  const { data: sub } = useWorkspaceSubscription();
  const { data: plans = [] } = useBillingPlans();
  const { data: features = [] } = useBillingPlanFeatures();
  const { data: addons = [] } = useWorkspaceAddons();
  const { data: requests = [] } = useChangeRequests();
  const { data: cgSummary } = useCostGuardSummary();
  const createRequest = useCreateChangeRequest();

  const currentPlan = useMemo<BillingPlan | null>(() => {
    if (!sub) return plans.find((p) => p.code === "free") ?? null;
    if (sub.billing_plan_id) return plans.find((p) => p.id === sub.billing_plan_id) ?? null;
    const code = sub.plan === "basic" ? "starter" : sub.plan === "agency" ? "enterprise" : sub.plan;
    return plans.find((p) => p.code === code) ?? null;
  }, [sub, plans]);

  const planFeatures = useMemo(
    () => (currentPlan ? features.filter((f) => f.plan_id === currentPlan.id) : []),
    [currentPlan, features],
  );

  const limits = cgSummary?.limits ?? [];
  const alerts = cgSummary?.alerts ?? [];

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">O seu plano</h1>
          <p className="text-muted-foreground mt-1">
            Gestão do plano, limites e funcionalidades do Communication Center.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/dashboard/plans"><Crown className="w-4 h-4" /> Comparar planos</Link>
        </Button>
      </header>

      {/* Plano actual */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <CardTitle>{currentPlan?.name ?? "Sem plano atribuído"}</CardTitle>
              {currentPlan?.recommended && <Badge variant="default">Recomendado</Badge>}
              {currentPlan?.enterprise && <Badge variant="secondary">Enterprise</Badge>}
            </div>
            {currentPlan?.public_description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{currentPlan.public_description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {currentPlan?.enterprise
                ? "Sob consulta"
                : currentPlan?.monthly_price != null
                  ? `${currentPlan.monthly_price}€`
                  : "—"}
            </div>
            {!currentPlan?.enterprise && <div className="text-xs text-muted-foreground">por mês</div>}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-2">
          {currentPlan && !currentPlan.enterprise && (
            <SubscribeButton plan={currentPlan as any} sub={sub} />
          )}
          {sub?.stripe_subscription_id && <ManageSubscriptionButton />}
          {currentPlan && !currentPlan.enterprise && (
            <UpgradeDialog currentPlanId={currentPlan.id} plans={plans} />
          )}
          <EnterpriseDialog currentPlanId={currentPlan?.id} />
        </CardContent>
      </Card>

      {/* Uso vs limites */}
      <Card>
        <CardHeader>
          <CardTitle>Utilização deste mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {limits.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ainda sem limites sincronizados. Atribua um plano para activar o controlo de utilização.
            </p>
          )}
          {limits.map((l: any) => {
            const pct = l.included_quantity ? Math.min(100, (Number(l.current_usage ?? 0) / Number(l.included_quantity)) * 100) : 0;
            return (
              <div key={l.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{String(l.usage_type).replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">
                    {Number(l.current_usage ?? 0).toLocaleString("pt-PT")} / {l.included_quantity?.toLocaleString("pt-PT") ?? "∞"}
                  </span>
                </div>
                <Progress value={pct} className={pct >= 90 ? "[&>div]:bg-destructive" : pct >= 80 ? "[&>div]:bg-amber-500" : ""} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-base">Alertas activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 5).map((a: any) => (
              <div key={a.id} className="text-sm flex justify-between border rounded p-2">
                <span>{a.message ?? a.alert_type}</span>
                <Badge variant={a.severity === "critical" ? "destructive" : "secondary"}>{a.severity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Funcionalidades incluídas */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades incluídas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {planFeatures.filter((f) => f.included).map((f) => (
              <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{f.feature_name}</div>
                  {f.limit_value != null && (
                    <div className="text-xs text-muted-foreground">
                      Limite: {f.limit_value.toLocaleString("pt-PT")} {f.limit_unit ?? ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add-ons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add-ons activos</CardTitle>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/dashboard/plans#addons"><Plus className="w-4 h-4" /> Pedir add-on</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {addons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem add-ons activos.</p>
          ) : (
            <div className="space-y-2">
              {addons.map((a) => (
                <div key={a.id} className="flex justify-between items-center p-3 rounded-lg border">
                  <div>
                    <div className="font-medium text-sm">{a.addon?.name}</div>
                    <div className="text-xs text-muted-foreground">Quantidade: {a.quantity}</div>
                  </div>
                  <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pedidos */}
      {requests.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pedidos recentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {requests.slice(0, 5).map((r) => (
              <div key={r.id} className="flex justify-between items-center p-3 rounded-lg border text-sm">
                <span className="capitalize">{r.request_type.replace("_", " ")}</span>
                <Badge variant={r.status === "completed" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubscribeButton({ plan, sub }: { plan: BillingPlan; sub: any }) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const checkout = useStartCheckout();
  const isActive = sub?.status === "active" && sub?.billing_plan_id === plan.id;
  if (isActive) return null;
  return (
    <div className="flex items-center gap-2">
      <select
        className="border rounded-md p-2 text-sm bg-background"
        value={interval}
        onChange={(e) => setInterval(e.target.value as "month" | "year")}
      >
        <option value="month">Mensal</option>
        <option value="year">Anual</option>
      </select>
      <Button
        className="gap-2"
        disabled={checkout.isPending}
        onClick={() => checkout.mutate({ billing_plan_id: plan.id, interval })}
      >
        <CreditCard className="w-4 h-4" />
        {sub?.stripe_subscription_id ? "Mudar plano" : "Subscrever"}
      </Button>
    </div>
  );
}

function ManageSubscriptionButton() {
  const portal = useOpenCustomerPortal();
  return (
    <Button variant="outline" className="gap-2" disabled={portal.isPending} onClick={() => portal.mutate()}>
      <ExternalLink className="w-4 h-4" />
      Gerir subscrição
    </Button>
  );
}

function UpgradeDialog({ currentPlanId, plans }: { currentPlanId: string; plans: BillingPlan[] }) {
  const [open, setOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<string>("");
  const [notes, setNotes] = useState("");
  const create = useCreateChangeRequest();

  const upgradable = plans.filter((p) => !p.enterprise && p.id !== currentPlanId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><ArrowUpRight className="w-4 h-4" /> Pedir upgrade</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pedir alteração de plano</DialogTitle>
          <DialogDescription>A equipa vai validar o pedido e entrar em contacto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Plano pretendido</Label>
            <select className="w-full border rounded-md p-2 mt-1 bg-background" value={targetPlan} onChange={(e) => setTargetPlan(e.target.value)}>
              <option value="">Selecione…</option>
              {upgradable.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.monthly_price != null ? `— ${p.monthly_price}€/mês` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Notas (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Volume estimado, número de agentes…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={!targetPlan || create.isPending}
            onClick={async () => {
              await create.mutateAsync({
                requested_plan_id: targetPlan,
                current_plan_id: currentPlanId,
                request_type: "upgrade",
                notes,
              });
              setOpen(false);
              setNotes(""); setTargetPlan("");
            }}
          >Enviar pedido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnterpriseDialog({ currentPlanId }: { currentPlanId?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ agents: "", volume: "", phone: "", email: "", notes: "" });
  const create = useCreateChangeRequest();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Building2 className="w-4 h-4" /> Falar sobre Enterprise</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuração Enterprise</DialogTitle>
          <DialogDescription>Conte-nos sobre a sua operação para preparar uma proposta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nº de agentes</Label><Input value={form.agents} onChange={(e) => setForm({ ...form, agents: e.target.value })} /></div>
            <div><Label>Volume mensal estimado</Label><Input value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><Label>Notas (países, integrações, SLA…)</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={create.isPending}
            onClick={async () => {
              await create.mutateAsync({
                request_type: "enterprise_contact",
                current_plan_id: currentPlanId ?? null,
                notes: form.notes,
                contact_info: { ...form },
              });
              setOpen(false);
            }}
          >Enviar pedido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
