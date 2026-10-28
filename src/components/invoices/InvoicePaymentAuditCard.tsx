import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCapability } from "@/hooks/useCapability";
import { History } from "lucide-react";

const fmtEur = (v: unknown) =>
  v == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(v));

export function InvoicePaymentAuditCard({ invoiceId }: { invoiceId: string }) {
  const canManage = useCapability("finance.manage");
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice-payment-audit", invoiceId],
    enabled: canManage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_payment_audit")
        .select("id, action, actor_id, reason, old_data, new_data, created_at")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name || p.email || "—"]));
      }
      return (data ?? []).map((r) => ({ ...r, actor: r.actor_id ? names[r.actor_id] ?? "Utilizador" : "Sistema" }));
    },
  });

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Alterações a recibos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : error ? (
          <p className="text-sm text-destructive">Não foi possível carregar o registo.</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum recibo foi corrigido ou anulado.</p>
        ) : (
          <ul className="divide-y">
            {data.map((r) => {
              const before = (r.old_data as any)?.amount;
              const after = (r.new_data as any)?.amount;
              return (
                <li key={r.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.action === "DELETE" ? "destructive" : "secondary"}>
                      {r.action === "DELETE" ? "Anulado" : "Corrigido"}
                    </Badge>
                    <span className="font-medium">{r.actor}</span>
                    <span className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}
                    </span>
                    <span className="tabular-nums">
                      {fmtEur(before)}
                      {r.action === "UPDATE" ? ` → ${fmtEur(after)}` : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">Motivo: {r.reason || "—"}</p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
