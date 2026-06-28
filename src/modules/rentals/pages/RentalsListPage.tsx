import { Link, useNavigate } from "react-router-dom";
import { Plus, Wrench, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IXCard } from "@/components/entity/ix/IXCard";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { useRentalContracts } from "../hooks/useRentalContracts";
import { ContractStatusBadge } from "../components/EquipmentStatusBadge";

export default function RentalsListPage() {
  const navigate = useNavigate();
  const { data: contracts = [], isLoading } = useRentalContracts();

  return (
    <CapabilityGuard need="rentals.view">
      <div className="space-y-6 px-4 sm:px-8 py-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Contratos de Renting</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Equipamentos financiados por terceiros (ex: Liquid).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => navigate("/dashboard/rentals/new")}
              className="h-10 gap-2 rounded-full px-5 font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo contrato</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-border bg-card"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/dashboard/rentals/equipment")}>
                  <Wrench className="h-4 w-4 mr-2" /> Parque instalado
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <IXCard contentClassName="p-0">
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    A carregar…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Sem contratos.
                    <Link to="/dashboard/rentals/new" className="text-primary underline ml-1">
                      Criar o primeiro
                    </Link>
                  </TableCell>
                </TableRow>
              )}
              {contracts.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell>
                    <Link to={`/dashboard/rentals/${c.id}`} className="font-medium text-primary">
                      {c.contract_number}
                    </Link>
                  </TableCell>
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
        </IXCard>
      </div>
    </CapabilityGuard>
  );
}
