import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Brain, TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ConfidenceScoreProps {
  confidence: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConfidenceScore({ 
  confidence, 
  showLabel = true, 
  size = "md",
  className 
}: ConfidenceScoreProps) {
  const percent = Math.round(confidence * 100);
  
  const getLevel = () => {
    if (percent >= 90) return { label: "Muito Alta", color: "text-emerald-600", bgColor: "bg-emerald-500" };
    if (percent >= 80) return { label: "Alta", color: "text-green-600", bgColor: "bg-green-500" };
    if (percent >= 60) return { label: "Média", color: "text-amber-600", bgColor: "bg-amber-500" };
    if (percent >= 40) return { label: "Baixa", color: "text-orange-600", bgColor: "bg-orange-500" };
    return { label: "Muito Baixa", color: "text-red-600", bgColor: "bg-red-500" };
  };
  
  const level = getLevel();
  const sizes = {
    sm: { bars: "w-1 h-2", text: "text-xs", gap: "gap-0.5" },
    md: { bars: "w-1.5 h-3", text: "text-sm", gap: "gap-0.5" },
    lg: { bars: "w-2 h-4", text: "text-base", gap: "gap-1" },
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center gap-2", className)}>
            <div className={cn("flex", sizes[size].gap)}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    sizes[size].bars,
                    "rounded-sm transition-colors",
                    percent >= i * 20 ? level.bgColor : "bg-muted"
                  )}
                />
              ))}
            </div>
            {showLabel && (
              <span className={cn(sizes[size].text, "font-medium", level.color)}>
                {percent}%
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Confiança {level.label} ({percent}%)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface SuggestionExplanationProps {
  explanation: string;
  sourceContext?: Record<string, unknown> | null;
  className?: string;
}

export function SuggestionExplanation({ 
  explanation, 
  sourceContext,
  className 
}: SuggestionExplanationProps) {
  const hasContext = sourceContext && Object.keys(sourceContext).length > 0;
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start gap-2">
        <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">{explanation}</p>
      </div>
      
      {hasContext && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                <Info className="h-3 w-3" />
                <span>Ver contexto de análise</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-xs space-y-1">
                {Boolean(sourceContext?.hasConversations) && (
                  <p>• Baseado em conversas anteriores</p>
                )}
                {sourceContext?.customFieldsAnalyzed !== undefined && (
                  <p>• {String(sourceContext.customFieldsAnalyzed)} campos personalizados analisados</p>
                )}
                {sourceContext?.patternFrequency !== undefined && (
                  <p>• Padrão observado {String(sourceContext.patternFrequency)}x</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

interface AISuggestionIndicatorProps {
  isAIGenerated: boolean;
  confidence?: number;
  className?: string;
}

export function AISuggestionIndicator({ 
  isAIGenerated, 
  confidence,
  className 
}: AISuggestionIndicatorProps) {
  if (!isAIGenerated) return null;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1 bg-primary/5 border-primary/20 text-primary",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      Sugerido por IA
      {confidence !== undefined && (
        <span className="ml-1 text-muted-foreground">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </Badge>
  );
}

interface AIInsightCardProps {
  title: string;
  description: string;
  confidence: number;
  explanation: string;
  type: "field" | "automation" | "insight";
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function AIInsightCard({
  title,
  description,
  confidence,
  explanation,
  type,
  onAction,
  actionLabel,
  className,
}: AIInsightCardProps) {
  const typeConfig = {
    field: {
      icon: Sparkles,
      gradient: "from-primary/10 via-purple-500/5 to-transparent",
    },
    automation: {
      icon: TrendingUp,
      gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    },
    insight: {
      icon: Brain,
      gradient: "from-blue-500/10 via-cyan-500/5 to-transparent",
    },
  };
  
  const config = typeConfig[type];
  const Icon = config.icon;
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className={cn("bg-gradient-to-r p-4 border-b", config.gradient)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-background/80 shadow-sm">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          <ConfidenceScore confidence={confidence} size="sm" />
        </div>
      </div>
      <CardContent className="p-4">
        <SuggestionExplanation explanation={explanation} />
      </CardContent>
    </Card>
  );
}
