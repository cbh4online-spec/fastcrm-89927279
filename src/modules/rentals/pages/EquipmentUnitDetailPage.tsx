import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { useEquipmentUnit, useEquipmentHistory } from "../hooks/useEquipmentUnits";
import { EquipmentStatusBadge } from "../components/EquipmentStatusBadge";

export default function EquipmentUnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: unit, isLoading } = useEquipmentUnit(id);
  const { data: history = [] } = useEquipmentHistory(id);

  if (isLoading) return <div className="p-6 text-muted-foreground">A carregar…</div>;
  if (!unit) return <div className="p-6">Equipamento não encontrado.</div>;

  return (
    <CapabilityGuard need="rentals.view">
      <div className="p-6 space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/rentals/equipment"><ArrowLeft className="h-4 w-4 mr-2" />Parque instalado</Link>
        </Button>

        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700"><Wrench className="h-5 w-5" /></div>
            <div>
              <h1 className="text-2xl font-semibold font-mono">{unit.serial_number}</h1>
              <p className="text-sm text-muted-foreground">{unit.product?.name ?? "—"} {unit.product?.sku ? `· ${unit.product.sku}` : ""}</p>
            </div>
          </div>
          <EquipmentStatusBadge status={unit.status} />
        </header>

        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Cliente atual</div>
            <div className="text-base font-medium">{unit.current_client?.name ?? "—"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Contrato</div>
            <div className="text-base font-medium">
              {unit.current_contract ? (
                <Link className="text-primary" to={`/dashboard/rentals/${unit.current_contract.id}`}>{unit.current_contract.contract_number}</Link>
              ) : "—"}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Atribuído em</div>
            <div className="text-base font-medium">{unit.assigned_at ? new Date(unit.assigned_at).toLocaleDateString("pt-PT") : "—"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Garantia até</div>
            <div className="text-base font-medium">{unit.warranty_end_date ?? "—"}</div>
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Histórico</h2>
          {history.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos registados.</p>}
          <div className="space-y-2">
            {history.map((e) => (
              <div key={e.id} className="text-sm border-l-2 border-amber-500 pl-3 py-1">
                <span className="font-medium">{e.event_type}</span>
                <span className="text-muted-foreground ml-2">{new Date(e.occurred_at).toLocaleString("pt-PT")}</span>
              </div>
            ))}
          </div>
        </Card>

        {unit.notes && (
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Notas</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{unit.notes}</p>
          </Card>
        )}
      </div>
    </CapabilityGuard>
  );
}
