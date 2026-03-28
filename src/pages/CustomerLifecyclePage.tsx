import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerLifecycleFlow } from "@/components/lifecycle/CustomerLifecycleFlow";
import { LifecycleKPIs } from "@/components/lifecycle/LifecycleKPIs";
import { LifecycleConversionTable } from "@/components/lifecycle/LifecycleConversionTable";
import { useLifecycleCounts, useLifecycleMetrics } from "@/hooks/useCustomerLifecycle";
import { Loader2, GitBranch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function CustomerLifecyclePage() {
  const { data, isLoading } = useLifecycleCounts();
  const { data: metrics } = useLifecycleMetrics();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lifecycle-counts"] }),
      queryClient.invalidateQueries({ queryKey: ["lifecycle-metrics"] }),
    ]);
    setRefreshing(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitBranch className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ciclo de Vida do Cliente</h1>
              <p className="text-sm text-muted-foreground">
                Visualize o percurso dos seus contactos desde visitante até cliente
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <LifecycleKPIs data={data || []} metrics={metrics} />
            <CustomerLifecycleFlow data={data || []} metrics={metrics} />
            <LifecycleConversionTable data={data || []} metrics={metrics} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
