import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Crown, Sparkles, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useSyncPlanToStripe } from "@/hooks/useBillingStripe";

export default function BillingPlansAdminPage() {
  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Planos e Faturação</h1>
        <p className="text-muted-foreground mt-1">Gestão de planos, subscrições e pedidos comerciais.</p>
      </header>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscrições</TabsTrigger>
          <TabsTrigger value="requests">Pedidos</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-4"><PlansTab /></TabsContent>
        <TabsContent value="subscriptions" className="mt-4"><SubscriptionsTab /></TabsContent>
        <TabsContent value="requests" className="mt-4"><RequestsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function PlansTab() {
  const { data: plans = [] } = useBillingPlans();
  const sync = useSyncPlanToStripe();
  const qc = useQueryClient();

  const handleSync = async (planId: string) => {
    await sync.mutateAsync(planId);
    qc.invalidateQueries({ queryKey: ["billing-plans"] });
  };

  return (
    <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {plans.map((p: any) => {
        const hasStripe = !!p.stripe_product_id;
        const hasMonthly = !!p.stripe_price_id_monthly;
        const hasAnnual = !!p.stripe_price_id_annual;
        const syncError = p.stripe_sync_error;

        return (
          <Card key={p.id} className={p.recommended ? "border-primary" : ""}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {p.enterprise && <Crown className="w-4 h-4 text-amber-500" />}
                  {p.name}
                  {p.recommended && <Badge><Sparkles className="w-3 h-3 mr-1" />Recomendado</Badge>}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{p.code}</p>
              </div>
              <EditPlanDialog plan={p} />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold">
                {p.enterprise ? "Sob consulta" : `${p.monthly_price ?? 0}€`}
                {!p.enterprise && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
              </div>
              {p.public_description && (
                <p className="text-sm text-muted-foreground">{p.public_description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Ativo" : "Inativo"}</Badge>
                <Badge variant="outline">{p.is_public ? "Público" : "Privado"}</Badge>
                {!p.enterprise && (
                  <Badge variant={hasStripe ? "default" : "outline"} className={hasStripe ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                    {hasStripe ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                    Stripe {p.stripe_mode ?? "test"}
                  </Badge>
                )}
              </div>

              {!p.enterprise && (
                <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mensal</span>
                    <span className={hasMonthly ? "text-emerald-600 font-mono" : "text-muted-foreground"}>
                      {hasMonthly ? p.stripe_price_id_monthly.slice(0, 18) + "…" : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Anual</span>
                    <span className={hasAnnual ? "text-emerald-600 font-mono" : "text-muted-foreground"}>
                      {hasAnnual ? p.stripe_price_id_annual.slice(0, 18) + "…" : "—"}
                    </span>
                  </div>
                  {p.stripe_synced_at && (
                    <div className="text-muted-foreground pt-1 border-t">
                      Sincronizado: {new Date(p.stripe_synced_at).toLocaleString("pt-PT")}
                    </div>
                  )}
                </div>
              )}

              {syncError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                  <strong>Erro:</strong> {syncError}
                </div>
              )}

              {!p.enterprise && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={sync.isPending}
                  onClick={() => handleSync(p.id)}
                >
                  <RefreshCw className={`w-4 h-4 ${sync.isPending ? "animate-spin" : ""}`} />
                  {hasStripe ? "Re-sincronizar com Stripe" : "Criar no Stripe"}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function EditPlanDialog({ plan }: { plan: any }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(plan);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("billing_plans" as any)
        .update({
          name: form.name,
          public_description: form.public_description,
          monthly_price: form.monthly_price,
          annual_price: form.annual_price,
          is_active: form.is_active,
          is_public: form.is_public,
          recommended: form.recommended,
        })
        .eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-plans"] });
      toast.success("Plano actualizado");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar plano: {plan.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label>Nome</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Descrição pública</Label><Textarea value={form.public_description ?? ""} onChange={(e) => setForm({ ...form, public_description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço mensal (€)</Label><Input type="number" value={form.monthly_price ?? ""} onChange={(e) => setForm({ ...form, monthly_price: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><Label>Preço anual (€)</Label><Input type="number" value={form.annual_price ?? ""} onChange={(e) => setForm({ ...form, annual_price: e.target.value ? Number(e.target.value) : null })} /></div>
          </div>
          <div className="flex items-center justify-between"><Label>Activo</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          <div className="flex items-center justify-between"><Label>Público</Label><Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} /></div>
          <div className="flex items-center justify-between"><Label>Recomendado</Label><Switch checked={form.recommended} onCheckedChange={(v) => setForm({ ...form, recommended: v })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionsTab() {
  const { data: plans = [] } = useBillingPlans();
  const { data: subs = [] } = useQuery({
    queryKey: ["admin-workspace-subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_subscriptions")
        .select("*, workspace:workspaces(id, name, slug)")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Subscrições por workspace</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 px-2">Workspace</th>
              <th className="py-2 px-2">Plano</th>
              <th className="py-2 px-2">Estado</th>
              <th className="py-2 px-2">Período</th>
              <th className="py-2 px-2">Acções</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s: any) => (
              <SubscriptionRow key={s.id} sub={s} plans={plans} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SubscriptionRow({ sub, plans }: { sub: any; plans: any[] }) {
  const [planId, setPlanId] = useState<string>(sub.billing_plan_id ?? "");
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("workspace_subscriptions")
        .update({ billing_plan_id: planId || null })
        .eq("id", sub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano aplicado e limites sincronizados");
      qc.invalidateQueries({ queryKey: ["admin-workspace-subs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <tr className="border-b">
      <td className="py-2 px-2">{sub.workspace?.name ?? sub.workspace_id.slice(0, 8)}</td>
      <td className="py-2 px-2">
        <select
          className="border rounded p-1 bg-background"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          <option value="">— sem plano —</option>
          {plans.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
      </td>
      <td className="py-2 px-2"><Badge variant={sub.status === "active" ? "default" : "secondary"}>{sub.status}</Badge></td>
      <td className="py-2 px-2 text-xs text-muted-foreground">
        {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-PT") : "—"}
      </td>
      <td className="py-2 px-2">
        <Button size="sm" disabled={update.isPending || planId === (sub.billing_plan_id ?? "")} onClick={() => update.mutate()}>
          Aplicar
        </Button>
      </td>
    </tr>
  );
}

function RequestsTab() {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-billing-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_change_requests" as any)
        .select("*, workspace:workspaces(id, name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("billing_change_requests" as any)
        .update({ status, completed_at: ["completed", "rejected", "cancelled"].includes(status) ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-billing-requests"] });
      toast.success("Pedido actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Pedidos comerciais</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {requests.length === 0 && <p className="text-sm text-muted-foreground">Sem pedidos.</p>}
        {requests.map((r: any) => (
          <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{r.workspace?.name ?? "—"}</span>
                <Badge variant="outline" className="capitalize">{r.request_type.replace("_", " ")}</Badge>
                <Badge variant={r.status === "completed" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
              </div>
              {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
              {r.contact_info && Object.keys(r.contact_info).length > 0 && (
                <pre className="text-[10px] text-muted-foreground mt-1 bg-muted/30 rounded p-1">{JSON.stringify(r.contact_info, null, 2)}</pre>
              )}
            </div>
            {r.status === "pending" && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "completed" })}>Completar</Button>
                <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}>Rejeitar</Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
