import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IXCard } from "@/components/entity/ix/IXCard";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEquipmentUnit, useEquipmentHistory } from "../hooks/useEquipmentUnits";
import { EquipmentStatusBadge } from "../components/EquipmentStatusBadge";

function KpiTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-medium text-foreground">{children}</div>
    </div>
  );
}

export default function EquipmentUnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: unit, isLoading } = useEquipmentUnit(id);
  const { data: history = [] } = useEquipmentHistory(id);

  if (isLoading) return <div className="p-6 text-muted-foreground">A carregar…</div>;
  if (!unit) return <div className="p-6">Equipamento não encontrado.</div>;

  return (
    <CapabilityGuard need="rentals.view">
      <div className="space-y-6 px-4 sm:px-8 py-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/rentals/equipment">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Parque instalado
          </Link>
        </Button>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">
              {unit.serial_number}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unit.product?.name ?? "—"}
              {unit.product?.sku ? ` · ${unit.product.sku}` : ""}
            </p>
          </div>
          <EquipmentStatusBadge status={unit.status} />
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile label="Cliente atual">{unit.current_client?.name ?? "—"}</KpiTile>
          <KpiTile label="Contrato">
            {unit.current_contract ? (
              <Link
                className="text-primary"
                to={`/dashboard/rentals/${unit.current_contract.id}`}
              >
                {unit.current_contract.contract_number}
              </Link>
            ) : (
              "—"
            )}
          </KpiTile>
          <KpiTile label="Atribuído em">
            {unit.assigned_at ? new Date(unit.assigned_at).toLocaleDateString("pt-PT") : "—"}
          </KpiTile>
          <KpiTile label="Garantia até">{unit.warranty_end_date ?? "—"}</KpiTile>
        </div>

        <IXCard title="Histórico">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos registados.</p>
          ) : (
            <div className="divide-y divide-border">
              {history.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-foreground">{e.event_type}</span>
                  <span className="text-muted-foreground">
                    {new Date(e.occurred_at).toLocaleString("pt-PT")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </IXCard>

        {unit.notes && (
          <IXCard title="Notas">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{unit.notes}</p>
          </IXCard>
        )}
      </div>
    </CapabilityGuard>
  );
}
