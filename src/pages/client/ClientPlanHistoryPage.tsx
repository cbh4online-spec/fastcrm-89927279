import { useParams, Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useSubscriptionPlans, RUN_STATUS_CONFIG } from "@/hooks/client-portal/useSubscriptionPlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function ClientPlanHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { plans, isLoading } = useSubscriptionPlans();
  const plan = plans.find((p) => p.id === id);
  const runs = (plan?.runs || []).sort((a, b) => new Date(b.run_at).getTime() - new Date(a.run_at).getTime());

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
        <Link to={`/client/plans/${id}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Plano
          </Button>
        </Link>

        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" /> Histórico — {plan?.name}
        </h1>

        {runs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">Sem execuções registadas</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => {
              const conf = RUN_STATUS_CONFIG[run.status] || RUN_STATUS_CONFIG.draft;
              return (
                <Card key={run.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{format(new Date(run.run_at), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
                      {run.notes && <p className="text-sm text-muted-foreground">{run.notes}</p>}
                      {run.order_id && <p className="text-xs text-muted-foreground">Encomenda: {run.order_id}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {run.amount && <span className="font-medium">{run.amount.toFixed(2)}€</span>}
                      <Badge variant="outline" className={conf.color}>{conf.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
