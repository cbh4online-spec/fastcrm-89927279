import { normalizeSearchTerm } from "@/lib/search/normalize";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Search } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { InvoicePaymentActions, PAYMENT_METHODS } from "@/components/invoices/InvoicePaymentActions";

export interface ReceiptRow {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  saft_import_id: string | null;
  invoice_id: string;
  invoice_no: string | null;
  customer_name: string | null;
}

const PAGE = 1000;

/** Todos os recibos de faturas do espaço de trabalho (paginado; a API corta cada resposta em 1000). */
export function useInvoiceReceipts() {
  const { currentWorkspace } = useWorkspace();
  const workspaceClient = useWorkspaceInstance().workspaceClient as any;
  return useQuery({
    queryKey: ["invoice-receipts", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<ReceiptRow[]> => {
      const all: any[] = [];
      for (let from = 0; from < 100_000; from += PAGE) {
        const { data, error } = await workspaceClient
          .from("invoice_payments")
          .select("id, amount, payment_date, payment_method, reference, notes, saft_import_id, invoice_id, invoices:invoice_id(invoice_number, client_name)")
          .eq("workspace_id", currentWorkspace!.id)
          .order("payment_date", { ascending: false })
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      return all.map((r) => ({
        id: r.id,
        amount: Number(r.amount) || 0,
        payment_date: r.payment_date,
        payment_method: r.payment_method,
        reference: r.reference,
        notes: r.notes,
        saft_import_id: r.saft_import_id,
        invoice_id: r.invoice_id,
        invoice_no: r.invoices?.invoice_number ?? null,
        customer_name: r.invoices?.client_name ?? null,
      }));
    },
  });
}

const VISIBLE_STEP = 200;

export function InvoiceReceiptsCard() {
  const { data: rows = [], isLoading, isError } = useInvoiceReceipts();
  const [search, setSearch] = useState("");
  const [onlySaft, setOnlySaft] = useState(false);
  const [year, setYear] = useState<string>("all");
  const [visible, setVisible] = useState(VISIBLE_STEP);

  const years = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.payment_date || "").slice(0, 4)).filter(Boolean))).sort().reverse(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (onlySaft && !r.saft_import_id) return false;
      if (year !== "all" && !(r.payment_date || "").startsWith(year)) return false;
      if (!q) return true;
      return (
        (r.invoice_no ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizeSearchTerm(q)) ||
        (r.customer_name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizeSearchTerm(q)) ||
        (r.reference ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizeSearchTerm(q))
      );
    });
  }, [rows, search, onlySaft, year]);

  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const fmt = (v: number) => `€${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? "border-primary text-primary" : "border-input bg-background hover:bg-muted"}`;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recibos de Faturas
          </CardTitle>
          <CardDescription>
            {filtered.length.toLocaleString("pt-PT")} recibo(s) · Total {fmt(total)}. Use «…» para corrigir ou anular um recibo registado por engano.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setYear("all")} className={chip(year === "all")}>Todos os anos</button>
          {years.map((y) => (
            <button key={y} type="button" onClick={() => setYear(y)} className={chip(year === y)}>{y}</button>
          ))}
          <button type="button" onClick={() => setOnlySaft((v) => !v)} className={chip(onlySaft)}>Apenas SAF-T</button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisible(VISIBLE_STEP); }}
              placeholder="Fatura, cliente, referência…"
              aria-label="Pesquisar recibos"
              className="h-9 w-64 pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-destructive">Não foi possível carregar os recibos. Tente atualizar a página.</p>
        ) : filtered.length > 0 ? (
          <>
            <div className="max-h-[560px] overflow-auto">
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
                    <TableHead className="w-10"><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, visible).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {r.payment_date ? format(new Date(r.payment_date), "dd MMM yyyy", { locale: pt }) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.invoice_no ?? r.invoice_id.slice(0, 8)}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{r.customer_name ?? "—"}</TableCell>
                      <TableCell>{r.payment_method ? PAYMENT_METHODS[r.payment_method] ?? r.payment_method : "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.reference ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">{fmt(r.amount)}</TableCell>
                      <TableCell>
                        {r.saft_import_id ? <Badge variant="secondary">SAF-T</Badge> : <Badge variant="outline">Manual</Badge>}
                      </TableCell>
                      <TableCell>
                        <InvoicePaymentActions showOpenInvoice payment={{ ...r, invoice_label: r.invoice_no }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {visible < filtered.length && (
              <div className="mt-3 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + VISIBLE_STEP)}>
                  Mostrar mais ({(filtered.length - visible).toLocaleString("pt-PT")} restantes)
                </Button>
              </div>
            )}
          </>
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
