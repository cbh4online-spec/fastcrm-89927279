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
      const [rows, leadIds] = await Promise.all([
        (async () => {
          const all: QueueRowLite[] = [];
          for (let from = 0; ; from += 500) {
            const { data, error } = await supabase.from("prospecting_outreach_queue")
              .select("profile_id, step_index, status, updated_at")
              .eq("workspace_id", wsId!)
              .order("created_at", { ascending: false }).range(from, from + 499);
            if (error) throw error;
            all.push(...((data ?? []) as QueueRowLite[]));
            if ((data ?? []).length < 500) return all;
          }
        })(),
        (async () => {
          const all: string[] = [];
          for (let from = 0; ; from += 500) {
            const { data, error } = await supabase.from("professional_prospecting_profiles")
              .select("converted_lead_id")
              .eq("workspace_id", wsId!)
              .not("converted_lead_id", "is", null)
              .order("id", { ascending: true }).range(from, from + 499);
            if (error) throw error;
            all.push(...(data ?? []).map((profile) => profile.converted_lead_id!).filter(Boolean));
            if ((data ?? []).length < 500) return [...new Set(all)];
          }
        })(),
      ]);
      const opportunityLeadIds = new Set<string>();
      for (let from = 0; from < leadIds.length; from += 200) {
        for (let offset = 0; ; offset += 500) {
          const { data: opps, error } = await supabase.from("opportunities")
            .select("id, lead_id")
            .eq("workspace_id", wsId!)
            .in("lead_id", leadIds.slice(from, from + 200))
            .order("id", { ascending: true }).range(offset, offset + 499);
          if (error) throw error;
          for (const opportunity of opps ?? []) if (opportunity.lead_id) opportunityLeadIds.add(opportunity.lead_id);
          if ((opps ?? []).length < 500) break;
        }
      }
      return { ...computeEffectiveness(rows), converted: opportunityLeadIds.size, leads: leadIds.length };
    },
  });

  const kpis = data
    ? [
        { label: "Abordagens", value: `${data.approachesToday} hoje`, hint: `${data.approaches7d} nos últimos 7 dias` },
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
