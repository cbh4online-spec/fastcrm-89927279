import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { computeEffectiveness, type QueueRowLite } from "@/lib/prospecting/effectiveness";

export function ProspectingEffectivenessCard() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["prospecting-effectiveness", wsId],
    enabled: !!wsId,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: rows, error }, { data: profs, error: pErr }] = await Promise.all([
        supabase
          .from("prospecting_outreach_queue")
          .select("profile_id, step_index, status, updated_at")
          .eq("workspace_id", wsId!)
          .limit(5000),
        supabase
          .from("professional_prospecting_profiles")
          .select("converted_lead_id")
          .eq("workspace_id", wsId!)
          .not("converted_lead_id", "is", null)
          .limit(2000),
      ]);
      if (error) throw error;
      if (pErr) throw pErr;
      const leadIds = (profs ?? []).map((p: any) => p.converted_lead_id as string);
      let converted = 0;
      if (leadIds.length) {
        const { data: opps, error: oErr } = await supabase
          .from("opportunities")
          .select("lead_id")
          .eq("workspace_id", wsId!)
          .in("lead_id", leadIds.slice(0, 500));
        if (oErr) throw oErr;
        converted = new Set((opps ?? []).map((o: any) => o.lead_id)).size;
      }
      return { ...computeEffectiveness((rows ?? []) as QueueRowLite[]), converted, leads: leadIds.length };
    },
  });

  const kpis = data
    ? [
        { label: "Abordagens", value: `${data.approachesToday} hoje`, hint: `${data.approaches7d} nos últimos 7 dias` },
        { label: "Taxa de resposta", value: data.responseRate === null ? "—" : `${data.responseRate}%`, hint: "dos perfis abordados" },
        { label: "Follow-ups", value: `${data.followUpsDone} feitos`, hint: `${data.followUpsPending} pendentes` },
        { label: "Oportunidades", value: String(data.converted), hint: `de ${data.leads} leads criadas` },
      ]
    : [];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-3 text-sm font-medium">Eficácia da prospeção</p>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="A carregar" />}
        {isError && <p className="text-sm text-destructive">Não foi possível carregar as métricas.</p>}
        {data && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-lg border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold tabular-nums">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.hint}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
