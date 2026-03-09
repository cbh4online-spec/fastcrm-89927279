import { CommandResult } from "@/hooks/useCommandOrchestrator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, BarChart3, Lightbulb, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface CommandResponseCardProps {
  result: CommandResult;
  intent: string;
}

const sectionIcons: Record<string, any> = {
  text: BarChart3,
  list: CheckCircle,
  metric: BarChart3,
  alert: AlertTriangle,
  action: Zap,
};

const intentLabels: Record<string, string> = {
  "prepare-meeting": "📅 Preparação de Reunião",
  "analyze-company": "🏢 Análise de Empresa",
  "analyze-deal": "📊 Análise de Deal",
  "win-deal": "🏆 Estratégia de Fecho",
  "send-followup": "✉️ Follow-up",
  "generate-proposal": "📝 Proposta",
  "pipeline-status": "🔄 Pipeline Status",
  "general": "💡 Resposta",
};

export function CommandResponseCard({ result, intent }: CommandResponseCardProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {intentLabels[intent] || intentLabels.general}
        </span>
        <Badge variant="outline" className={cn(
          "text-[10px]",
          result.confidence >= 80 ? "text-emerald-600 border-emerald-500/30" :
          result.confidence >= 50 ? "text-amber-600 border-amber-500/30" :
          "text-muted-foreground"
        )}>
          {result.confidence}% confiança
        </Badge>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Sections */}
      {result.sections.map((section, i) => {
        const Icon = sectionIcons[section.type] || Lightbulb;
        return (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Icon className={cn(
                  "h-4 w-4",
                  section.type === "alert" ? "text-amber-500" :
                  section.type === "action" ? "text-primary" :
                  "text-muted-foreground"
                )} />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-foreground prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
