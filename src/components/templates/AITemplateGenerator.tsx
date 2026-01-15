import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  useGenerateTemplate, 
  type GenerateTemplateInput,
  type GeneratedEmailTemplate,
  type GeneratedWhatsAppTemplate 
} from "@/hooks/useGenerateTemplate";
import { useCreateTemplate, type TemplateType, type TemplateGoal, type TemplateTone } from "@/hooks/useTemplates";
import { 
  Sparkles, 
  Loader2, 
  Mail, 
  MessageSquare, 
  FileText,
  Copy,
  Check,
  Save,
  User,
  Building2,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AITemplateGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: TemplateType;
  context?: {
    contactId?: string;
    contactName?: string;
    companyId?: string;
    companyName?: string;
    opportunityId?: string;
    opportunityTitle?: string;
    conversationContext?: string;
  };
  onTemplateCreated?: (templateId: string) => void;
}

const goalOptions = [
  { value: "qualification", label: "Qualificação" },
  { value: "follow_up", label: "Follow-up" },
  { value: "booking", label: "Agendar reunião" },
  { value: "closing", label: "Fecho de venda" },
  { value: "support", label: "Suporte" },
  { value: "introduction", label: "Apresentação" },
  { value: "proposal", label: "Proposta comercial" },
  { value: "reactivation", label: "Reativação" },
];

const toneOptions = [
  { value: "formal", label: "Formal", description: "Profissional e respeitoso" },
  { value: "friendly", label: "Amigável", description: "Caloroso mas profissional" },
  { value: "direct", label: "Direto", description: "Conciso e objetivo" },
  { value: "casual", label: "Casual", description: "Descontraído e pessoal" },
];

export function AITemplateGenerator({ 
  open, 
  onOpenChange, 
  defaultType = "email",
  context = {},
  onTemplateCreated 
}: AITemplateGeneratorProps) {
  const [step, setStep] = useState<"configure" | "preview">("configure");
  const [type, setType] = useState<TemplateType>(defaultType);
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState<TemplateTone>("friendly");
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [templateName, setTemplateName] = useState("");
  const [copied, setCopied] = useState(false);

  const generateTemplate = useGenerateTemplate();
  const createTemplate = useCreateTemplate();

  const handleGenerate = async () => {
    if (!goal) {
      toast.error("Selecione um objetivo");
      return;
    }

    const input: GenerateTemplateInput = {
      type: type === "proposal" ? "proposal" : type === "whatsapp" || type === "instagram_dm" ? "whatsapp" : "email",
      goal,
      tone,
      context: {
        contactId: context.contactId,
        companyId: context.companyId,
        opportunityId: context.opportunityId,
        conversationContext: context.conversationContext,
      },
      customInstructions: customInstructions || undefined,
    };

    try {
      const result = await generateTemplate.mutateAsync(input);
      setGeneratedContent(result);
      setTemplateName(result.suggestedName || `Template ${type} - ${goal}`);
      setStep("preview");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSaveTemplate = async () => {
    if (!generatedContent) return;

    const isEmail = type === "email";
    const content = isEmail 
      ? (generatedContent as GeneratedEmailTemplate).content 
      : (generatedContent as GeneratedWhatsAppTemplate).content;

    try {
      const result = await createTemplate.mutateAsync({
        name: templateName,
        type,
        goal: goal as TemplateGoal,
        tone,
        content,
        subject: isEmail ? (generatedContent as GeneratedEmailTemplate).subject : undefined,
        linked_contact_id: context.contactId,
        linked_company_id: context.companyId,
        linked_opportunity_id: context.opportunityId,
        language: "pt-PT",
        tags: ["ai-generated"],
        compatible_modules: [type],
        required_variables: [],
        is_active: true,
      } as any);

      if (result?.id && onTemplateCreated) {
        onTemplateCreated(result.id);
      }

      handleClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCopy = async () => {
    const content = type === "email" 
      ? `Assunto: ${(generatedContent as GeneratedEmailTemplate).subject}\n\n${(generatedContent as GeneratedEmailTemplate).content}`
      : (generatedContent as GeneratedWhatsAppTemplate).content;
    
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep("configure");
    setGoal("");
    setTone("friendly");
    setCustomInstructions("");
    setGeneratedContent(null);
    setTemplateName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {step === "configure" ? "Gerar Template com IA" : "Template Gerado"}
          </DialogTitle>
          <DialogDescription>
            {step === "configure" 
              ? "Configure o que pretende e a IA cria o template." 
              : "Reveja e guarde o template gerado."
            }
          </DialogDescription>
        </DialogHeader>

        {step === "configure" ? (
          <div className="space-y-4">
            {/* Context Badges */}
            {(context.contactName || context.companyName || context.opportunityTitle) && (
              <div className="flex flex-wrap gap-2">
                {context.contactName && (
                  <Badge variant="secondary" className="gap-1">
                    <User className="w-3 h-3" />
                    {context.contactName}
                  </Badge>
                )}
                {context.companyName && (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="w-3 h-3" />
                    {context.companyName}
                  </Badge>
                )}
                {context.opportunityTitle && (
                  <Badge variant="secondary" className="gap-1">
                    <DollarSign className="w-3 h-3" />
                    {context.opportunityTitle}
                  </Badge>
                )}
              </div>
            )}

            {/* Type Selection */}
            <div className="space-y-2">
              <Label>Tipo de Template</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "email", label: "Email", icon: Mail },
                  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
                  { value: "proposal", label: "Proposta", icon: FileText },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={type === value ? "default" : "outline"}
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => setType(value as TemplateType)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {goalOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label>Tom</Label>
              <div className="grid grid-cols-2 gap-2">
                {toneOptions.map(opt => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={tone === opt.value ? "default" : "outline"}
                    className="h-auto py-2 flex-col items-start text-left"
                    onClick={() => setTone(opt.value as TemplateTone)}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label>Instruções adicionais (opcional)</Label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Ex: Mencionar promoção de 20%, usar linguagem técnica, incluir deadline..."
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label>Nome do Template</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nome do template"
              />
            </div>

            {/* Generated Content Preview */}
            <Card className="p-4 space-y-3">
              {type === "email" && (generatedContent as GeneratedEmailTemplate)?.subject && (
                <div>
                  <Label className="text-xs text-muted-foreground">Assunto</Label>
                  <p className="font-medium">{(generatedContent as GeneratedEmailTemplate).subject}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Conteúdo</Label>
                <div className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-[300px] overflow-auto">
                  {type === "email" 
                    ? (generatedContent as GeneratedEmailTemplate)?.content
                    : (generatedContent as GeneratedWhatsAppTemplate)?.content
                  }
                </div>
              </div>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "configure" ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleGenerate}
                disabled={!goal || generateTemplate.isPending}
              >
                {generateTemplate.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Template
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("configure")}>
                Voltar
              </Button>
              <Button variant="outline" onClick={handleCopy}>
                {copied ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copiar
              </Button>
              <Button 
                onClick={handleSaveTemplate}
                disabled={createTemplate.isPending}
              >
                {createTemplate.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar Template
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
