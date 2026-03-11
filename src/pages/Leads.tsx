import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SmartLeadsTable } from "@/components/leads/SmartLeadsTable";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function Leads() {
  console.log("[Leads] Page rendering");
  return (
    <DashboardLayout>
      <ErrorBoundary fallback={<div className="p-6 text-destructive">Erro ao carregar módulo de Leads. Verifique a consola.</div>}>
        <SmartLeadsTable />
      </ErrorBoundary>
    </DashboardLayout>
  );
}
