import { useState } from "react";
import { Brain, Loader2, TrendingUp, AlertTriangle, Lightbulb, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FunnelAIInsightsTabProps {
  funnelId: string;
}

interface AIInsight {
  score: number;
  bottleneck: string;
  suggestions: string[];
  revenue_forecast: string;
}

export function FunnelAIInsightsTab({ funnelId }: FunnelAIInsightsTabProps) {
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("funnel-ai-insights", {
        body: { funnel_id: funnelId },
      });
      if (error) throw error;
      setInsights(data);
    } catch (e: any) {
      toast.error("Erro ao gerar insights: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-destructive";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Funnel Insights</h3>
          <Badge variant="secondary" className="text-xs">Gemini</Badge>
        </div>
        <Button onClick={generateInsights} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
          {insights ? "Regenerar" : "Analisar Funil"}
        </Button>
      </div>

      {!insights && !loading && (
        <Card className="flex flex-col items-center justify-center py-16">
          <Brain className="h-12 w-12 text-muted-foreground mb-4" />
          <h4 className="font-semibold text-lg mb-2">Análise IA do Funil</h4>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            A IA analisa as estatísticas do teu funil e identifica gargalos, oportunidades
            e previsões de receita.
          </p>
          <Button onClick={generateInsights}>
            <Brain className="h-4 w-4 mr-2" />
            Analisar Funil
          </Button>
        </Card>
      )}

      {loading && (
        <Card className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">A analisar dados do funil...</p>
        </Card>
      )}

      {insights && !loading && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Score de Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className={`text-4xl font-bold ${getScoreColor(insights.score)}`}>
                {insights.score}/100
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Previsão de Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{insights.revenue_forecast}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Gargalo Identificado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{insights.bottleneck}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Sugestões de Melhoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
