import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plug,
  ExternalLink,
  ArrowLeft,
  Inbox,
  Clock,
} from "lucide-react";
import { useBillingIntegrations, type BillingIntegration } from "@/hooks/useBillingIntegrations";
import { useTriggerBillingSync } from "@/hooks/useBillingSync";
import {
  useWorkspaceBillingSyncRuns,
  useImportedInvoices,
} from "@/hooks/useBillingSyncWorkspace";

const PROVIDER_LABEL: Record<string, string> = {
  invoicexpress: "InvoiceXpress",
  moloni: "Moloni",
  vendus: "Vendus",
  sage: "Sage",
  primavera: "Primavera",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "running")
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> A correr
      </Badge>
    );
  if (status === "ok")
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" /> OK
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" /> Erro
    </Badge>
  );
}

function InvoiceStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">—</Badge>;
  if (status === "paid")
    return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Paga</Badge>;
  if (status === "overdue")
    return <Badge variant="destructive">Vencida</Badge>;
  if (status === "cancelled" || status === "canceled")
    return <Badge variant="outline">Cancelada</Badge>;
  if (status === "draft")
    return <Badge variant="outline">Rascunho</Badge>;
  if (status === "sent" || status === "open")
    return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Em aberto</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function fmtCurrency(v: number | null, ccy: string | null) {
  if (v == null) return "—";
  try {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: ccy || "EUR" }).format(v);
  } catch {
    return `${v.toFixed(2)} ${ccy || ""}`.trim();
  }
}

function fmtDuration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
}

export default function BillingSyncPage() {
  const { data: integrations, isLoading: loadingIntegrations } = useBillingIntegrations();
  const activeIntegrations = useMemo(
    () => (integrations || []).filter((i) => i.is_active),
    [integrations],
  );
  const defaultIntegration = useMemo(
    () => activeIntegrations.find((i) => i.is_default) || activeIntegrations[0] || null,
    [activeIntegrations],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(30);

  const targetIntegration: BillingIntegration | null =
    activeIntegrations.find((i) => i.id === selectedId) || defaultIntegration;

  const { data: runs, isLoading: loadingRuns } = useWorkspaceBillingSyncRuns(50);
  const { data: invoices, isLoading: loadingInvoices } = useImportedInvoices(100);
  const trigger = useTriggerBillingSync();

  const since = new Date(Date.now() - windowDays * 86400_000).toISOString().slice(0, 10);

  const integrationName = (id: string) => {
    const i = integrations?.find((x) => x.id === id);
    if (!i) return id.slice(0, 8);
    return `${PROVIDER_LABEL[i.provider] || i.provider} · ${i.account_name}`;
  };

  const handleSync = () => {
    if (!targetIntegration) return;
    trigger.mutate({ integration_id: targetIntegration.id, since });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/settings/billing-integrations">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Plug className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Sincronização de Faturação</h1>
              <p className="text-sm text-muted-foreground">
                Histórico de execuções e faturas importadas dos teus fornecedores.
              </p>
            </div>
          </div>
        </div>

        {/* Sync controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sincronizar agora</CardTitle>
            <CardDescription>
              Importa faturas e atualiza os respetivos estados a partir do fornecedor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingIntegrations ? (
              <Skeleton className="h-10 w-full max-w-md" />
            ) : !activeIntegrations.length ? (
              <div className="text-sm text-muted-foreground flex items-center justify-between gap-4 flex-wrap">
                <span>Não tens integrações ativas neste workspace.</span>
                <Button asChild size="sm">
                  <Link to="/settings/billing-integrations">
                    <Plug className="h-4 w-4 mr-2" /> Ligar fornecedor
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5 min-w-[240px]">
                  <label className="text-xs text-muted-foreground">Integração</label>
                  <Select
                    value={targetIntegration?.id}
                    onValueChange={(v) => setSelectedId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeIntegrations.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {PROVIDER_LABEL[i.provider] || i.provider} · {i.account_name}
                          {i.is_default ? " (predefinida)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Janela</label>
                  <div className="flex gap-1">
                    {[7, 30, 90].map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant={windowDays === d ? "default" : "outline"}
                        onClick={() => setWindowDays(d)}
                      >
                        {d}d
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSync}
                  disabled={trigger.isPending || !targetIntegration}
                  className="ml-auto"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${trigger.isPending ? "animate-spin" : ""}`}
                  />
                  Sincronizar agora
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync runs history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas sincronizações</CardTitle>
            <CardDescription>
              Histórico das execuções (manuais e automáticas) deste workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRuns ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !runs?.length ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-30" />
                Sem sincronizações ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Início</TableHead>
                    <TableHead>Integração</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Novas</TableHead>
                    <TableHead className="text-right">Atualizadas</TableHead>
                    <TableHead className="text-right">Falhas</TableHead>
                    <TableHead>Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {new Date(r.started_at).toLocaleString("pt-PT")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {integrationName(r.integration_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {r.trigger === "cron" ? "Automática" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                        {r.error_message && (
                          <div
                            className="text-xs text-destructive truncate max-w-[260px] mt-1"
                            title={r.error_message}
                          >
                            {r.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {r.imported_count}
                      </TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        {r.updated_count}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {r.failed_count}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDuration(r.started_at, r.finished_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Imported invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturas importadas</CardTitle>
            <CardDescription>
              Documentos sincronizados a partir do fornecedor de faturação.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingInvoices ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !invoices?.length ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-3 opacity-30" />
                Ainda não foram importadas faturas.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Sincronizada</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">
                        {inv.invoice_number || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{inv.client_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {PROVIDER_LABEL[inv.external_provider || ""] || inv.external_provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {fmtCurrency(inv.total, inv.currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {fmtCurrency(inv.amount_paid, inv.currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.issue_date
                          ? new Date(inv.issue_date).toLocaleDateString("pt-PT")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.external_synced_at
                          ? new Date(inv.external_synced_at).toLocaleString("pt-PT")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {inv.external_url && (
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <a href={inv.external_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
