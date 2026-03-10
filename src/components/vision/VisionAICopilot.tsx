import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, FileText, Target, Calendar, BarChart3, TrendingUp, Loader2, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface Props {
  visionId: string;
}

type ActionKey = "manifesto" | "sprint_plan" | "daily_focus" | "progress_summary" | "funnel_analysis";

const aiActions: { key: ActionKey; label: string; description: string; icon: any; credits: number }[] = [
  { key: "manifesto", label: "Gerar Manifesto", description: "Cria um manifesto personalizado com base nos teus objetivos", icon: FileText, credits: 5 },
  { key: "sprint_plan", label: "Planear Sprint", description: "Sugere tarefas e metas para o próximo sprint quinzenal", icon: Calendar, credits: 3 },
  { key: "daily_focus", label: "Sugerir Foco do Dia", description: "Analisa o sprint e sugere as prioridades de hoje", icon: Target, credits: 1 },
  { key: "progress_summary", label: "Resumir Progresso", description: "Gera um resumo executivo do progresso da visão", icon: TrendingUp, credits: 2 },
  { key: "funnel_analysis", label: "Analisar Funil", description: "Analisa o funil ligado à visão e sugere melhorias", icon: BarChart3, credits: 3 },
];

function renderResult(action: ActionKey, result: any) {
  if (!result) return null;
  if (result.raw) return <p className="text-sm text-foreground whitespace-pre-wrap">{result.raw}</p>;

  switch (action) {
    case "manifesto":
      return (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground">{result.title}</h3>
          <p className="text-sm text-muted-foreground italic">{result.purpose}</p>
          <div className="space-y-2">
            {result.principles?.map((p: any, i: number) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-primary font-bold">{p.number}.</span>
                <span className="text-foreground">{p.text}</span>
              </div>
            ))}
          </div>
          <p className="text-sm font-medium text-primary mt-2">"{result.commitment}"</p>
        </div>
      );

    case "sprint_plan":
      return (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground">{result.title}</h3>
          <p className="text-sm text-muted-foreground">{result.goal}</p>
          <div className="space-y-1.5">
            {result.tasks?.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant={t.priority === "high" ? "destructive" : t.priority === "medium" ? "default" : "secondary"} className="text-[10px] px-1.5">
                  {t.priority}
                </Badge>
                <span className="text-foreground">{t.title}</span>
              </div>
            ))}
          </div>
          {result.success_metrics?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Métricas de sucesso:</p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                {result.success_metrics.map((m: string, i: number) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
        </div>
      );

    case "daily_focus":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            {result.priorities?.map((p: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Energia: {p.energy}</Badge>
                  <span className="text-sm font-medium text-foreground">{p.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.reason}</p>
              </div>
            ))}
          </div>
          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary">⚡ Quick Win: {result.quick_win}</p>
          </div>
          {result.deep_focus && (
            <div className="p-2 rounded-lg bg-accent/50">
              <p className="text-xs text-foreground">🎯 Foco profundo: {result.deep_focus.task} ({result.deep_focus.duration_minutes}min)</p>
            </div>
          )}
        </div>
      );

    case "progress_summary":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-primary">{result.completion_percent}%</div>
            <Badge variant={result.trend === "positive" ? "default" : result.trend === "negative" ? "destructive" : "secondary"}>
              {result.trend === "positive" ? "📈 Positivo" : result.trend === "negative" ? "📉 Negativo" : "➡️ Neutro"}
            </Badge>
          </div>
          {result.achievements?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">✅ Conquistas:</p>
              <ul className="list-disc list-inside text-xs text-foreground space-y-0.5">
                {result.achievements.map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          {result.attention_areas?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">⚠️ Atenção:</p>
              <ul className="list-disc list-inside text-xs text-foreground space-y-0.5">
                {result.attention_areas.map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          {result.next_steps?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">🚀 Próximos passos:</p>
              <ul className="list-disc list-inside text-xs text-foreground space-y-0.5">
                {result.next_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      );

    case "funnel_analysis":
      return (
        <div className="space-y-3">
          <p className="text-sm text-foreground">{result.diagnosis}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-green-600 mb-1">Pontos fortes:</p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                {result.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-red-500 mb-1">Pontos fracos:</p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                {result.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
          {result.improvements?.length > 0 && (
            <div className="space-y-1.5 mt-1">
              <p className="text-xs font-semibold text-muted-foreground">Melhorias sugeridas:</p>
              {result.improvements.map((imp: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Badge variant={imp.priority === "high" ? "destructive" : "secondary"} className="text-[10px] px-1.5 shrink-0">{imp.priority}</Badge>
                  <span className="text-foreground">{imp.suggestion}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    default:
      return <pre className="text-xs text-muted-foreground overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
  }
}

export function VisionAICopilot({ visionId }: Props) {
  const { currentWorkspace } = useWorkspace();
  const [loadingAction, setLoadingAction] = useState<ActionKey | null>(null);
  const [results, setResults] = useState<Partial<Record<ActionKey, any>>>({});

  const executeAction = async (actionKey: ActionKey) => {
    if (!currentWorkspace?.id) return;
    setLoadingAction(actionKey);

    try {
      const { data, error } = await supabase.functions.invoke("vision-ai-copilot", {
        body: { action: actionKey, visionId, workspaceId: currentWorkspace.id },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResults((prev) => ({ ...prev, [actionKey]: data.result }));
      toast.success("Acção IA concluída!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao executar acção IA";
      toast.error(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  const clearResult = (actionKey: ActionKey) => {
    setResults((prev) => {
      const next = { ...prev };
      delete next[actionKey];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />IA Copilot
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Usa inteligência artificial para acelerar a tua visão. Cada ação consome créditos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiActions.map((action) => {
          const isLoading = loadingAction === action.key;
          const result = results[action.key];

          return (
            <Card key={action.key} className="border-border/50 hover:border-violet-500/30 transition-colors group">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors shrink-0">
                    <action.icon className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{action.label}</h3>
                      <Badge variant="outline" className="text-[10px]">{action.credits} créditos</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </div>

                {result ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />Resultado
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => clearResult(action.key)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <ScrollArea className="max-h-64">
                      {renderResult(action.key, result)}
                    </ScrollArea>
                    <Button
                      variant="outline" size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => executeAction(action.key)}
                      disabled={isLoading}
                    >
                      <Sparkles className="h-3 w-3" />Regenerar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline" size="sm"
                    className="w-full mt-4 gap-2 text-xs"
                    onClick={() => executeAction(action.key)}
                    disabled={isLoading || loadingAction !== null}
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {isLoading ? "A processar..." : "Executar"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
