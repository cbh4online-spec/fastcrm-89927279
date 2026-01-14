import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  MessageCircleQuestion,
  HeadphonesIcon,
  ShoppingCart,
  Reply,
  AlertCircle,
  HelpCircle,
  ThumbsUp,
  Minus,
  ThumbsDown,
  Loader2,
  Check,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useClassifyConversation,
  useSaveClassification,
  useConfirmClassification,
  ConversationPriority,
  ConversationIntent,
  ConversationSentiment,
  Message,
} from "@/hooks/useConversationClassification";

interface ConversationClassificationProps {
  conversationId: string;
  leadId?: string | null;
  messages: Message[];
  leadName?: string;
  channel?: string;
  // Current saved values
  aiPriority?: ConversationPriority | null;
  aiIntent?: ConversationIntent | null;
  aiSentiment?: ConversationSentiment | null;
  userPriority?: ConversationPriority | null;
  userIntent?: ConversationIntent | null;
  classificationConfirmed?: boolean;
}

const priorityConfig: Record<ConversationPriority, { label: string; color: string; icon: typeof AlertTriangle }> = {
  high: { label: "Alta", color: "text-destructive bg-destructive/10 border-destructive/30", icon: AlertTriangle },
  medium: { label: "Média", color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800", icon: TrendingUp },
  low: { label: "Baixa", color: "text-muted-foreground bg-muted border-border", icon: Minus },
};

const intentConfig: Record<ConversationIntent, { label: string; icon: typeof HelpCircle }> = {
  sales: { label: "Vendas", icon: ShoppingCart },
  support: { label: "Suporte", icon: HeadphonesIcon },
  question: { label: "Pergunta", icon: MessageCircleQuestion },
  follow_up: { label: "Follow-up", icon: Reply },
  complaint: { label: "Reclamação", icon: AlertCircle },
  other: { label: "Outro", icon: HelpCircle },
};

const sentimentConfig: Record<ConversationSentiment, { label: string; color: string; icon: typeof ThumbsUp }> = {
  positive: { label: "Positivo", color: "text-green-600", icon: ThumbsUp },
  neutral: { label: "Neutro", color: "text-muted-foreground", icon: Minus },
  negative: { label: "Negativo", color: "text-destructive", icon: ThumbsDown },
};

export function ConversationClassification({
  conversationId,
  leadId,
  messages,
  leadName,
  channel,
  aiPriority,
  aiIntent,
  aiSentiment,
  userPriority,
  userIntent,
  classificationConfirmed,
}: ConversationClassificationProps) {
  const classifyMutation = useClassifyConversation();
  const saveMutation = useSaveClassification();
  const confirmMutation = useConfirmClassification();

  const [isEditing, setIsEditing] = useState(false);
  const [editPriority, setEditPriority] = useState<ConversationPriority | undefined>();
  const [editIntent, setEditIntent] = useState<ConversationIntent | undefined>();
  const [reasoning, setReasoning] = useState<string | null>(null);

  // Effective values (user override takes precedence)
  const effectivePriority = userPriority || aiPriority;
  const effectiveIntent = userIntent || aiIntent;
  const hasAnyClassification = aiPriority || aiIntent || aiSentiment;
  const hasUserOverride = userPriority || userIntent;

  useEffect(() => {
    if (isEditing) {
      setEditPriority(effectivePriority || undefined);
      setEditIntent(effectiveIntent || undefined);
    }
  }, [isEditing, effectivePriority, effectiveIntent]);

  const handleClassify = async () => {
    if (!messages.length) return;

    try {
      const result = await classifyMutation.mutateAsync({
        messages,
        leadName,
        channel,
      });

      setReasoning(result.reasoning);

      // Save to database
      await saveMutation.mutateAsync({
        conversationId,
        classification: result,
        isAI: true,
      });
    } catch (error) {
      // Error already handled in mutation
    }
  };

  const handleSaveOverride = async () => {
    if (!editPriority && !editIntent) {
      setIsEditing(false);
      return;
    }

    await saveMutation.mutateAsync({
      conversationId,
      classification: {
        priority: editPriority,
        intent: editIntent,
      },
      isAI: false,
    });

    setIsEditing(false);
  };

  const handleConfirm = async () => {
    await confirmMutation.mutateAsync({
      conversationId,
      leadId,
      updateLead: true,
    });
  };

  const isLoading = classifyMutation.isPending || saveMutation.isPending;

  if (!hasAnyClassification && messages.length === 0) {
    return null;
  }

  return (
    <Card className="p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Classificação AI</span>
          {hasUserOverride && (
            <Badge variant="outline" className="text-xs">
              Editado
            </Badge>
          )}
          {classificationConfirmed && (
            <Badge variant="default" className="text-xs bg-green-600">
              <Check className="w-3 h-3 mr-1" />
              Confirmado
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleClassify}
                      disabled={isLoading || messages.length === 0}
                    >
                      {classifyMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasAnyClassification ? "Reclassificar" : "Classificar com AI"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {hasAnyClassification && !classificationConfirmed && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar classificação</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
        </div>
      </div>

      {/* No classification yet - prompt to classify */}
      {!hasAnyClassification && messages.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={handleClassify}
          disabled={isLoading}
        >
          {classifyMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              A classificar...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Classificar Conversa
            </>
          )}
        </Button>
      )}

      {/* Classification display */}
      {hasAnyClassification && !isEditing && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {/* Priority */}
            {effectivePriority && (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
                  priorityConfig[effectivePriority].color
                )}
              >
                {(() => {
                  const Icon = priorityConfig[effectivePriority].icon;
                  return <Icon className="w-3 h-3" />;
                })()}
                Prioridade: {priorityConfig[effectivePriority].label}
              </div>
            )}

            {/* Intent */}
            {effectiveIntent && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-background text-xs font-medium">
                {(() => {
                  const Icon = intentConfig[effectiveIntent].icon;
                  return <Icon className="w-3 h-3 text-primary" />;
                })()}
                {intentConfig[effectiveIntent].label}
              </div>
            )}

            {/* Sentiment */}
            {aiSentiment && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-background text-xs font-medium">
                {(() => {
                  const config = sentimentConfig[aiSentiment];
                  const Icon = config.icon;
                  return <Icon className={cn("w-3 h-3", config.color)} />;
                })()}
                {sentimentConfig[aiSentiment].label}
              </div>
            )}
          </div>

          {/* Reasoning */}
          {reasoning && (
            <p className="text-xs text-muted-foreground italic">
              "{reasoning}"
            </p>
          )}

          {/* Confirm button */}
          {!classificationConfirmed && (
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2 mt-2"
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Confirmar e Aplicar ao CRM
            </Button>
          )}
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Prioridade</label>
              <Select
                value={editPriority || ""}
                onValueChange={(v) => setEditPriority(v as ConversationPriority)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(priorityConfig) as ConversationPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityConfig[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Intenção</label>
              <Select
                value={editIntent || ""}
                onValueChange={(v) => setEditIntent(v as ConversationIntent)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(intentConfig) as ConversationIntent[]).map((i) => (
                    <SelectItem key={i} value={i}>
                      {intentConfig[i].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSaveOverride}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
