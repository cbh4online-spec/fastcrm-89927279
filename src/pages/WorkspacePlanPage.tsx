import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, ArrowUpRight, Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { useWorkspaceCurrentPlan, useRequestUpgrade } from "@/hooks/usePlanManagement";

const USAGE_DEMO = [
  { key: "whatsapp_messages_monthly", label: "Mensagens WhatsApp", used: 4520 },
  { key: "ai_analyses_monthly", label: "Análises IA", used: 320 },
  { key: "voice_minutes_monthly", label: "Minutos de voz", used: 180 },
  { key: "storage_gb", label: "Armazenamento (GB)", used: 6 },
  { key: "users", label: "Utilizadores", used: 7 },
];

export default function WorkspacePlanPage() {
  const { data, isLoading } = useWorkspaceCurrentPlan();
  const requestUpgrade = useRequestUpgrade();

  if (isLoading) return <div className="container mx-auto p-6">A carregar...</div>;

  const sub: any = data?.subscription;
  const plan: any = sub?.billing_plans;
  const limits: Record<string, number> = plan?.limits ?? {};
  const features: any[] = plan?.billing_plan_features ?? [];

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Plano Atual</h1>
        <p className="text-muted-foreground mt-1">
          Veja o seu plano, utilização e funcionalidades incluídas.
        </p>
      </header>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/15">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{plan?.name ?? "Sem plano"}</CardTitle>
                <CardDescription>
                  {sub?.status ? <Badge variant="outline" className="mr-2">{sub.status}</Badge> : null}
                  {sub?.billing_interval ?? "—"}
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => requestUpgrade.mutate({ request_type: "plan_upgrade", reason: "Pedido pela página de plano" })}>
              <ArrowUpRight className="w-4 h-4 mr-2" /> Pedir upgrade
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilização</CardTitle>
          <CardDescription>Acompanhe o consumo do ciclo atual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {USAGE_DEMO.map((u) => {
            const limit = limits[u.key] ?? 0;
            const isUnlimited = limit === -1;
            const pct = isUnlimited ? 0 : limit > 0 ? Math.min(100, (u.used / limit) * 100) : 0;
            const danger = pct >= 90;
            const warn = pct >= 75;
            return (
              <div key={u.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{u.label}</span>
                  <span className="text-muted-foreground">
                    {u.used} / {isUnlimited ? "∞" : limit}
                  </span>
                </div>
                <Progress value={pct} className={danger ? "[&>div]:bg-destructive" : warn ? "[&>div]:bg-amber-500" : ""} />
                {danger && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Limite quase atingido — considere upgrade ou add-on.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> Funcionalidades incluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {features.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma feature configurada para este plano.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {features.filter((f) => f.included).map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {f.feature_name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Add-ons ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.addons ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Sem add-ons ativos. Pode reforçar o seu plano com pacotes extra.
              </div>
            ) : (
              <ul className="space-y-2">
                {(data?.addons ?? []).map((a: any) => (
                  <li key={a.id} className="flex justify-between text-sm">
                    <span>{a.billing_addons?.name}</span>
                    <Badge variant="secondary">{a.quantity}x</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de pedidos</CardTitle>
          <CardDescription>Os seus pedidos de upgrade e ativação de add-ons.</CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.requests ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem pedidos registados.</p>
          ) : (
            <ul className="divide-y">
              {data!.requests.map((r: any) => (
                <li key={r.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{r.request_type}</p>
                    <p className="text-xs text-muted-foreground">{r.reason ?? "—"}</p>
                  </div>
                  <Badge variant="outline">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
