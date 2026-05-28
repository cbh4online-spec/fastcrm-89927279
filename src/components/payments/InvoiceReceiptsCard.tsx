import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Search } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

interface Row {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  saft_import_id: string | null;
  invoice_id: string;
  invoice_no: string | null;
  customer_name: string | null;
}

export function InvoiceReceiptsCard() {
  const { currentWorkspace } = useWorkspace();
  const workspaceClient = useWorkspaceInstance().workspaceClient as any;
  const [search, setSearch] = useState("");
  const [onlySaft, setOnlySaft] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["invoice-receipts", currentWorkspace?.id, onlySaft],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      let q = workspaceClient
        .from("invoice_payments")
        .select("id, amount, payment_date, payment_method, reference, saft_import_id, invoice_id, invoices:invoice_id(invoice_number, client_name)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("payment_date", { ascending: false })
        .limit(1000);
      if (onlySaft) q = q.not("saft_import_id", "is", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        amount: Number(r.amount) || 0,
        payment_date: r.payment_date,
        payment_method: r.payment_method,
        reference: r.reference,
        saft_import_id: r.saft_import_id,
        invoice_id: r.invoice_id,
        invoice_no: r.invoices?.invoice_number ?? null,
        customer_name: r.invoices?.customer_name ?? null,
      })) as Row[];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r.invoice_no ?? "").toLowerCase().includes(q) ||
      (r.customer_name ?? "").toLowerCase().includes(q) ||
      (r.reference ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const fmt = (v: number) => `€${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recibos de Faturas
          </CardTitle>
          <CardDescription>
            Pagamentos associados a faturas (inclui os importados via SAF-T). {filtered.length} registo(s) · Total {fmt(total)}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlySaft((v) => !v)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              onlySaft ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted"
            }`}
          >
            Apenas SAF-T
          </button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Fatura, cliente, referência…"
              className="h-9 w-64 pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filtered.length > 0 ? (
          <div className="max-h-[480px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fatura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {r.payment_date ? format(new Date(r.payment_date), "dd MMM yyyy", { locale: pt }) : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.invoice_no ?? r.invoice_id.slice(0, 8)}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{r.customer_name ?? "—"}</TableCell>
                    <TableCell>{r.payment_method ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.reference ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.amount)}</TableCell>
                    <TableCell>
                      {r.saft_import_id ? (
                        <Badge variant="secondary">SAF-T</Badge>
                      ) : (
                        <Badge variant="outline">Manual</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">Sem recibos</h3>
            <p className="text-muted-foreground mt-1">Os recibos importados ou registados aparecerão aqui.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
