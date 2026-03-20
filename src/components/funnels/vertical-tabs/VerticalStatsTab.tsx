import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVerticalTemplateStats } from "@/hooks/useVerticalFunnelManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart3, Eye, Target, Users, TrendingUp,
  Brain, Loader2, Lightbulb, AlertTriangle, DollarSign
} from "lucide-react";

interface Props {
  templateSlug: string;
}

interface AIInsight {
  score: number;
  bottleneck: string;
  suggestions: string[];
  revenue_forecast: string;
}

export function VerticalStatsTab({ templateSlug }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: stats = [], isLoading } = useVerticalTemplateStats(templateSlug, dateFrom || undefined, dateTo || undefined);

  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const totalViews = stats.reduce((s, r) => s + r.views, 0);
  const totalUnique = stats.reduce((s, r) => s + r.uniqueViews, 0);
  const totalSubmissions = stats.reduce((s, r) => s + r.submissions, 0);
  const conversionRate = totalViews > 0 ? ((totalSubmissions / totalViews) * 100).toFixed(1) : "0";

  const analyzeWithAI = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vertical-ai-insights", {
        body: {
          template_slug: templateSlug,
          stats: { totalViews, totalUnique, totalSubmissions, conversionRate, sections: stats },
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setAiInsights(data);
    } catch (e: any) {
      toast.error("Erro ao analisar: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          </div>
        </div>
        <Button onClick={analyzeWithAI} disabled={aiLoading} variant="outline" className="gap-2">
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {aiInsights ? "Reanalisar" : "Analisar com IA"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">Visitantes</span>
            </div>
            <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{totalUnique} únicos</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">Conversão</span>
            </div>
            <p className="text-2xl font-bold">{conversionRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Submissões</span>
            </div>
            <p className="text-2xl font-bold">{totalSubmissions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Bounce Rate</span>
            </div>
            <p className="text-2xl font-bold">
              {totalViews > 0 ? (((totalViews - totalSubmissions) / totalViews) * 100).toFixed(1) : "0"}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion funnel visual */}
      {totalViews > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Funil de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-4">
              {[
                { name: "Visitantes", value: totalViews },
                { name: "Únicos", value: totalUnique },
                { name: "Submissões", value: totalSubmissions },
              ].map((stage, i, arr) => {
                const maxValue = Math.max(arr[0].value, 1);
                const width = Math.max((stage.value / maxValue) * 100, 5);
                const prevValue = i > 0 ? arr[i - 1].value : stage.value;
                const rate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : "0";
                const colors = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
                return (
                  <div key={stage.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground">
                        {stage.value.toLocaleString()}
                        {i > 0 && <span className="ml-1 text-xs">({rate}%)</span>}
                      </span>
                    </div>
                    <div className="h-8 bg-muted/30 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{ width: `${width}%`, backgroundColor: colors[i] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Secção</TableHead>
              <TableHead>Page Views (All)</TableHead>
              <TableHead>Page Views (Unique)</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">A carregar...</TableCell>
              </TableRow>
            ) : stats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <BarChart3 className="h-10 w-10" />
                    <span className="font-medium">Sem dados de analytics</span>
                    <span className="text-xs">Os dados aparecem quando a página receber visitas</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              stats.map((s) => (
                <TableRow key={s.section}>
                  <TableCell className="font-medium capitalize">{s.section}</TableCell>
                  <TableCell>{s.views}</TableCell>
                  <TableCell>{s.uniqueViews}</TableCell>
                  <TableCell>{s.submissions}</TableCell>
                  <TableCell>{s.rate.toFixed(1)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* AI Insights */}
      {aiLoading && (
        <Card className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">A analisar dados com IA...</p>
        </Card>
      )}

      {aiInsights && !aiLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Análise IA</h3>
            <Badge variant="secondary" className="text-xs">Gemini</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Score de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className={`text-4xl font-bold ${getScoreColor(aiInsights.score)}`}>
                  {aiInsights.score}/100
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Previsão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{aiInsights.revenue_forecast}</p>
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
                <p className="text-muted-foreground">{aiInsights.bottleneck}</p>
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
                  {aiInsights.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}