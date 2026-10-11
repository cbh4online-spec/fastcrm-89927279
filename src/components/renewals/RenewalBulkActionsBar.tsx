import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

export async function syncStripeRenewals(workspaceId: string, contractIds?: string[]) {
  const { data, error } = await supabase.functions.invoke("sync-stripe-renewals", {
    body: { workspace_id: workspaceId, ...(contractIds?.length ? { contract_ids: contractIds } : {}) },
  });
  if (error) {
    let msg = error.message;
    try { const b = await (error as any).context?.json?.(); if (b?.error) msg = typeof b.error === "string" ? b.error : JSON.stringify(b.error); } catch { /* corpo ilegível */ }
    throw new Error(msg);
  }
  if (!data?.success) throw new Error(data?.error || "Falha na sincronização");
  return data as { synced: number; failed: number; auto_linked: number; not_linked?: { reason: string }[]; results: any[] };
}

const NOT_LINKED_LABEL: Record<string, string> = {
  sem_email: "sem email",
  sem_cliente_stripe: "sem cliente no Stripe",
  varias_subscricoes: "várias subscrições possíveis",
  sem_subscricao_ativa: "sem subscrição ativa",
};

export function summarizeSync(d: { synced: number; failed: number; auto_linked: number; not_linked?: { reason: string }[]; results: any[] }) {
  const payments = d.results.reduce((s, r) => s + (r.payments_added || 0), 0);
  const invoices = d.results.reduce((s, r) => s + (r.invoices_added || 0), 0);
  return `${d.synced} sincronizados · ${d.auto_linked} ligados ao Stripe · ${payments} movimentos e ${invoices} faturas novas${d.failed ? ` · ${d.failed} com erro` : ""}${notLinkedText(d.not_linked)}`;
}

function notLinkedText(list?: { reason: string }[]) {
  if (!list?.length) return "";
  const counts: Record<string, number> = {};
  for (const n of list) counts[n.reason] = (counts[n.reason] || 0) + 1;
  const parts = Object.entries(counts).map(([r, c]) => `${c} ${NOT_LINKED_LABEL[r] ?? r}`);
  return ` · ${list.length} por ligar (${parts.join(", ")})`;
}

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

export function RenewalBulkActionsBar({ selectedIds, onClear }: Props) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<null | "sync" | "status">(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;
  const n = selectedIds.length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["renewal-contracts"] });
    qc.invalidateQueries({ queryKey: ["renewal-contract"] });
  };

  const handleSync = async () => {
    if (!currentWorkspace?.id) return;
    setBusy("sync");
    try {
      const d = await syncStripeRenewals(currentWorkspace.id, selectedIds);
      toast.success("Sincronização concluída", { description: summarizeSync(d) });
      refresh();
    } catch (e: any) {
      toast.error("Não foi possível sincronizar", { description: e?.message });
    } finally {
      setBusy(null);
    }
  };

  const applyStatus = async () => {
    if (!currentWorkspace?.id || !pendingStatus) return;
    setBusy("status");
    try {
      const { error, count } = await supabase
        .from("renewal_contracts")
        .update({ status: pendingStatus as any }, { count: "exact" })
        .eq("workspace_id", currentWorkspace.id)
        .in("id", selectedIds);
      if (error) throw error;
      toast.success(`Estado atualizado em ${count ?? n} contratos`);
      refresh();
      onClear();
    } catch (e: any) {
      toast.error("Não foi possível alterar o estado", { description: e?.message });
    } finally {
      setBusy(null);
      setPendingStatus(null);
    }
  };

  const label = STATUS_OPTIONS.find((o) => o.value === pendingStatus)?.label;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm">
        <span className="text-sm font-semibold text-foreground">
          {n} {n === 1 ? "contrato selecionado" : "contratos selecionados"}
        </span>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          <X className="mr-1 h-3.5 w-3.5" /> Desmarcar
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={handleSync} disabled={!!busy}>
            {busy === "sync" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            Sincronizar Stripe
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-full" disabled={!!busy}>
                {busy === "status" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Alterar estado <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.value} onClick={() => setPendingStatus(o.value)}>
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={!!pendingStatus} onOpenChange={(o) => !o && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar estado de {n} contratos?</AlertDialogTitle>
            <AlertDialogDescription>
              Os contratos selecionados passam para "{label}". As subscrições no Stripe não são alteradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={applyStatus}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
