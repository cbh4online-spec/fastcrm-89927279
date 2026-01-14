import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  FileText,
  Loader2,
  RefreshCw,
  Scissors,
  ArrowRight,
  Check,
  Copy,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { useTemplates, Template, TemplateGoal } from "@/hooks/useTemplates";
import { useCopilot } from "@/hooks/useCopilot";
import { VariableContext, renderTemplate, validateTemplate } from "@/lib/templateVariables";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  entityData: VariableContext;
  conversationContext?: {
    messages: Array<{ direction: string; content: string }>;
    leadName?: string | null;
    channel?: string;
  };
  onApply: (text: string) => void;
}

const goalLabels: Record<TemplateGoal, string> = {
  qualification: "Qualificação",
  follow_up: "Follow-up",
  booking: "Agendamento",
  closing: "Fecho",
  support: "Suporte",
  other: "Outro",
};

export function InboxTemplateAIDraft({ entityData, conversationContext, onApply }: Props) {
  const { data: templates } = useTemplates({ isActive: true });
  const { isLoading, suggestReplies } = useCopilot();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModifying, setIsModifying] = useState(false);

  // Get selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || !templates) return null;
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);

  // Validate template with current context
  const validation = useMemo(() => {
    if (!selectedTemplate) return null;
    return validateTemplate(selectedTemplate.content, entityData);
  }, [selectedTemplate, entityData]);

  // Render template with available data
  const renderedTemplate = useMemo(() => {
    if (!selectedTemplate) return null;
    return renderTemplate(selectedTemplate.content, entityData);
  }, [selectedTemplate, entityData]);

  // Generate AI draft based on template
  const handleGenerateAIDraft = async () => {
    if (!selectedTemplate || !conversationContext) return;

    setIsGenerating(true);
    try {
      const copilotMessages = conversationContext.messages.map(m => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
        direction: m.direction,
      }));

      // Add template context as a system message
      const messagesWithContext = [
        {
          role: "system",
          content: `Use este template como base para a resposta, personalizando para a conversa: "${selectedTemplate.content}". 
          Tom: ${selectedTemplate.tone}. Objetivo: ${selectedTemplate.goal}.
          Nome do lead: ${conversationContext.leadName || "Cliente"}.`,
          direction: "system",
        },
        ...copilotMessages,
      ];

      const result = await suggestReplies(messagesWithContext);

      if (result?.suggestions && result.suggestions.length > 0) {
        // AI creates a personalized version based on the template
        setAiDraft(result.suggestions[0].text);
      } else {
        // Fall back to rendered template
        setAiDraft(renderedTemplate);
      }
    } catch (error) {
      toast.error("Erro ao gerar rascunho AI");
      setAiDraft(renderedTemplate);
    } finally {
      setIsGenerating(false);
    }
  };

  // Modify AI draft
  const handleModifyDraft = async (action: "rewrite" | "shorten" | "direct") => {
    if (!aiDraft) return;
    setIsModifying(true);

    setTimeout(() => {
      let modified = aiDraft;
      if (action === "shorten") {
        const sentences = aiDraft.split(". ");
        modified = sentences.slice(0, Math.ceil(sentences.length / 2)).join(". ");
        if (!modified.endsWith(".") && !modified.endsWith("!") && !modified.endsWith("?")) {
          modified += ".";
        }
      } else if (action === "direct") {
        modified = aiDraft
          .replace(/Gostaria de /gi, "")
          .replace(/Seria possível /gi, "")
          .replace(/Por favor, /gi, "");
        modified = modified.charAt(0).toUpperCase() + modified.slice(1);
      } else {
        modified = `${aiDraft}\n\nFico ao dispor para qualquer esclarecimento adicional.`;
      }
      setAiDraft(modified);
      setIsModifying(false);
    }, 500);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  const handleApply = (text: string) => {
    onApply(text);
    toast.success("Rascunho inserido");
  };

  // Filter templates by channel if available
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!conversationContext?.channel) return templates;

    const channelToType: Record<string, string> = {
      whatsapp: "whatsapp",
      instagram: "instagram_dm",
      email: "email",
      sms: "sms",
    };
    const templateType = channelToType[conversationContext.channel];
    
    if (templateType) {
      return templates.filter(t => t.type === templateType);
    }
    return templates;
  }, [templates, conversationContext?.channel]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Rascunho com Template</span>
        <Badge variant="outline" className="text-[10px] ml-auto">
          <Sparkles className="h-2.5 w-2.5 mr-1" />
          AI
        </Badge>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Escolha um template como base e deixe a AI personalizar para esta conversa.
        </p>
      </div>

      {/* Template Selection */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Template Base
        </label>
        <Select
          value={selectedTemplateId || ""}
          onValueChange={(v) => {
            setSelectedTemplateId(v);
            setAiDraft(null);
          }}
        >
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue placeholder="Selecionar template..." />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[200px]">
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
      </div>

      {/* Template Preview & Validation */}
      {selectedTemplate && (
        <div className="space-y-2">
          {/* Validation Status */}
          {validation && validation.unresolvedVariables.length > 0 && (
            <Alert className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {validation.unresolvedVariables.length} variável(is) não resolvida(s). 
                A AI tentará completar com base na conversa.
              </AlertDescription>
            </Alert>
          )}

          {/* Generate AI Draft Button */}
          <Button
            onClick={handleGenerateAIDraft}
            disabled={isGenerating || isLoading}
            className="w-full"
            size="sm"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Gerar Rascunho AI
          </Button>

          {/* AI Draft Preview */}
          {aiDraft && (
            <>
              <Separator />
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

                <div className="p-2 bg-muted/50 rounded-lg border text-sm whitespace-pre-wrap">
                  {aiDraft}
                </div>

                {/* Modification Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleModifyDraft("rewrite")}
                    disabled={isModifying}
                    className="flex-1 text-xs h-7"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reescrever
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleModifyDraft("shorten")}
                    disabled={isModifying}
                    className="flex-1 text-xs h-7"
                  >
                    <Scissors className="w-3 h-3 mr-1" />
                    Encurtar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleModifyDraft("direct")}
                    disabled={isModifying}
                    className="flex-1 text-xs h-7"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Direto
                  </Button>
                </div>

                {/* Apply Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(aiDraft)}
                    className="flex-1"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApply(aiDraft)}
                    className="flex-1"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Usar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
