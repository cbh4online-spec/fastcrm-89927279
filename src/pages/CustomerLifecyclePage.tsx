import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerLifecycleFlow } from "@/components/lifecycle/CustomerLifecycleFlow";
import { LifecycleKPIs } from "@/components/lifecycle/LifecycleKPIs";
import { useLifecycleCounts } from "@/hooks/useCustomerLifecycle";
import { Loader2, GitBranch } from "lucide-react";

export default function CustomerLifecyclePage() {
  const { data, isLoading } = useLifecycleCounts();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ciclo de Vida do Cliente</h1>
            <p className="text-sm text-muted-foreground">
              Visualize o percurso dos seus contactos desde visitante até cliente
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <LifecycleKPIs data={data || []} />
            <CustomerLifecycleFlow data={data || []} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
