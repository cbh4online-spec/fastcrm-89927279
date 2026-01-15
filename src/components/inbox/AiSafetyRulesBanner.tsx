import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ShieldCheck,
  ShieldAlert,
  Bot,
  MessageSquareOff,
  Database,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Eye,
  FileText,
  Tag,
  Lightbulb,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiSafetyStatus } from "@/hooks/useAiSafetyRules";
import { AI_CAPABILITY_LABELS } from "@/lib/aiSafetyRules";

interface AiSafetyRulesBannerProps {
  conversationId?: string;
  compact?: boolean;
  className?: string;
}

export function AiSafetyRulesBanner({
  conversationId,
  compact = false,
  className,
}: AiSafetyRulesBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const safetyStatus = useAiSafetyStatus(conversationId);

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border text-xs",
          className
        )}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
        <span className="text-muted-foreground">
          Regras de segurança da IA ativas
        </span>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-500/10 text-green-600 border-green-500/20">
          Protegido
        </Badge>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border bg-gradient-to-r from-background to-muted/30",
          className
        )}
      >
        {/* Header */}
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between px-4 py-3 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <ShieldCheck className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Regras de Segurança da IA</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1.5 bg-green-500/10 text-green-600 border-green-500/20"
                  >
                    Ativas
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  A IA opera sob regras estritas de segurança
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Prohibited Actions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                <XCircle className="w-3.5 h-3.5" />
                <span>A IA NUNCA pode:</span>
              </div>
              <div className="grid gap-2 pl-5">
                <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/5 border border-red-500/10">
                  <MessageSquareOff className="w-4 h-4 text-red-500" />
                  <span className="text-xs">
                    {AI_CAPABILITY_LABELS.prohibited.autoSend}
                  </span>
                  {safetyStatus.autoSendBlocked && (
                    <Badge
                      variant="outline"
                      className="ml-auto text-[9px] h-4 px-1 text-red-500 border-red-500/30"
                    >
                      Bloqueado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/5 border border-red-500/10">
                  <Database className="w-4 h-4 text-red-500" />
                  <span className="text-xs">
                    {AI_CAPABILITY_LABELS.prohibited.autoModify}
                  </span>
                  {safetyStatus.autoCrmModificationBlocked && (
                    <Badge
                      variant="outline"
                      className="ml-auto text-[9px] h-4 px-1 text-red-500 border-red-500/30"
                    >
                      Bloqueado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/5 border border-red-500/10">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span className="text-xs">
                    {AI_CAPABILITY_LABELS.prohibited.invent}
                  </span>
                  {safetyStatus.hallucinationPrevented && (
                    <Badge
                      variant="outline"
                      className="ml-auto text-[9px] h-4 px-1 text-red-500 border-red-500/30"
                    >
                      Prevenido
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Allowed Actions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>A IA PODE:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pl-5">
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/5 border border-green-500/10">
                  <Eye className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs">{AI_CAPABILITY_LABELS.allowed.read}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/5 border border-green-500/10">
                  <FileText className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs">{AI_CAPABILITY_LABELS.allowed.summarize}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/5 border border-green-500/10">
                  <Tag className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs">{AI_CAPABILITY_LABELS.allowed.classify}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/5 border border-green-500/10">
                  <Lightbulb className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs">{AI_CAPABILITY_LABELS.allowed.suggest}</span>
                </div>
              </div>
            </div>

            {/* Pending Confirmations */}
            {safetyStatus.pendingConfirmations > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                <Info className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  {safetyStatus.pendingConfirmations} ação(ões) pendente(s) de confirmação
                </span>
              </div>
            )}

            {/* Footer info */}
            <div className="flex items-start gap-2 pt-2 border-t">
              <Bot className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Todas as sugestões da IA são apenas recomendações. O utilizador mantém 
                controlo total e deve aprovar qualquer ação antes da sua execução.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
