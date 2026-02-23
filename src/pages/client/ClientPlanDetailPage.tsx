import { useParams, Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useSubscriptionPlans, CADENCE_LABELS, PLAN_STATUS_CONFIG, RUN_STATUS_CONFIG } from "@/hooks/client-portal/useSubscriptionPlans";
import { usePlanActions } from "@/hooks/client-portal/usePlanActions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pause, Play, X, Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function ClientPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { plans, isLoading } = useSubscriptionPlans();
  const { pause, resume, cancel, activate, updating } = usePlanActions();

  const plan = plans.find((p) => p.id === id);

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  if (!plan) {
    return (
      <ClientLayout>
        <div className="text-center py-12 text-muted-foreground">Plano não encontrado</div>
      </ClientLayout>
    );
  }

  const statusConf = PLAN_STATUS_CONFIG[plan.status] || PLAN_STATUS_CONFIG.draft;
  const recentRuns = (plan.runs || []).sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime()).slice(0, 5);

  return (
    <ClientLayout>
      <div className="space-y-6">
        <Link to="/client/plans">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{plan.name}</h1>
            <p className="text-muted-foreground">
              {CADENCE_LABELS[plan.cadence]} • {plan.approval_mode === "auto" ? "Automático" : "Com aprovação"}
            </p>
          </div>
          <Badge className={`${statusConf.bgColor} ${statusConf.color} text-sm`}>{statusConf.label}</Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {plan.status === "draft" && (
            <Button onClick={() => activate(plan.id)} disabled={updating}>
              <Play className="h-4 w-4 mr-2" /> Ativar
            </Button>
          )}
          {plan.status === "active" && (
            <Button variant="outline" onClick={() => pause(plan.id)} disabled={updating}>
              <Pause className="h-4 w-4 mr-2" /> Pausar
            </Button>
          )}
          {plan.status === "paused" && (
            <Button onClick={() => resume(plan.id)} disabled={updating}>
              <Play className="h-4 w-4 mr-2" /> Retomar
            </Button>
          )}
          {plan.status !== "cancelled" && (
            <Button variant="destructive" onClick={() => cancel(plan.id)} disabled={updating}>
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
          )}
        </div>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos do Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(plan.items || []).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{item.product?.name || "Produto"}</p>
                  <p className="text-xs text-muted-foreground">{item.product?.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.qty} un.</p>
                  <p className="text-xs text-muted-foreground">
                    {(item.price_override ?? item.product?.base_price ?? 0).toFixed(2)}€/un
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Runs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Últimos Ciclos
            </CardTitle>
            <Link to={`/client/plans/${plan.id}/history`}>
              <Button variant="ghost" size="sm">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem ciclos executados</p>
            ) : (
              <div className="space-y-2">
                {recentRuns.map((run) => {
                  const runConf = RUN_STATUS_CONFIG[run.status] || RUN_STATUS_CONFIG.draft;
                  return (
                    <div key={run.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm">{format(new Date(run.run_at), "dd/MM/yyyy", { locale: pt })}</p>
                        {run.notes && <p className="text-xs text-muted-foreground">{run.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {run.amount && <span className="text-sm font-medium">{run.amount.toFixed(2)}€</span>}
                        <Badge variant="outline" className={runConf.color}>{runConf.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {plan.next_run_at && plan.status === "active" && (
          <p className="text-sm text-muted-foreground text-center">
            Próximo ciclo: {format(new Date(plan.next_run_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
          </p>
        )}
      </div>
    </ClientLayout>
  );
}
