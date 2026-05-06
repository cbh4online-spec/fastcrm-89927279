import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAgentCoachingInsights, useGenerateCoachingInsights, useCoachingTasks } from "@/hooks/useConversationQuality";
import { useAgentPerformance } from "@/hooks/useTeamPerformance";

export function CoachingDashboard() {
  const { data: agents = [] } = useAgentPerformance();
  const { data: insights = [] } = useAgentCoachingInsights();
  const { data: tasks = [] } = useCoachingTasks();
  const generate = useGenerateCoachingInsights();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const insightByAgent: Record<string, any> = {};
  insights.forEach((i) => {
    if (!insightByAgent[i.agent_id] || new Date(i.generated_at) > new Date(insightByAgent[i.agent_id].generated_at)) {
      insightByAgent[i.agent_id] = i;
    }
  });

  const selected = selectedAgent ? insightByAgent[selectedAgent] : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5" /> Coaching de Atendimento
        </h2>
        <p className="text-sm text-muted-foreground">
          Padrões recorrentes, recomendações de treino e exemplos para apoiar o crescimento da equipa.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Agentes com insights</div><div className="text-2xl font-bold">{Object.keys(insightByAgent).length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Tarefas abertas</div><div className="text-2xl font-bold">{tasks.filter((t) => t.status === "open").length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Tarefas concluídas</div><div className="text-2xl font-bold">{tasks.filter((t) => t.status === "completed").length}</div></Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Agentes</div>
        {agents.length === 0 && <div className="text-sm text-muted-foreground">Sem agentes na equipa.</div>}
        <div className="space-y-1.5">
          {(agents as any[]).map((a) => {
            const ins = insightByAgent[a.user_id];
            return (
              <div key={a.user_id} className="flex items-center justify-between border rounded p-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{a.display_name ?? a.user_id?.slice(0, 8)}</span>
                  {ins?.avg_quality_score != null && (
                    <Badge variant="outline">Score: {Math.round(ins.avg_quality_score)}</Badge>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedAgent(a.user_id)}>Ver</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={generate.isPending}
                    onClick={() => generate.mutate({ agentId: a.user_id })}
                  >
                    {generate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    <span className="ml-1">Gerar coaching</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {selected && (
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold">Coaching detalhado</div>
          <div className="text-xs text-muted-foreground">
            Período: {selected.period_start} → {selected.period_end} | {selected.conversations_analyzed} análises
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[["Qualidade", selected.avg_quality_score], ["Clareza", selected.avg_clarity_score], ["Empatia", selected.avg_empathy_score], ["Comercial", selected.avg_commercial_score], ["Resolução", selected.avg_resolution_score], ["Follow-up", selected.avg_followup_score]].map(([l, v]) => (
              <div key={l as string} className="border rounded p-2">
                <div className="text-[10px] text-muted-foreground">{l}</div>
                <div className="text-sm font-semibold">{v ?? "—"}</div>
                <Progress value={(v as number) ?? 0} className="h-1 mt-1" />
              </div>
            ))}
          </div>
          {selected.recurring_strengths?.length > 0 && (
            <div><div className="text-xs font-semibold mb-1">Pontos fortes recorrentes</div>{selected.recurring_strengths.map((s: any, i: number) => <div key={i} className="text-xs border-l-2 border-emerald-500 pl-2 py-1">{s.title}: {s.description}</div>)}</div>
          )}
          {selected.recurring_improvement_areas?.length > 0 && (
            <div><div className="text-xs font-semibold mb-1">Áreas de melhoria</div>{selected.recurring_improvement_areas.map((s: any, i: number) => <div key={i} className="text-xs border-l-2 border-amber-500 pl-2 py-1">{s.title}: {s.description}</div>)}</div>
          )}
          {selected.coaching_recommendations?.length > 0 && (
            <div><div className="text-xs font-semibold mb-1">Recomendações</div>{selected.coaching_recommendations.map((s: any, i: number) => <div key={i} className="text-xs border rounded p-1.5 my-1"><b>{s.title}</b> — {s.action}</div>)}</div>
          )}
          {selected.suggested_training_topics?.length > 0 && (
            <div className="flex flex-wrap gap-1">{selected.suggested_training_topics.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
          )}
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground italic text-center">
        Análise IA construtiva. Apoio à melhoria contínua, não avaliação isolada.
      </p>
    </div>
  );
}
