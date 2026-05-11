import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2, Clock } from "lucide-react";
import { useBillingSyncRuns, useTriggerBillingSync } from "@/hooks/useBillingSync";
import type { BillingIntegration } from "@/hooks/useBillingIntegrations";
import { Link } from "react-router-dom";

interface Props {
  integration: BillingIntegration | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "running")
    return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> A correr</Badge>;
  if (status === "ok")
    return <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="h-3 w-3" /> OK</Badge>;
  return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Erro</Badge>;
}

function fmtDuration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
}

export function BillingSyncSheet({ integration, open, onOpenChange }: Props) {
  const { data: runs, isLoading } = useBillingSyncRuns(integration?.id);
  const trigger = useTriggerBillingSync();
  const [windowDays, setWindowDays] = useState(30);

  if (!integration) return null;

  const since = new Date(Date.now() - windowDays * 86400_000).toISOString().slice(0, 10);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Sincronização — {integration.account_name}</SheetTitle>
          <SheetDescription>
            Importa faturas e atualiza estados a partir do {integration.provider === "invoicexpress" ? "InvoiceXpress" : integration.provider}.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 flex flex-wrap items-center gap-2 border-b">
          <label className="text-xs text-muted-foreground">Janela:</label>
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={windowDays === d ? "default" : "outline"}
              onClick={() => setWindowDays(d)}
            >
              {d} dias
            </Button>
          ))}
          <Button
            className="ml-auto"
            onClick={() =>
              trigger.mutate({ integration_id: integration.id, since })
            }
            disabled={trigger.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${trigger.isPending ? "animate-spin" : ""}`} />
            Sincronizar agora
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/invoices">Ver faturas</Link>
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : !runs?.length ? (
              <div className="text-center text-sm text-muted-foreground py-12">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Sem sincronizações ainda. Clica em "Sincronizar agora".
              </div>
            ) : (
              runs.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 text-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-xs text-muted-foreground">
                        {r.trigger === "cron" ? "Automática" : "Manual"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.started_at).toLocaleString("pt-PT")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span><strong className="text-emerald-600">{r.imported_count}</strong> novas</span>
                    <span><strong className="text-blue-600">{r.updated_count}</strong> atualizadas</span>
                    <span><strong className="text-destructive">{r.failed_count}</strong> falhas</span>
                    <span className="text-muted-foreground">
                      duração {fmtDuration(r.started_at, r.finished_at)}
                    </span>
                  </div>
                  {r.error_message && (
                    <div className="text-xs text-destructive bg-destructive/5 rounded p-2 mt-1">
                      {r.error_message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
