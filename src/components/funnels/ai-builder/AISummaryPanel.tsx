import { useState } from "react";
import {
  Sparkles, Layers, FileText, Target, MousePointerClick,
  Globe, Zap, BarChart3, Lightbulb, Pencil, Check, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreditEstimateCard } from "../credits/CreditEstimateCard";
import { CreditActionButton } from "../credits/CreditActionButton";
import type { AIFunnelRecommendation } from "./AIFunnelBuilder";

interface Props {
  recommendation: AIFunnelRecommendation | null;
  onApply: () => void;
  onEdit: () => void;
}

export function AISummaryPanel({ recommendation, onApply, onEdit }: Props) {
  const [complexity, setComplexity] = useState<"essential" | "advanced">("essential");

  if (!recommendation) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur h-full">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Resumo da IA</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Descreve o teu funil no chat ou responde ao wizard e a IA gera aqui o resumo completo.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    { icon: Layers, label: "Vertical", value: recommendation.vertical },
    { icon: FileText, label: "Template", value: recommendation.pageTemplate },
    { icon: Target, label: "Captura", value: recommendation.captureType },
    { icon: MousePointerClick, label: "CTA Principal", value: recommendation.ctaPrimary },
    { icon: Globe, label: "Slug / Path", value: `/${recommendation.slug}` },
    { icon: Globe, label: "Domínio sugerido", value: recommendation.domain },
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Resumo da Recomendação
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="px-6 pb-6 space-y-4">
            {/* Credit Estimate */}
            <CreditEstimateCard complexity={complexity} />

            {/* Complexity toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={complexity === "essential" ? "default" : "outline"}
                className="flex-1 text-xs"
                onClick={() => setComplexity("essential")}
              >
                Essential
              </Button>
              <Button
                size="sm"
                variant={complexity === "advanced" ? "default" : "outline"}
                className="flex-1 text-xs"
                onClick={() => setComplexity("advanced")}
              >
                Advanced
              </Button>
            </div>

            <Separator />

            {/* Key fields */}
            {sections.map((s) => (
              <div key={s.label} className="flex items-start gap-3">
                <s.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-medium">{s.value}</p>
                </div>
              </div>
            ))}

            <Separator />

            {/* Funnel steps */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Estrutura do Funil ({recommendation.funnelSteps.length} steps)
              </p>
              <div className="space-y-1.5">
                {recommendation.funnelSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px] w-5 h-5 p-0 flex items-center justify-center shrink-0">
                      {i + 1}
                    </Badge>
                    <span>{step.name}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">{step.type}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Automations */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Automações ({recommendation.automations.length})
              </p>
              <div className="space-y-1">
                {recommendation.automations.map((auto, i) => (
                  <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                    <span>{auto.action}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* KPIs */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                KPIs a acompanhar
              </p>
              <div className="flex flex-wrap gap-1">
                {recommendation.kpis.map((kpi) => (
                  <Badge key={kpi} variant="outline" className="text-[10px]">{kpi}</Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Reasoning */}
            <div className="bg-primary/5 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Raciocínio da IA
              </p>
              <p className="text-xs leading-relaxed">{recommendation.reasoning}</p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <CreditActionButton
                actionKey={complexity === "essential" ? "ai_funnel_essential" : "ai_funnel_advanced"}
                label={`Gerar Funil ${complexity === "essential" ? "Essential" : "Advanced"}`}
                icon={<Sparkles className="h-4 w-4" />}
                onExecute={onApply}
                className="w-full"
                description={`Gerar funil ${complexity} com IA a partir da recomendação.`}
              />
              <Button variant="outline" className="w-full gap-2" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Editar Antes de Criar
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
