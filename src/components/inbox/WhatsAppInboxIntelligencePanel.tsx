import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Send,
  Target,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Ticket,
  Package,
  ShieldAlert,
  Wand2,
  Info,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWhatsAppConversationInsight,
  useAnalyzeWhatsAppConversation,
  useRewriteReply,
  type InsightUrgency,
  type InsightIntent,
  type RewriteVariant,
  type WhatsAppConversationInsight,
} from "@/hooks/useWhatsAppConversationInsight";
import { toast } from "sonner";

interface Props {
  conversationId: string | null;
  workspaceId?: string | null;
  onInsertReply?: (text: string) => void;
  onCreateOpportunity?: (prefill?: { title?: string; reason?: string }) => void;
  onCreateTask?: (prefill: { title: string; description: string; priority: string }) => void;
  onCreateTicket?: (prefill: { title: string; description: string; priority: string }) => void;
  onSendProduct?: (productName: string) => void;
}

const INTENT_LABEL: Record<InsightIntent, string> = {
  sales_interest: "Interesse comercial",
  product_question: "Dúvida sobre produto",
  price_question: "Dúvida sobre preço",
  support_request: "Suporte",
  complaint: "Reclamação",
  appointment_request: "Pedido de agendamento",
  follow_up_needed: "Precisa de follow-up",
  payment_question: "Dúvida sobre pagamento",
  delivery_question: "Dúvida sobre entrega",
  cancellation_risk: "Risco de cancelamento",
  reactivation: "Reativação",
  partnership: "Parceria",
  spam: "Spam",
  other: "Outro",
};

const URGENCY_STYLE: Record<InsightUrgency, { label: string; cls: string }> = {
  low: { label: "Baixa", cls: "bg-muted text-muted-foreground border-border" },
  medium: { label: "Média", cls: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300" },
  high: { label: "Alta", cls: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300" },
  critical: { label: "Crítica", cls: "bg-red-500 text-white border-red-600" },
};

const VARIANT_OPTIONS: { value: RewriteVariant; label: string }[] = [
  { value: "shorter", label: "Mais curto" },
  { value: "professional", label: "Mais profissional" },
  { value: "empathetic", label: "Mais empático" },
  { value: "sales", label: "Mais comercial" },
  { value: "direct", label: "Mais direto" },
  { value: "with_cta", label: "Com CTA" },
  { value: "without_cta", label: "Sem CTA" },
];

function ConfidenceDot({ value }: { value: number | null }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      Confiança {pct}%
    </span>
  );
}

export function WhatsAppInboxIntelligencePanel({
  conversationId,
  onInsertReply,
  onCreateOpportunity,
  onCreateTask,
  onCreateTicket,
  onSendProduct,
}: Props) {
  const { data: insight, isLoading, isFetching } = useWhatsAppConversationInsight(conversationId);
  const analyze = useAnalyzeWhatsAppConversation();
  const rewrite = useRewriteReply();

  const [openObj, setOpenObj] = useState(true);
  const [openProducts, setOpenProducts] = useState(true);
  const [editedReply, setEditedReply] = useState<string | null>(null);
  const [pendingVariant, setPendingVariant] = useState<RewriteVariant | null>(null);

  const reply = editedReply ?? insight?.suggested_reply ?? "";

  if (!conversationId) return null;

  const isAnalyzing = analyze.isPending;
  const hasInsight = !!insight;

  const handleAnalyze = (force = true) =>
    analyze.mutate({ conversationId, force, triggerType: "manual" });

  const handleUseReply = () => {
    if (!reply || !onInsertReply) return;
    onInsertReply(reply);
    toast.success("Resposta inserida no campo de mensagem");
  };

  const handleRewrite = async (variant: RewriteVariant) => {
    if (!reply) return;
    setPendingVariant(variant);
    try {
      const out = await rewrite.mutateAsync({ text: reply, variant });
      setEditedReply(out);
      toast.success("Resposta reescrita");
    } finally {
      setPendingVariant(null);
    }
  };

  return (
    <Card className="p-3 mb-3 space-y-3 border-primary/10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium leading-none">Inteligência da Conversa</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Resumos, respostas sugeridas e próximas ações com IA.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handleAnalyze(true)}
          disabled={isAnalyzing}
          title={hasInsight ? "Atualizar análise" : "Analisar conversa"}
        >
          {isAnalyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Loading initial */}
      {isLoading && !insight && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> A carregar análise…
        </div>
      )}

      {/* Empty */}
      {!isLoading && !hasInsight && (
        <div className="space-y-2 py-2">
          <p className="text-xs text-muted-foreground">
            Ainda não existe análise desta conversa.
          </p>
          <Button
            size="sm"
            variant="default"
            className="w-full gap-1.5"
            onClick={() => handleAnalyze(true)}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Analisar conversa
          </Button>
        </div>
      )}

      {hasInsight && insight && (
        <>
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {insight.intent && (
              <Badge variant="secondary" className="text-[11px]">
                {INTENT_LABEL[insight.intent] ?? insight.intent}
              </Badge>
            )}
            {insight.urgency && (
              <Badge
                variant="outline"
                className={cn("text-[11px] border", URGENCY_STYLE[insight.urgency].cls)}
              >
                <Clock className="h-3 w-3 mr-1" />
                Urgência: {URGENCY_STYLE[insight.urgency].label}
              </Badge>
            )}
            {insight.sentiment && (
              <Badge variant="outline" className="text-[11px]">
                Sentimento:{" "}
                {insight.sentiment === "positive"
                  ? "Positivo"
                  : insight.sentiment === "negative"
                  ? "Negativo"
                  : insight.sentiment === "urgent"
                  ? "Urgente"
                  : "Neutro"}
              </Badge>
            )}
            {insight.conversation_stage && (
              <Badge variant="outline" className="text-[11px]">
                Etapa: {insight.conversation_stage.replace(/_/g, " ")}
              </Badge>
            )}
            {insight.suggested_tags?.slice(0, 4).map((t) => (
              <Badge key={t} variant="secondary" className="text-[11px] capitalize">
                {t.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>

          {/* Resumo */}
          {insight.summary && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Resumo</p>
              <p className="text-sm leading-snug">{insight.summary}</p>
            </div>
          )}

          {/* Próxima ação */}
          {insight.suggested_next_action && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
              <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-foreground">Próxima melhor ação</p>
                <p className="text-muted-foreground">{insight.suggested_next_action}</p>
              </div>
            </div>
          )}

          {/* Resposta sugerida */}
          {reply && (
            <div className="bg-muted/50 rounded p-2 space-y-2 border border-border/60">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Resposta sugerida</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px] gap-1"
                      disabled={rewrite.isPending}
                    >
                      {rewrite.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      Reescrever
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-[11px]">Variantes</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {VARIANT_OPTIONS.map((v) => (
                      <DropdownMenuItem
                        key={v.value}
                        onClick={() => handleRewrite(v.value)}
                        disabled={rewrite.isPending}
                      >
                        {pendingVariant === v.value && (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        )}
                        {v.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <textarea
                value={reply}
                onChange={(e) => setEditedReply(e.target.value)}
                className="w-full text-sm bg-background rounded border border-input p-2 min-h-[80px] resize-y leading-relaxed"
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 gap-1.5"
                  onClick={handleUseReply}
                  disabled={!onInsertReply || !reply}
                >
                  <Send className="h-3.5 w-3.5" />
                  Usar resposta
                </Button>
                {editedReply !== null && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedReply(null)}
                    title="Repor sugestão original"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Objeções */}
          {Array.isArray(insight.objections) && insight.objections.length > 0 && (
            <Collapsible open={openObj} onOpenChange={setOpenObj}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Objeções detetadas ({insight.objections.length})
                </span>
                {openObj ? (
                  <ChevronDown className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-amber-600" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                {insight.objections.map((obj, i) => (
                  <div key={i} className="rounded border border-border/60 bg-background p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {obj.objection_type}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {obj.description}
                      </span>
                    </div>
                    {obj.suggested_response && (
                      <>
                        <p className="text-xs text-foreground leading-snug">
                          💡 {obj.suggested_response}
                        </p>
                        {onInsertReply && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 mt-1 text-[11px]"
                            onClick={() => {
                              onInsertReply(obj.suggested_response);
                              toast.success("Resposta à objeção inserida");
                            }}
                          >
                            Usar resposta à objeção
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Produtos sugeridos */}
          {Array.isArray(insight.suggested_products) && insight.suggested_products.length > 0 && (
            <Collapsible open={openProducts} onOpenChange={setOpenProducts}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded bg-muted/40 hover:bg-muted/60">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  Produtos sugeridos ({insight.suggested_products.length})
                </span>
                {openProducts ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-1.5">
                {insight.suggested_products.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 rounded border border-border/60 bg-background p-2"
                  >
                    <div className="text-xs flex-1">
                      <p className="font-medium">{p.product_name}</p>
                      <p className="text-muted-foreground">{p.reason}</p>
                      <ConfidenceDot value={p.confidence} />
                    </div>
                    {onSendProduct && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => onSendProduct(p.product_name)}
                      >
                        Enviar
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground italic">
                  A IA não envia produtos automaticamente. Confirme sempre antes de enviar.
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Separator />

          {/* Ações sugeridas */}
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">Ações sugeridas</p>
            <div className="grid grid-cols-2 gap-1.5">
              {insight.suggested_task && onCreateTask && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 justify-start"
                  onClick={() => onCreateTask(insight.suggested_task!)}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  Criar tarefa
                </Button>
              )}
              {insight.suggested_ticket && onCreateTicket && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 justify-start"
                  onClick={() => onCreateTicket(insight.suggested_ticket!)}
                >
                  <Ticket className="h-3.5 w-3.5" />
                  Criar ticket
                </Button>
              )}
              {insight.suggested_deal && onCreateOpportunity && (
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5 justify-start col-span-2"
                  onClick={() =>
                    onCreateOpportunity({
                      title: insight.suggested_deal!.title,
                      reason: insight.suggested_deal!.reason,
                    })
                  }
                >
                  <Target className="h-3.5 w-3.5" />
                  Criar oportunidade
                </Button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <ConfidenceDot value={insight.confidence} />
            {insight.analyzed_at && (
              <p className="text-[10px] text-muted-foreground">
                Analisado{" "}
                {formatDistanceToNow(new Date(insight.analyzed_at), {
                  addSuffix: true,
                  locale: pt,
                })}
              </p>
            )}
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground italic border-t border-border/40 pt-2">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            Esta análise é uma sugestão gerada por IA. Confirme sempre antes de agir.
          </div>

          {(isFetching || isAnalyzing) && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> A atualizar…
            </div>
          )}
        </>
      )}
    </Card>
  );
}
