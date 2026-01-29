/**
 * Conversation Objective Form
 * Modal for creating/editing objectives with AI assistance
 */

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Target, Loader2, Sparkles, Wand2, User, Mail, Phone, Building2, DollarSign, Tag } from "lucide-react";
import { useConversationObjectives, CRM_FIELDS, type CrmEntity } from "@/hooks/useConversationObjectives";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ConversationObjective = Database["public"]["Tables"]["conversation_objectives"]["Row"];

interface ConversationObjectiveFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective?: ConversationObjective | null;
}

interface FormData {
  objective_name: string;
  objective_code: string;
  objective_description: string;
  crm_entity: CrmEntity;
  crm_field_to_update: string;
  crm_field_type: string;
  prompt_template: string;
  is_required: boolean;
  skip_if_filled: boolean;
  blocks_next_questions: boolean;
}

const initialFormData: FormData = {
  objective_name: "",
  objective_code: "",
  objective_description: "",
  crm_entity: "lead",
  crm_field_to_update: "name",
  crm_field_type: "text",
  prompt_template: "",
  is_required: false,
  skip_if_filled: true,
  blocks_next_questions: false,
};

// AI suggestion templates for common objectives
const AI_SUGGESTIONS = [
  {
    id: "name",
    icon: User,
    label: "Nome",
    description: "Recolher nome do lead",
    config: {
      objective_name: "Capturar Nome",
      objective_code: "lead_name",
      objective_description: "Pergunta o nome ao utilizador de forma natural",
      crm_entity: "lead" as CrmEntity,
      crm_field_to_update: "name",
      crm_field_type: "text",
      prompt_template: "Para lhe poder ajudar melhor, como se chama?",
      is_required: true,
      skip_if_filled: true,
      blocks_next_questions: false,
    },
  },
  {
    id: "email",
    icon: Mail,
    label: "Email",
    description: "Recolher email para contacto",
    config: {
      objective_name: "Capturar Email",
      objective_code: "lead_email",
      objective_description: "Solicita email para envio de informações",
      crm_entity: "lead" as CrmEntity,
      crm_field_to_update: "email",
      crm_field_type: "email",
      prompt_template: "Pode partilhar o seu email para lhe enviarmos mais informações?",
      is_required: true,
      skip_if_filled: true,
      blocks_next_questions: false,
    },
  },
  {
    id: "phone",
    icon: Phone,
    label: "Telefone",
    description: "Recolher contacto telefónico",
    config: {
      objective_name: "Capturar Telefone",
      objective_code: "lead_phone",
      objective_description: "Solicita número de telefone para contacto direto",
      crm_entity: "lead" as CrmEntity,
      crm_field_to_update: "phone",
      crm_field_type: "phone",
      prompt_template: "Se preferir, posso ligar-lhe. Qual é o seu número de telefone?",
      is_required: false,
      skip_if_filled: true,
      blocks_next_questions: false,
    },
  },
  {
    id: "company",
    icon: Building2,
    label: "Empresa",
    description: "Recolher nome da empresa",
    config: {
      objective_name: "Capturar Empresa",
      objective_code: "lead_company",
      objective_description: "Identifica a empresa do lead para contexto B2B",
      crm_entity: "lead" as CrmEntity,
      crm_field_to_update: "company_name",
      crm_field_type: "text",
      prompt_template: "Em que empresa trabalha atualmente?",
      is_required: false,
      skip_if_filled: true,
      blocks_next_questions: false,
    },
  },
  {
    id: "budget",
    icon: DollarSign,
    label: "Orçamento",
    description: "Identificar orçamento disponível",
    config: {
      objective_name: "Identificar Orçamento",
      objective_code: "opp_budget",
      objective_description: "Descobre o orçamento disponível para qualificação",
      crm_entity: "opportunity" as CrmEntity,
      crm_field_to_update: "value",
      crm_field_type: "number",
      prompt_template: "Para lhe apresentar as opções mais adequadas, tem algum orçamento em mente?",
      is_required: false,
      skip_if_filled: false,
      blocks_next_questions: false,
    },
  },
  {
    id: "interest",
    icon: Tag,
    label: "Interesse",
    description: "Identificar área de interesse",
    config: {
      objective_name: "Identificar Interesse",
      objective_code: "lead_interest",
      objective_description: "Descobre o que o lead procura ou precisa",
      crm_entity: "lead" as CrmEntity,
      crm_field_to_update: "tags",
      crm_field_type: "text",
      prompt_template: "O que o trouxe aqui hoje? Em que posso ajudá-lo?",
      is_required: false,
      skip_if_filled: false,
      blocks_next_questions: false,
    },
  },
];

export function ConversationObjectiveForm({
  open,
  onOpenChange,
  objective,
}: ConversationObjectiveFormProps) {
  const { createObjective, updateObjective, isCreating, isUpdating } =
    useConversationObjectives();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiHelper, setShowAiHelper] = useState(true);

  const isEditing = !!objective;
  const isSubmitting = isCreating || isUpdating;

  useEffect(() => {
    if (objective) {
      setFormData({
        objective_name: objective.objective_name,
        objective_code: objective.objective_code,
        objective_description: objective.objective_description || "",
        crm_entity: objective.crm_entity as CrmEntity,
        crm_field_to_update: objective.crm_field_to_update,
        crm_field_type: objective.crm_field_type || "text",
        prompt_template: objective.prompt_template || "",
        is_required: objective.is_required || false,
        skip_if_filled: objective.skip_if_filled ?? true,
        blocks_next_questions: objective.blocks_next_questions || false,
      });
      setShowAiHelper(false);
    } else {
      setFormData(initialFormData);
      setShowAiHelper(true);
    }
    setAiPrompt("");
  }, [objective, open]);

  const handleChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate code from name
    if (field === "objective_name" && !isEditing) {
      const code = (value as string)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .substring(0, 30);
      setFormData((prev) => ({ ...prev, objective_code: code }));
    }

    // Reset field when entity changes
    if (field === "crm_entity") {
      const entity = value as CrmEntity;
      const firstField = CRM_FIELDS[entity]?.[0]?.value || "name";
      setFormData((prev) => ({ ...prev, crm_field_to_update: firstField }));
    }
  };

  const applySuggestion = (suggestion: typeof AI_SUGGESTIONS[0]) => {
    setFormData(suggestion.config);
    setShowAiHelper(false);
    toast.success(`Template "${suggestion.label}" aplicado`);
  };

  const generateFromPrompt = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Descreva o objetivo que pretende criar");
      return;
    }

    setIsGenerating(true);

    try {
      const systemPrompt = `És um especialista em CRM e conversational AI. Gera configurações para objetivos de conversa.

Campos CRM disponíveis:
- lead: name, email, phone, company_name, status, source, tags, notes
- contact: name, email, phone, company, position, notes  
- opportunity: title, value, stage, probability, expected_close_date, notes

Responde APENAS com JSON válido no formato:
{
  "objective_name": "Nome curto do objetivo",
  "objective_code": "codigo_snake_case",
  "objective_description": "Descrição breve do que faz",
  "crm_entity": "lead" | "contact" | "opportunity",
  "crm_field_to_update": "campo_do_crm",
  "crm_field_type": "text" | "email" | "phone" | "number",
  "prompt_template": "Pergunta natural e amigável para obter a informação",
  "is_required": true | false,
  "skip_if_filled": true | false,
  "blocks_next_questions": true | false
}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Cria um objetivo para: ${aiPrompt}` },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error("Erro na API");

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Resposta inválida da IA");

      const generated = JSON.parse(jsonMatch[0]);

      // Validate and apply
      setFormData({
        objective_name: generated.objective_name || "",
        objective_code: generated.objective_code || "",
        objective_description: generated.objective_description || "",
        crm_entity: (["lead", "contact", "opportunity"].includes(generated.crm_entity) 
          ? generated.crm_entity 
          : "lead") as CrmEntity,
        crm_field_to_update: generated.crm_field_to_update || "name",
        crm_field_type: generated.crm_field_type || "text",
        prompt_template: generated.prompt_template || "",
        is_required: Boolean(generated.is_required),
        skip_if_filled: generated.skip_if_filled !== false,
        blocks_next_questions: Boolean(generated.blocks_next_questions),
      });

      setShowAiHelper(false);
      toast.success("Objetivo gerado com sucesso!");
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error("Erro ao gerar objetivo. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && objective) {
        await updateObjective({
          id: objective.id,
          data: {
            objective_name: formData.objective_name,
            objective_code: formData.objective_code,
            objective_description: formData.objective_description || null,
            crm_entity: formData.crm_entity,
            crm_field_to_update: formData.crm_field_to_update,
            crm_field_type: formData.crm_field_type,
            prompt_template: formData.prompt_template || null,
            is_required: formData.is_required,
            skip_if_filled: formData.skip_if_filled,
            blocks_next_questions: formData.blocks_next_questions,
          },
        });
      } else {
        await createObjective({
          objective_name: formData.objective_name,
          objective_code: formData.objective_code,
          objective_description: formData.objective_description || null,
          crm_entity: formData.crm_entity,
          crm_field_to_update: formData.crm_field_to_update,
          crm_field_type: formData.crm_field_type,
          prompt_template: formData.prompt_template || null,
          is_required: formData.is_required,
          skip_if_filled: formData.skip_if_filled,
          blocks_next_questions: formData.blocks_next_questions,
          is_active: true,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const availableFields = CRM_FIELDS[formData.crm_entity] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Objetivo" : "Novo Objetivo"}
          </DialogTitle>
          <DialogDescription>
            Configure o que a IA deve recolher e como mapear para o CRM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI Helper Section - Only for new objectives */}
          {!isEditing && showAiHelper && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Assistente IA</span>
                  <Badge variant="secondary" className="text-xs">Beta</Badge>
                </div>

                {/* Quick Suggestions */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Objetivos comuns:</p>
                  <div className="flex flex-wrap gap-2">
                    {AI_SUGGESTIONS.map((suggestion) => (
                      <Button
                        key={suggestion.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8"
                        onClick={() => applySuggestion(suggestion)}
                      >
                        <suggestion.icon className="h-3.5 w-3.5" />
                        {suggestion.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* AI Prompt Input */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Ou descreva o que pretende:</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Perguntar qual o melhor horário para contacto..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          generateFromPrompt();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={generateFromPrompt}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="gap-1.5 shrink-0"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                      Gerar
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => setShowAiHelper(false)}
                >
                  Preencher manualmente
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Show helper toggle when hidden */}
          {!isEditing && !showAiHelper && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 w-full"
              onClick={() => setShowAiHelper(true)}
            >
              <Sparkles className="h-4 w-4" />
              Usar Assistente IA
            </Button>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="objective_name">Nome do Objetivo *</Label>
              <Input
                id="objective_name"
                placeholder="Ex: Capturar Nome do Lead"
                value={formData.objective_name}
                onChange={(e) => handleChange("objective_name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective_code">Código Único *</Label>
              <Input
                id="objective_code"
                placeholder="Ex: lead_name"
                value={formData.objective_code}
                onChange={(e) => handleChange("objective_code", e.target.value)}
                required
                pattern="[a-z0-9_]+"
                title="Apenas letras minúsculas, números e underscore"
              />
              <p className="text-xs text-muted-foreground">
                Identificador único (letras minúsculas, números, underscore)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective_description">Descrição</Label>
              <Textarea
                id="objective_description"
                placeholder="Descreva o objetivo..."
                value={formData.objective_description}
                onChange={(e) =>
                  handleChange("objective_description", e.target.value)
                }
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* CRM Mapping */}
          <div className="space-y-4">
            <h4 className="font-medium">Mapeamento CRM</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entidade</Label>
                <Select
                  value={formData.crm_entity}
                  onValueChange={(value) =>
                    handleChange("crm_entity", value as CrmEntity)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="contact">Contacto</SelectItem>
                    <SelectItem value="opportunity">Oportunidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Campo a Atualizar</Label>
                <Select
                  value={formData.crm_field_to_update}
                  onValueChange={(value) =>
                    handleChange("crm_field_to_update", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Prompt Template */}
          <div className="space-y-2">
            <Label htmlFor="prompt_template">Como Perguntar (Prompt)</Label>
            <Textarea
              id="prompt_template"
              placeholder="Ex: Para dar seguimento, pode dizer-me o seu nome?"
              value={formData.prompt_template}
              onChange={(e) => handleChange("prompt_template", e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Sugestão de como a IA deve perguntar esta informação
            </p>
          </div>

          <Separator />

          {/* Behavior Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Comportamento</h4>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) =>
                    handleChange("is_required", !!checked)
                  }
                />
                <div>
                  <Label htmlFor="is_required" className="cursor-pointer">
                    Obrigatório
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    A conversa não avança sem esta informação
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="skip_if_filled"
                  checked={formData.skip_if_filled}
                  onCheckedChange={(checked) =>
                    handleChange("skip_if_filled", !!checked)
                  }
                />
                <div>
                  <Label htmlFor="skip_if_filled" className="cursor-pointer">
                    Saltar se já preenchido
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Não pergunta se o campo já tem valor no CRM
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="blocks_next_questions"
                  checked={formData.blocks_next_questions}
                  onCheckedChange={(checked) =>
                    handleChange("blocks_next_questions", !!checked)
                  }
                />
                <div>
                  <Label
                    htmlFor="blocks_next_questions"
                    className="cursor-pointer"
                  >
                    Bloquear próximas perguntas
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    A IA insiste neste objetivo até ser respondido
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar Alterações" : "Criar Objetivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
