import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IXCard } from "@/components/entity/ix/IXCard";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEquipmentUnits } from "../hooks/useEquipmentUnits";
import { EquipmentStatusBadge } from "../components/EquipmentStatusBadge";
import { cn } from "@/lib/utils";
import type { EquipmentStatus } from "../types";

const STATUS_FILTERS: Array<{ key: EquipmentStatus | "all"; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "in_stock", label: "Em stock" },
  { key: "assigned", label: "Atribuídos" },
  { key: "returned", label: "Devolvidos" },
  { key: "broken", label: "Avariados" },
  { key: "retired", label: "Retirados" },
];

export default function EquipmentInventoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EquipmentStatus | "all">("all");
  const { data: units = [], isLoading } = useEquipmentUnits({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  const counts = useMemo(() => {
    const all = units.length;
    const byStatus: Record<string, number> = {};
    for (const u of units) byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;
    return { all, ...byStatus };
  }, [units]);

  const exportCsv = () => {
    const rows = [
      ["Nº série", "Produto", "SKU", "Cliente", "Contrato", "Estado", "Atribuído em", "Garantia até"],
      ...units.map((u) => [
        u.serial_number,
        u.product?.name ?? "",
        u.product?.sku ?? "",
        u.current_client?.name ?? "",
        u.current_contract?.contract_number ?? "",
        u.status,
        u.assigned_at ?? "",
        u.warranty_end_date ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parque-instalado-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <CapabilityGuard need="rentals.view">
        <div className="space-y-6 px-4 sm:px-8 py-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Parque instalado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Todos os equipamentos rastreados por nº de série.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={units.length === 0}
            className="h-10 gap-2 rounded-full px-5"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUS_FILTERS.map((f) => {
            const value = f.key === "all" ? counts.all : counts[f.key] ?? 0;
            const active = status === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={cn(
                  "rounded-2xl border bg-card p-4 text-left transition shadow-sm hover:border-primary/60",
                  active ? "border-primary ring-1 ring-primary" : "border-border",
                )}
              >
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nº de série…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 rounded-full bg-card"
          />
        </div>

        <IXCard contentClassName="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº série</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente atual</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Atribuído em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    A carregar…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && units.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Sem equipamentos para os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
              {units.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/40">
                  <TableCell>
                    <Link
                      to={`/dashboard/rentals/equipment/${u.id}`}
                      className="font-mono text-primary"
                    >
                      {u.serial_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{u.product?.name ?? "—"}</div>
                    {u.product?.sku && (
                      <div className="text-xs text-muted-foreground">{u.product.sku}</div>
                    )}
                  </TableCell>
                  <TableCell>{u.current_client?.name ?? "—"}</TableCell>
                  <TableCell>
                    {u.current_contract ? (
                      <Link
                        to={`/dashboard/rentals/${u.current_contract.id}`}
                        className="text-primary"
                      >
                        {u.current_contract.contract_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <EquipmentStatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.assigned_at ? new Date(u.assigned_at).toLocaleDateString("pt-PT") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </IXCard>
      </div>
    </CapabilityGuard>
  );
}
