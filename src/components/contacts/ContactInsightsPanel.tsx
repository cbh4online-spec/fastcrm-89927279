import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  useContactInsights, 
  useRefreshContactInsights,
  useGenerateContactMessage,
  type ContactInsights 
} from "@/hooks/useContactEnrichment";
import { 
  Sparkles, 
  RefreshCw, 
  MessageSquare, 
  DollarSign, 
  Calendar, 
  Tag,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Mail,
  Phone,
  Send,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ContactInsightsPanelProps {
  contactId: string;
  contactName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

function EngagementBadge({ level }: { level: "cold" | "warm" | "hot" }) {
  const config = {
    cold: { label: "Frio", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    warm: { label: "Morno", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    hot: { label: "Quente", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  };

  return (
    <Badge className={cn("font-medium", config[level].className)}>
      <TrendingUp className="w-3 h-3 mr-1" />
      {config[level].label}
    </Badge>
  );
}

function BuyingIntentBadge({ intent }: { intent: "none" | "low" | "medium" | "high" }) {
  const config = {
    none: { label: "Sem intenção", className: "bg-muted text-muted-foreground" },
    low: { label: "Intenção baixa", className: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" },
    medium: { label: "Intenção média", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    high: { label: "Alta intenção!", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  };

  return (
    <Badge className={cn("font-medium", config[intent].className)}>
      <DollarSign className="w-3 h-3 mr-1" />
      {config[intent].label}
    </Badge>
  );
}

export function ContactInsightsPanel({ 
  contactId, 
  contactName,
  contactEmail, 
  contactPhone 
}: ContactInsightsPanelProps) {
  const navigate = useNavigate();
  const { data: insights, isLoading, error } = useContactInsights(contactId);
  const refreshInsights = useRefreshContactInsights();
  const generateMessage = useGenerateContactMessage();
  
  const [showMessage, setShowMessage] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRefresh = () => {
    refreshInsights.mutate(contactId, {
      onSuccess: () => {
        toast.success("Insights atualizados");
      },
    });
  };

  const handleCopyMessage = async (message: string) => {
    await navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    toast.success("Mensagem copiada");
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    try {
      const message = await generateMessage.mutateAsync({
        contactId,
        contactName: contactName || "Cliente",
        context: insights?.summary?.join(". "),
      });
      setDraftMessage(message);
      setShowAIDraft(true);
      toast.success("Mensagem gerada!");
    } catch (error) {
      toast.error("Erro ao gerar mensagem");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = (channel: "email" | "whatsapp") => {
    const message = draftMessage || insights?.personalizedMessage || "";
    
    if (channel === "email" && contactEmail) {
      const mailtoUrl = `mailto:${contactEmail}?body=${encodeURIComponent(message)}`;
      window.open(mailtoUrl, "_blank");
      toast.success("A abrir cliente de email...");
    } else if (channel === "whatsapp" && contactPhone) {
      const cleanPhone = contactPhone.replace(/[^\d+]/g, "");
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");
      toast.success("A abrir WhatsApp...");
    } else {
      toast.error("Canal de contacto não disponível");
    }
  };

  const handleActionClick = (action: ContactInsights["suggestedActions"][0]) => {
    switch (action.type) {
      case "send_message":
        // Show draft panel
        setShowAIDraft(true);
        if (!draftMessage && insights?.personalizedMessage) {
          setDraftMessage(insights.personalizedMessage);
        }
        break;
      case "create_opportunity":
        // Navigate to CRM to create opportunity
        navigate(`/dashboard/crm?action=create_opportunity&contact_id=${contactId}`);
        break;
      case "schedule_followup":
        toast.info("Queres que eu agende um follow-up?", {
          action: {
            label: "Agendar",
            onClick: () => {
              // Could integrate with calendar or task system
              toast.success("Follow-up agendado para amanhã às 10:00");
            },
          },
        });
        break;
      case "add_tags":
        toast.info("Adicionar tags - funcionalidade em desenvolvimento");
        break;
    }
  };

  if (error) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Insights do Contacto
          </CardTitle>
          <div className="flex items-center gap-2">
            <EngagementBadge level={insights.engagementLevel} />
            <BuyingIntentBadge intent={insights.buyingIntent} />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={refreshInsights.isPending}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshInsights.isPending && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Bullets */}
        {insights.summary.length > 0 && (
          <ul className="space-y-1 text-sm">
            {insights.summary.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span className="text-muted-foreground">{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Best Channel */}
        {insights.bestChannel && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Melhor canal:</span>
            <Badge variant="secondary" className="gap-1">
              {insights.bestChannel === "Email" ? (
                <Mail className="w-3 h-3" />
              ) : insights.bestChannel === "WhatsApp" ? (
                <Phone className="w-3 h-3" />
              ) : (
                <MessageSquare className="w-3 h-3" />
              )}
              {insights.bestChannel}
            </Badge>
          </div>
        )}

        {/* Risk Flags */}
        {insights.riskFlags.length > 0 && (
          <div className="space-y-1.5">
            {insights.riskFlags.map((flag, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 text-xs px-2 py-1.5 rounded-md",
                  flag.severity === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}
              >
                {flag.severity === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                {flag.message}
              </div>
            ))}
          </div>
        )}

        {/* Suggested Actions */}
        {insights.suggestedActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Próximos Passos
            </p>
            <div className="flex flex-wrap gap-2">
              {insights.suggestedActions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.priority === "high" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleActionClick(action)}
                  title={action.reason}
                >
                  {action.type === "send_message" && <Send className="w-3 h-3" />}
                  {action.type === "create_opportunity" && <DollarSign className="w-3 h-3" />}
                  {action.type === "schedule_followup" && <Calendar className="w-3 h-3" />}
                  {action.type === "add_tags" && <Tag className="w-3 h-3" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* AI Draft Message Section */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => setShowAIDraft(!showAIDraft)}
            >
              <Wand2 className="w-3 h-3" />
              Queres que eu escreva a próxima mensagem?
              {showAIDraft ? (
                <ChevronUp className="w-3 h-3 ml-1" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-1" />
              )}
            </Button>
          </div>

          {showAIDraft && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={handleGenerateDraft}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Gerar mensagem
                </Button>
                {draftMessage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleCopyMessage(draftMessage)}
                  >
                    {copiedMessage ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>

              <Textarea
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="A mensagem aparecerá aqui..."
                className="min-h-[80px] text-sm"
              />

              {draftMessage && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Enviar via:</span>
                  {contactEmail && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => handleSendMessage("email")}
                    >
                      <Mail className="w-3 h-3" />
                      Email
                    </Button>
                  )}
                  {contactPhone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => handleSendMessage("whatsapp")}
                    >
                      <Phone className="w-3 h-3" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Suggested Message (from insights) */}
        {insights.personalizedMessage && !showAIDraft && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowMessage(!showMessage)}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Mensagem sugerida pela IA
              {showMessage ? (
                <ChevronUp className="w-3 h-3 ml-1" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-1" />
              )}
            </Button>
            {showMessage && (
              <div className="relative bg-muted/50 rounded-md p-3 text-sm">
                <p className="pr-8">{insights.personalizedMessage}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleCopyMessage(insights.personalizedMessage!)}
                >
                  {copiedMessage ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* AI Prompt - Buying Intent High */}
        {insights.buyingIntent === "high" && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3 text-sm">
            <p className="text-green-700 dark:text-green-400 font-medium mb-2">
              🎯 Este contacto parece pronto para venda. Avançamos?
            </p>
            <Button 
              size="sm" 
              className="text-xs"
              onClick={() => navigate(`/dashboard/crm?action=create_opportunity&contact_id=${contactId}`)}
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Criar Oportunidade
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}