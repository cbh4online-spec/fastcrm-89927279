import { useState } from "react";
import { Link } from "react-router-dom";
import { Wrench, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { useEquipmentUnits } from "../hooks/useEquipmentUnits";
import { EquipmentStatusBadge } from "../components/EquipmentStatusBadge";
import type { EquipmentStatus } from "../types";

export default function EquipmentInventoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EquipmentStatus | "all">("all");
  const { data: units = [], isLoading } = useEquipmentUnits({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  return (
    <CapabilityGuard need="rentals.view">
      <div className="p-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700"><Wrench className="h-5 w-5" /></div>
          <div>
            <h1 className="text-2xl font-semibold">Parque instalado</h1>
            <p className="text-sm text-muted-foreground">Todos os equipamentos rastreados por nº de série.</p>
          </div>
        </header>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar por nº de série…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              <SelectItem value="in_stock">Em stock</SelectItem>
              <SelectItem value="assigned">Atribuído</SelectItem>
              <SelectItem value="returned">Devolvido</SelectItem>
              <SelectItem value="broken">Avariado</SelectItem>
              <SelectItem value="retired">Retirado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nº série</TableHead><TableHead>Produto</TableHead><TableHead>Cliente atual</TableHead>
              <TableHead>Contrato</TableHead><TableHead>Estado</TableHead><TableHead>Atribuído em</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar…</TableCell></TableRow>}
              {!isLoading && units.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Sem equipamentos.</TableCell></TableRow>}
              {units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell><Link to={`/dashboard/rentals/equipment/${u.id}`} className="font-mono text-primary">{u.serial_number}</Link></TableCell>
                  <TableCell>{u.product?.name ?? "—"}</TableCell>
                  <TableCell>{u.current_client?.name ?? "—"}</TableCell>
                  <TableCell>{u.current_contract ? <Link to={`/dashboard/rentals/${u.current_contract.id}`} className="text-primary">{u.current_contract.contract_number}</Link> : "—"}</TableCell>
                  <TableCell><EquipmentStatusBadge status={u.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.assigned_at ? new Date(u.assigned_at).toLocaleDateString("pt-PT") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </CapabilityGuard>
  );
}
