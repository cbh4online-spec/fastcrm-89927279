import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Target, Calendar, BarChart3, TrendingUp } from "lucide-react";

interface Props {
  visionId: string;
}

const aiActions = [
  { key: "manifesto", label: "Gerar Manifesto", description: "Cria um manifesto personalizado com base nos teus objetivos", icon: FileText, credits: 5 },
  { key: "sprint_plan", label: "Planear Sprint", description: "Sugere tarefas e metas para o próximo sprint quinzenal", icon: Calendar, credits: 3 },
  { key: "daily_focus", label: "Sugerir Foco do Dia", description: "Analisa o sprint e sugere as prioridades de hoje", icon: Target, credits: 1 },
  { key: "progress_summary", label: "Resumir Progresso", description: "Gera um resumo executivo do progresso da visão", icon: TrendingUp, credits: 2 },
  { key: "funnel_analysis", label: "Analisar Funil", description: "Analisa o funil ligado à visão e sugere melhorias", icon: BarChart3, credits: 3 },
];

export function VisionAICopilot({ visionId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />IA Copilot
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Usa inteligência artificial para acelerar a tua visão. Cada ação consome créditos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiActions.map((action) => (
          <Card key={action.key} className="border-border/50 hover:border-violet-500/30 transition-colors group cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                  <action.icon className="h-5 w-5 text-violet-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{action.label}</h3>
                    <Badge variant="outline" className="text-[10px]">{action.credits} créditos</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4 gap-2 text-xs">
                <Sparkles className="h-3 w-3" />Executar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
