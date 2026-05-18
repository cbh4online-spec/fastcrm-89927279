import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { HandCoins } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { formatEur, formatRelative } from "../lib/collectionsFormat";
import type { CollectionCaseRow } from "../types/collections";

interface Props {
  cases: CollectionCaseRow[];
  isLoading: boolean;
}

export function CollectionsTable({ cases, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <HandCoins className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Sem casos de cobrança ativos</p>
        <p className="text-sm text-muted-foreground">
          Os casos aparecem aqui automaticamente quando existirem faturas em atraso.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Devedor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Em dívida</TableHead>
            <TableHead className="text-right">Atraso</TableHead>
            <TableHead className="text-right">Faturas</TableHead>
            <TableHead>Última ação</TableHead>
            <TableHead>Próxima ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => navigate(`/dashboard/collections/${c.id}`)}
            >
              <TableCell>
                <div className="font-medium">{c.debtor_name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.debtor_type === "company" ? "Empresa" : "Contacto"}
                  {c.debtor_tax_id ? ` · NIF ${c.debtor_tax_id}` : ""}
                </div>
              </TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell className="text-right font-medium">{formatEur(c.total_due - c.total_paid)}</TableCell>
              <TableCell className="text-right">
                {c.days_overdue > 0 ? `${c.days_overdue} dias` : "—"}
              </TableCell>
              <TableCell className="text-right">{c.invoices_count}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatRelative(c.last_action_at)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatRelative(c.next_action_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
