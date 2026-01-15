import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiSuggestionBadgeProps {
  type?: "suggestion" | "draft" | "classification" | "summary";
  showTooltip?: boolean;
  className?: string;
}

const badgeConfig = {
  suggestion: {
    label: "Sugestão IA",
    description: "Esta é uma sugestão gerada pela IA. Requer aprovação.",
    icon: Sparkles,
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  draft: {
    label: "Rascunho IA",
    description: "Este rascunho foi gerado pela IA. Revise antes de enviar.",
    icon: Bot,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  classification: {
    label: "Classificação IA",
    description: "Classificação automática pela IA. Pode ser editada.",
    icon: Bot,
    className: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  summary: {
    label: "Resumo IA",
    description: "Resumo gerado pela IA com base na conversa.",
    icon: Bot,
    className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
};

export function AiSuggestionBadge({
  type = "suggestion",
  showTooltip = true,
  className,
}: AiSuggestionBadgeProps) {
  const config = badgeConfig[type];
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] h-5 px-1.5 font-normal",
        config.className,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-medium">{config.label}</p>
              <p className="text-muted-foreground mt-1">{config.description}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Microcopy component for auto-assigned elements
interface AiAutoAssignedMicrocopyProps {
  type: "tags" | "classification" | "summary" | "followup";
  className?: string;
}

export function AiAutoAssignedMicrocopy({
  type,
  className,
}: AiAutoAssignedMicrocopyProps) {
  const labels = {
    tags: "Tags atribuídas automaticamente",
    classification: "Classificação automática",
    summary: "Resumo gerado automaticamente",
    followup: "Follow-up sugerido automaticamente",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[11px] text-muted-foreground",
        className
      )}
    >
      <Bot className="w-3 h-3" />
      <span>{labels[type]}</span>
    </div>
  );
}
