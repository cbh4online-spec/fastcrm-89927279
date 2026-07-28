import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PaymentsReport {
  created: number;
  duplicated: number;
  skipped: number;
  failed: number;
}

async function countItems(importId: string, action: string) {
  const { count, error } = await (supabase as any)
    .from("saft_import_items")
    .select("id", { count: "exact", head: true })
    .eq("import_id", importId)
    .eq("entity_type", "payment")
    .eq("action", action);
  if (error) throw error;
  return count ?? 0;
}

export function useSaftPaymentsReport(importId: string | undefined, isLive = false) {
  return useQuery({
    queryKey: ["saft-payments-report", importId],
    enabled: !!importId,
    refetchInterval: isLive ? 3000 : false,
    queryFn: async (): Promise<PaymentsReport> => {
      const [created, duplicated, skipped, failed] = await Promise.all([
        countItems(importId!, "created"),
        countItems(importId!, "skipped_duplicate"),
        countItems(importId!, "skipped"),
        countItems(importId!, "failed"),
      ]);
      return { created, duplicated, skipped, failed };
    },
  });
}

/**
 * Conferência dos recibos do SAF-T: quantos foram criados, ignorados por já
 * existirem, ignorados por não terem fatura associada e quantos falharam.
 */
export function SafTPaymentsReport({
  importId,
  isLive = false,
}: {
  importId: string;
  isLive?: boolean;
}) {
  const { data, isLoading, error } = useSaftPaymentsReport(importId, isLive);

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-sm text-destructive">
          Não foi possível carregar a conferência de recibos.
        </p>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </Card>
    );
  }

  const total = data.created + data.duplicated + data.skipped + data.failed;
  if (total === 0) return null;

  const cells = [
    { label: "Recibos criados", value: data.created },
    { label: "Já existentes", value: data.duplicated },
    { label: "Sem fatura associada", value: data.skipped },
    { label: "Com erro", value: data.failed },
  ];

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Conferência de recibos</h3>
        <p className="text-xs text-muted-foreground">
          Os recibos criados atualizam automaticamente o valor pago e o estado das faturas.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
