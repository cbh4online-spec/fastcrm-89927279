import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerLifecycleFlow } from "@/components/lifecycle/CustomerLifecycleFlow";
import { LifecycleKPIs } from "@/components/lifecycle/LifecycleKPIs";
import { LifecycleConversionTable } from "@/components/lifecycle/LifecycleConversionTable";
import { useLifecycleCounts, useLifecycleMetrics } from "@/hooks/useCustomerLifecycle";
import { Loader2, GitBranch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Info } from "lucide-react";

export default function CustomerLifecyclePage() {
  const { data, isLoading } = useLifecycleCounts();
  const { data: metrics } = useLifecycleMetrics();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { data: activeContracts } = useQuery({
    queryKey: ["lifecycle-active-contracts", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewal_contracts")
        .select("id, contact_id")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("status", "active");
      if (error) throw error;
      const rows = data || [];
      return { total: rows.length, withContact: new Set(rows.map((r) => r.contact_id).filter(Boolean)).size };
    },
  });

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
            <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground" role="note">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Fonte: fase registada em cada contacto. Contactos com estado de cliente «ativo» entram
                automaticamente em Onboarding e só passam a Cliente quando a fase é alterada.
                {activeContracts && activeContracts.total > 0 && (
                  <> Existem {activeContracts.total} {activeContracts.total === 1 ? "contrato ativo" : "contratos ativos"}
                  {" "}({activeContracts.withContact} com contacto ligado) — não são usados para mudar a fase automaticamente.</>
                )}
              </p>
            </div>
            <LifecycleKPIs data={data || []} metrics={metrics} />
            <CustomerLifecycleFlow data={data || []} metrics={metrics} />
            <LifecycleConversionTable data={data || []} metrics={metrics} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
