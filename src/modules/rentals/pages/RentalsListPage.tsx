import { Link } from "react-router-dom";
import { Plus, Landmark, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { useRentalContracts } from "../hooks/useRentalContracts";
import { ContractStatusBadge } from "../components/EquipmentStatusBadge";

export default function RentalsListPage() {
  const { data: contracts = [], isLoading } = useRentalContracts();

  return (
    <CapabilityGuard need="rentals.view">
      <div className="p-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700"><Landmark className="h-5 w-5" /></div>
            <div>
              <h1 className="text-2xl font-semibold">Contratos de Renting</h1>
              <p className="text-sm text-muted-foreground">Equipamentos financiados por terceiros (ex: Liquid).</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/dashboard/rentals/equipment"><Wrench className="h-4 w-4 mr-2" />Parque instalado</Link></Button>
            <Button asChild><Link to="/dashboard/rentals/new"><Plus className="h-4 w-4 mr-2" />Novo contrato</Link></Button>
          </div>
        </header>

        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Cliente final</TableHead>
                <TableHead>Financiadora</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-right">Renda mensal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">A carregar…</TableCell></TableRow>}
              {!isLoading && contracts.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Sem contratos. <Link to="/dashboard/rentals/new" className="text-primary underline ml-1">Criar o primeiro</Link></TableCell></TableRow>
              )}
              {contracts.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell><Link to={`/dashboard/rentals/${c.id}`} className="font-medium text-primary">{c.contract_number}</Link></TableCell>
                  <TableCell>{c.end_client?.name ?? "—"}</TableCell>
                  <TableCell>{c.financier?.name ?? "—"}</TableCell>
                  <TableCell>{c.start_date ?? "—"}</TableCell>
                  <TableCell>{c.end_date ?? "—"}</TableCell>
                  <TableCell className="text-right">{Number(c.monthly_amount).toFixed(2)} €</TableCell>
                  <TableCell className="text-right">{Number(c.total_financed).toFixed(2)} €</TableCell>
                  <TableCell><ContractStatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </CapabilityGuard>
  );
}
