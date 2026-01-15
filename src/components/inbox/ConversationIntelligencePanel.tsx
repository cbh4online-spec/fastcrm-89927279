import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  Target,
  MessageSquare,
  Calendar,
  Copy,
  Check,
  Lightbulb,
  Flame,
  ThumbsDown,
  Timer,
  UserX,
} from "lucide-react";
import {
  useConversationIntelligence,
  ConversationIntelligence,
  LeadData,
  OpportunityData,
} from "@/hooks/useConversationIntelligence";
import { Message } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  messages: Message[];
  leadData?: LeadData;
  opportunityData?: OpportunityData;
  channel?: string;
  lastMessageAt?: string;
  onCreateOpportunity?: () => void;
  onScheduleFollowup?: () => void;
  onInsertReply?: (text: string) => void;
}

const intentLevelConfig = {
  high: { label: "Alta", color: "text-green-600 bg-green-100 dark:bg-green-900/30", icon: Flame },
  medium: { label: "Média", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30", icon: TrendingUp },
  low: { label: "Baixa", color: "text-muted-foreground bg-muted", icon: TrendingUp },
  none: { label: "Nenhuma", color: "text-muted-foreground bg-muted", icon: Target },
};

const urgencyConfig = {
  high: { label: "Alta", color: "text-red-600 bg-red-100 dark:bg-red-900/30" },
  medium: { label: "Média", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  low: { label: "Baixa", color: "text-muted-foreground bg-muted" },
};

const dropOffConfig = {
  high: { label: "Alto", color: "text-red-600 bg-red-100 dark:bg-red-900/30" },
  medium: { label: "Médio", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  low: { label: "Baixo", color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
};

export function ConversationIntelligencePanel({
  messages,
  leadData,
  opportunityData,
  channel,
  lastMessageAt,
  onCreateOpportunity,
  onScheduleFollowup,
  onInsertReply,
}: Props) {
  const { isLoading, intelligence, analyzeConversation } = useConversationIntelligence();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    intent: true,
    objections: false,
    nextStep: true,
  });
  const [copiedMicrocopy, setCopiedMicrocopy] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAnalyze = async () => {
    await analyzeConversation(messages, leadData, opportunityData, channel, lastMessageAt);
  };

  const handleCopyMicrocopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMicrocopy(true);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopiedMicrocopy(false), 2000);
  };

  const handleUseMicrocopy = (text: string) => {
    if (onInsertReply) {
      onInsertReply(text);
      toast.success("Mensagem inserida no campo de resposta");
    }
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-2 px-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Inteligência da Conversa
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1" />
              )}
              {intelligence ? "Reanalisar" : "Analisar"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-0 space-y-3">
          {!intelligence && !isLoading && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Clique em "Analisar" para obter insights</p>
              <p className="text-xs mt-1">
                Deteta intenção de compra, objeções e sugere próximos passos
              </p>
            </div>
          )}

          {intelligence && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3 pr-2">
                {/* Tags & Alerts */}
                {(intelligence.tags.length > 0 || intelligence.alerts.length > 0) && (
                  <div className="space-y-2">
                    {intelligence.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {intelligence.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {intelligence.alerts.map((alert, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">{alert}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Buying Intent */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "p-2 rounded-lg text-center cursor-help",
                          intentLevelConfig[intelligence.buyingIntent.level].color
                        )}
                      >
                        <Flame className="w-4 h-4 mx-auto mb-1" />
                        <p className="text-xs font-medium">Intenção</p>
                        <p className="text-xs">
                          {intentLevelConfig[intelligence.buyingIntent.level].label}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">
                        Confiança: {intelligence.buyingIntent.confidence}%
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Urgency */}
                  <div
                    className={cn(
                      "p-2 rounded-lg text-center",
                      urgencyConfig[intelligence.urgency.level].color
                    )}
                  >
                    <Timer className="w-4 h-4 mx-auto mb-1" />
                    <p className="text-xs font-medium">Urgência</p>
                    <p className="text-xs">{urgencyConfig[intelligence.urgency.level].label}</p>
                  </div>

                  {/* Objections */}
                  <div
                    className={cn(
                      "p-2 rounded-lg text-center",
                      intelligence.objections.detected
                        ? "text-red-600 bg-red-100 dark:bg-red-900/30"
                        : "text-green-600 bg-green-100 dark:bg-green-900/30"
                    )}
                  >
                    <ThumbsDown className="w-4 h-4 mx-auto mb-1" />
                    <p className="text-xs font-medium">Objeções</p>
                    <p className="text-xs">
                      {intelligence.objections.detected
                        ? intelligence.objections.list.length
                        : "Nenhuma"}
                    </p>
                  </div>

                  {/* Drop-off Risk */}
                  <div
                    className={cn(
                      "p-2 rounded-lg text-center",
                      dropOffConfig[intelligence.dropOffRisk.level].color
                    )}
                  >
                    <UserX className="w-4 h-4 mx-auto mb-1" />
                    <p className="text-xs font-medium">Risco</p>
                    <p className="text-xs">
                      {dropOffConfig[intelligence.dropOffRisk.level].label}
                    </p>
                  </div>
                </div>

                {/* Buying Intent Details */}
                <Collapsible
                  open={expandedSections.intent}
                  onOpenChange={() => toggleSection("intent")}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <span className="text-xs font-medium">Sinais de Compra</span>
                    {expandedSections.intent ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-1">
                    {intelligence.buyingIntent.signals.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-2">
                        Sem sinais claros de compra detetados
                      </p>
                    ) : (
                      intelligence.buyingIntent.signals.map((signal, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs pl-2"
                        >
                          <TrendingUp className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{signal}</span>
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Objections */}
                {intelligence.objections.detected && (
                  <Collapsible
                    open={expandedSections.objections}
                    onOpenChange={() => toggleSection("objections")}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                      <span className="text-xs font-medium text-red-700 dark:text-red-400">
                        Objeções Detetadas
                      </span>
                      {expandedSections.objections ? (
                        <ChevronDown className="w-4 h-4 text-red-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-red-600" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      {intelligence.objections.list.map((obj, i) => (
                        <div key={i} className="p-2 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium text-red-600">{obj}</p>
                          {intelligence.objections.suggestedResponses[i] && (
                            <p className="text-xs text-muted-foreground mt-1">
                              💡 {intelligence.objections.suggestedResponses[i]}
                            </p>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Suggested Next Step */}
                <Collapsible
                  open={expandedSections.nextStep}
                  onOpenChange={() => toggleSection("nextStep")}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                    <span className="text-xs font-medium text-primary">
                      Próximo Passo Sugerido
                    </span>
                    {expandedSections.nextStep ? (
                      <ChevronDown className="w-4 h-4 text-primary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-primary" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-2">
                    <div className="p-2 bg-muted/50 rounded-lg space-y-2">
                      <p className="text-xs font-medium">
                        {intelligence.suggestedNextStep.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {intelligence.suggestedNextStep.reason}
                      </p>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Sugestão de mensagem:
                        </p>
                        <div className="p-2 bg-background rounded border text-xs">
                          {intelligence.suggestedNextStep.microcopy}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() =>
                              handleCopyMicrocopy(intelligence.suggestedNextStep.microcopy)
                            }
                          >
                            {copiedMicrocopy ? (
                              <Check className="w-3 h-3 mr-1" />
                            ) : (
                              <Copy className="w-3 h-3 mr-1" />
                            )}
                            Copiar
                          </Button>
                          {onInsertReply && (
                            <Button
                              size="sm"
                              className="flex-1 h-7 text-xs"
                              onClick={() =>
                                handleUseMicrocopy(intelligence.suggestedNextStep.microcopy)
                              }
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Usar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Quick Actions */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Ações Rápidas
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {intelligence.buyingIntent.level === "high" && !opportunityData && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={onCreateOpportunity}
                      >
                        <Target className="w-3 h-3 mr-1" />
                        Criar Oportunidade
                      </Button>
                    )}
                    {intelligence.dropOffRisk.level !== "low" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={onScheduleFollowup}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Agendar Follow-up
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
