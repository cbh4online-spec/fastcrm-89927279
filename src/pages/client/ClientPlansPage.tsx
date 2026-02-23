import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useSubscriptionPlans, CADENCE_LABELS, PLAN_STATUS_CONFIG } from "@/hooks/client-portal/useSubscriptionPlans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Plus, Loader2, TrendingUp, Package } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function ClientPlansPage() {
  const { plans, activePlans, isLoading, estimatedMRR } = useSubscriptionPlans();

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarClock className="h-6 w-6" /> Planos de Manutenção
            </h1>
            <p className="text-muted-foreground">Assinaturas recorrentes para os seus protocolos</p>
          </div>
          <Link to="/client/plans/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Criar Plano
            </Button>
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Planos Ativos</p>
              <p className="text-2xl font-bold">{activePlans.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Valor Mensal Estimado</p>
              <p className="text-2xl font-bold">{estimatedMRR.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Próximo Ciclo</p>
              <p className="text-2xl font-bold">
                {activePlans[0]?.next_run_at
                  ? format(new Date(activePlans[0].next_run_at), "dd MMM", { locale: pt })
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Plans List */}
        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ainda não tem planos de manutenção.</p>
              <Link to="/client/plans/new">
                <Button className="mt-4">Criar Primeiro Plano</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const statusConf = PLAN_STATUS_CONFIG[plan.status] || PLAN_STATUS_CONFIG.draft;
              return (
                <Link key={plan.id} to={`/client/plans/${plan.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {CADENCE_LABELS[plan.cadence] || plan.cadence} • {(plan.items || []).length} produtos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {plan.next_run_at && plan.status === "active" && (
                          <span className="text-sm text-muted-foreground">
                            Próximo: {format(new Date(plan.next_run_at), "dd/MM", { locale: pt })}
                          </span>
                        )}
                        <Badge className={`${statusConf.bgColor} ${statusConf.color}`}>{statusConf.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
