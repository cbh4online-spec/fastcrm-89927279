import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  User, 
  Building2, 
  Users,
  Briefcase, 
  Stethoscope,
  MapPin,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  HelpCircle
} from "lucide-react";
import { Lead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIAnalysisSectionProps {
  lead: Lead;
}

const TYPE_CONFIG: Record<string, { icon: typeof User; label: string; color: string }> = {
  individual: { icon: User, label: "Profissional Individual", color: "text-blue-600" },
  clinic: { icon: Building2, label: "Clínica/Consultório", color: "text-emerald-600" },
  company: { icon: Users, label: "Empresa", color: "text-violet-600" },
  unknown: { icon: HelpCircle, label: "Não identificado", color: "text-muted-foreground" },
};

export function AIAnalysisSection({ lead }: AIAnalysisSectionProps) {
  // Verificar se há dados de análise IA para mostrar
  const hasData = lead.inferred_profession || 
                  lead.inferred_specialty || 
                  lead.lead_score !== null;

  if (!hasData) return null;

  const score = lead.lead_score || 0;
  const typeConfig = TYPE_CONFIG[lead.inferred_type || 'unknown'] || TYPE_CONFIG.unknown;
  const TypeIcon = typeConfig.icon;

  // Parse lead_score_factors se for uma string
  let factors: { positive?: string[]; negative?: string[] } = {};
  if (lead.lead_score_factors) {
    if (typeof lead.lead_score_factors === 'string') {
      try {
        factors = JSON.parse(lead.lead_score_factors);
      } catch {
        factors = {};
      }
    } else {
      factors = lead.lead_score_factors as { positive?: string[]; negative?: string[] };
    }
  }

  const positiveFactors = factors.positive || [];
  const negativeFactors = factors.negative || [];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    if (score >= 20) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excelente";
    if (score >= 60) return "Bom";
    if (score >= 40) return "Médio";
    if (score >= 20) return "Baixo";
    return "Muito Baixo";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    if (score >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-500" />
            Análise IA
          </div>
          {score > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("flex items-center gap-2 font-bold text-lg", getScoreColor(score))}>
                    <TrendingUp className="w-4 h-4" />
                    {score}/100
                    <Badge variant="secondary" className="text-xs ml-1">
                      {getScoreLabel(score)}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-sm">
                    Lead Score calculado com base em profissão, especialidade, atividade e sinais de contacto.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Progress Bar */}
        {score > 0 && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", getProgressColor(score))}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )}

        {/* Tipo e Profissão */}
        <div className="grid grid-cols-2 gap-3">
          {lead.inferred_type && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TypeIcon className={cn("w-4 h-4", typeConfig.color)} />
                Tipo
              </div>
              <p className="font-medium text-sm">{typeConfig.label}</p>
            </div>
          )}
          
          {lead.inferred_profession && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Briefcase className="w-4 h-4 text-blue-500" />
                Profissão
              </div>
              <p className="font-medium text-sm">{lead.inferred_profession}</p>
            </div>
          )}
        </div>

        {/* Especialidade e Local de Trabalho */}
        <div className="grid grid-cols-2 gap-3">
          {lead.inferred_specialty && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Stethoscope className="w-4 h-4 text-emerald-500" />
                Especialidade
              </div>
              <p className="font-medium text-sm">{lead.inferred_specialty}</p>
            </div>
          )}
          
          {lead.inferred_workplace && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Building2 className="w-4 h-4 text-amber-500" />
                Local de Trabalho
              </div>
              <p className="font-medium text-sm">{lead.inferred_workplace}</p>
            </div>
          )}
        </div>

        {/* Localização */}
        {lead.city && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="w-4 h-4 text-rose-500" />
              Localização
            </div>
            <p className="font-medium text-sm">{lead.city}</p>
          </div>
        )}

        {/* Confiança */}
        {lead.confidence_score && lead.confidence_score > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Confiança da análise:</span>
            <Badge variant="outline" className={cn(
              "text-xs",
              lead.confidence_score >= 80 ? "border-emerald-500/50 text-emerald-600" :
              lead.confidence_score >= 60 ? "border-green-500/50 text-green-600" :
              "border-yellow-500/50 text-yellow-600"
            )}>
              {lead.confidence_score}%
            </Badge>
          </div>
        )}

        {/* Fatores Positivos e Negativos */}
        {(positiveFactors.length > 0 || negativeFactors.length > 0) && (
          <div className="space-y-3 pt-2 border-t">
            {positiveFactors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Pontos positivos
                </p>
                <ul className="space-y-1">
                  {positiveFactors.slice(0, 3).map((factor, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground pl-4 relative">
                      <span className="absolute left-1 top-1 w-1 h-1 rounded-full bg-emerald-500" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {negativeFactors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  Pontos de atenção
                </p>
                <ul className="space-y-1">
                  {negativeFactors.slice(0, 3).map((factor, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground pl-4 relative">
                      <span className="absolute left-1 top-1 w-1 h-1 rounded-full bg-amber-500" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Explicação do Score */}
        {lead.lead_score_explanation && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Resumo:</span> {lead.lead_score_explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
