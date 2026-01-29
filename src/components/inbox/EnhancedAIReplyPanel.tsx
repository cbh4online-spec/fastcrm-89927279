import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  MessageSquare,
  Loader2,
  Check,
  Copy,
  RefreshCw,
  Scissors,
  ArrowRight,
  Lightbulb,
  AlertCircle,
  FileText,
  Smile,
  Briefcase,
} from "lucide-react";
import { useInboxAI, ReplySuggestion, ModifyAction, LeadData, OpportunityData } from "@/hooks/useInboxAI";
import { useTemplates, Template, TemplateGoal } from "@/hooks/useTemplates";
import { Message } from "@/hooks/useMessages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  messages: Message[];
  leadData?: LeadData;
  opportunityData?: OpportunityData;
  channel?: string;
  onInsertReply: (text: string) => void;
}

const goalLabels: Record<TemplateGoal, string> = {
  qualification: "Qualificação",
  follow_up: "Follow-up",
  booking: "Agendamento",
  closing: "Fecho",
  support: "Suporte",
  other: "Outro",
};

export function EnhancedAIReplyPanel({
  messages,
  leadData,
  opportunityData,
  channel,
  onInsertReply,
}: Props) {
  const { isLoading, suggestReplies, modifyReply, personalizeTemplate } = useInboxAI();
  const { data: templates } = useTemplates({ isActive: true });

  const [activeTab, setActiveTab] = useState<"suggest" | "template">("suggest");
  const [suggestions, setSuggestions] = useState<ReplySuggestion[] | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [selectedReply, setSelectedReply] = useState<string | null>(null);
  const [modifiedReply, setModifiedReply] = useState<string | null>(null);
  const [isModifying, setIsModifying] = useState(false);

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState<string | null>(null);
  const [missingVars, setMissingVars] = useState<string[]>([]);

  // Filter templates by channel
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!channel) return templates;

    const channelToType: Record<string, string> = {
      whatsapp: "whatsapp",
      instagram: "instagram_dm",
      email: "email",
      sms: "sms",
    };
    const templateType = channelToType[channel];

    if (templateType) {
      return templates.filter(t => t.type === templateType);
    }
    return templates;
  }, [templates, channel]);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || !templates) return null;
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);

  // Handle suggest replies
  const handleSuggestReplies = async () => {
    setSuggestions(null);
    setSelectedReply(null);
    setModifiedReply(null);
    setReasoning(null);

    const result = await suggestReplies(messages, leadData, opportunityData, channel);
    if (result) {
      setSuggestions(result.suggestions);
      setReasoning(result.reasoning);
    }
  };

  // Handle modify reply
  const handleModifyReply = async (action: ModifyAction) => {
    const textToModify = modifiedReply || selectedReply;
    if (!textToModify) return;

    setIsModifying(true);
    const result = await modifyReply(textToModify, action, messages, channel);
    if (result) {
      setModifiedReply(result.modifiedText);
      toast.success(`Resposta modificada: ${result.changes}`);
    }
    setIsModifying(false);
  };

  // Handle template personalization
  const handlePersonalizeTemplate = async () => {
    if (!selectedTemplate) return;

    setTemplateDraft(null);
    setMissingVars([]);

    const result = await personalizeTemplate(
      selectedTemplate,
      messages,
      leadData,
      opportunityData,
      channel
    );

    if (result) {
      setTemplateDraft(result.personalizedText);
      setMissingVars(result.missingVariables || []);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  const handleUseReply = (text: string) => {
    onInsertReply(text);
    toast.success("Resposta inserida no campo de mensagem");
  };

  const displayReply = modifiedReply || selectedReply;

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Assistente de Respostas</span>
          <Badge variant="outline" className="text-[10px] ml-auto">
            AI Contextual
          </Badge>
        </div>

        {/* Safety Notice */}
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            O AI nunca inventa dados pessoais. Revise sempre antes de enviar.
          </p>
        </div>

        {/* Context Info */}
        {(leadData?.name || opportunityData?.title) && (
          <div className="flex flex-wrap gap-1.5">
            {leadData?.name && (
              <Badge variant="secondary" className="text-xs">
                Lead: {leadData.name}
              </Badge>
            )}
            {opportunityData?.title && (
              <Badge variant="secondary" className="text-xs">
                Oport.: {opportunityData.title}
              </Badge>
            )}
            {channel && (
              <Badge variant="outline" className="text-xs capitalize">
                {channel}
              </Badge>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "suggest" | "template")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="suggest" className="text-xs">
              <MessageSquare className="w-3 h-3 mr-1" />
              Sugerir
            </TabsTrigger>
            <TabsTrigger value="template" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Template
            </TabsTrigger>
          </TabsList>

          {/* Suggest Tab */}
          <TabsContent value="suggest" className="space-y-3 mt-3">
            <Button
              onClick={handleSuggestReplies}
              disabled={isLoading}
              className="w-full"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Sugerir Respostas
            </Button>

            {/* AI Reasoning */}
            {reasoning && (
              <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-lg">
                <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{reasoning}</p>
              </div>
            )}

            {/* Suggestions */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  Sugestões ({suggestions.length})
                </h4>
                {suggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2 rounded-lg cursor-pointer transition-colors border",
                      selectedReply === suggestion.text
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted hover:bg-muted/80 border-transparent"
                    )}
                    onClick={() => {
                      setSelectedReply(suggestion.text);
                      setModifiedReply(null);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {suggestion.tone === "formal" && <Briefcase className="w-2.5 h-2.5 mr-1" />}
                          {suggestion.tone === "friendly" && <Smile className="w-2.5 h-2.5 mr-1" />}
                          {suggestion.tone === "formal" ? "Formal" :
                            suggestion.tone === "friendly" ? "Amigável" :
                            suggestion.tone === "empathetic" ? "Empático" : "Profissional"}
                        </Badge>
                      </div>
                      {selectedReply === suggestion.text && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <p className="text-xs line-clamp-3">{suggestion.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 italic">
                      {suggestion.intent}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Template Tab */}
          <TabsContent value="template" className="space-y-3 mt-3">
            <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Escolha um template e o AI personaliza com base na conversa.
              </p>
            </div>

            <Select
              value={selectedTemplateId || ""}
              onValueChange={(v) => {
                setSelectedTemplateId(v);
                setTemplateDraft(null);
                setMissingVars([]);
              }}
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="Selecionar template..." />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[180px]">
                  {filteredTemplates.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Sem templates disponíveis
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{template.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {goalLabels[template.goal]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </ScrollArea>
              </SelectContent>
            </Select>

            {selectedTemplate && (
              <Button
                onClick={handlePersonalizeTemplate}
                disabled={isLoading}
                className="w-full"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Personalizar com AI
              </Button>
            )}

            {/* Template Draft */}
            {templateDraft && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Rascunho Personalizado
                  </span>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    <Sparkles className="h-2.5 w-2.5 mr-1" />
                    AI
                  </Badge>
                </div>

                {missingVars.length > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg">
                    <AlertCircle className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700">
                      Dados não disponíveis: {missingVars.join(", ")}
                    </p>
                  </div>
                )}

                <div className="p-2 bg-muted/50 rounded-lg border text-xs whitespace-pre-wrap">
                  {templateDraft}
                </div>

                {/* Modification Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedReply(templateDraft);
                      setModifiedReply(null);
                      setActiveTab("suggest");
                    }}
                    className="flex-1 text-xs h-7"
                  >
                    Ajustar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(templateDraft)}
                    className="flex-1 text-xs h-7"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUseReply(templateDraft)}
                    className="flex-1 text-xs h-7"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Usar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Selected Reply Actions */}
        {selectedReply && activeTab === "suggest" && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                Ajustar Resposta
              </h4>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("shorten")}
                  disabled={isModifying || isLoading}
                  className="text-xs h-7"
                >
                  <Scissors className="w-3 h-3 mr-1" />
                  Encurtar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("direct")}
                  disabled={isModifying || isLoading}
                  className="text-xs h-7"
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  Mais Direto
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("rewrite")}
                  disabled={isModifying || isLoading}
                  className="text-xs h-7"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reescrever
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("friendly")}
                  disabled={isModifying || isLoading}
                  className="text-xs h-7"
                >
                  <Smile className="w-3 h-3 mr-1" />
                  Mais Amigável
                </Button>
              </div>

              {/* Preview */}
              {displayReply && (
                <div className="p-2 bg-background rounded-lg border">
                  <p className="text-xs whitespace-pre-wrap">{displayReply}</p>
                </div>
              )}

              {/* Final Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(displayReply!)}
                  className="flex-1"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUseReply(displayReply!)}
                  className="flex-1"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Usar Resposta
                </Button>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
