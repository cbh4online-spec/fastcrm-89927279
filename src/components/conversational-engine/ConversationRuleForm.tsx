/**
 * Conversation Rule Form - Create/Edit conversation rules
 * With AI Assistant for rule generation
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Sparkles, Loader2, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { ConversationRule, ConversationRuleType } from "@/types/conversational-engine";
import {
  RULE_TYPE_OPTIONS,
  RULE_SCOPE_OPTIONS,
  CONDITION_TYPE_OPTIONS,
  ACTION_TYPE_OPTIONS,
} from "@/types/conversational-engine";

interface ConversationRuleFormProps {
  rule?: ConversationRule | null;
  defaultType: ConversationRuleType;
  onSave: (data: Partial<ConversationRule>) => void;
  onCancel: () => void;
}

// AI suggestion templates by rule type
const AI_SUGGESTIONS: Record<ConversationRuleType, Array<{
  name: string;
  description: string;
  condition_type: string;
  condition_description: string;
  action_type: string;
  action_message: string;
  priority: number;
}>> = {
  DO: [
    {
      name: "Cumprimentar sempre",
      description: "Sempre responder com cumprimento educado",
      condition_type: "always",
      condition_description: "",
      action_type: "respond_with",
      action_message: "Olá! Obrigado pelo contacto. Como posso ajudá-lo hoje?",
      priority: 90
    },
    {
      name: "Identificar o cliente pelo nome",
      description: "Usar o nome do cliente quando disponível",
      condition_type: "always",
      condition_description: "",
      action_type: "respond_with",
      action_message: "",
      priority: 80
    },
    {
      name: "Oferecer ajuda adicional",
      description: "No final de cada resposta, perguntar se pode ajudar com mais alguma coisa",
      condition_type: "always",
      condition_description: "",
      action_type: "respond_with",
      action_message: "",
      priority: 60
    }
  ],
  DONT: [
    {
      name: "Nunca discutir preços",
      description: "Não dar informações sobre preços ou custos",
      condition_type: "keyword",
      condition_description: "preço, custo, valor, quanto custa, orçamento",
      action_type: "refuse",
      action_message: "Para informações sobre preços, por favor contacte a nossa equipa comercial ou aguarde que um colega entre em contacto.",
      priority: 95
    },
    {
      name: "Não falar de concorrentes",
      description: "Evitar mencionar ou comparar com concorrentes",
      condition_type: "keyword",
      condition_description: "concorrente, outra empresa, alternativa",
      action_type: "refuse",
      action_message: "Prefiro focar-me em como posso ajudá-lo com os nossos serviços. Em que posso ser útil?",
      priority: 85
    },
    {
      name: "Não prometer prazos",
      description: "Evitar comprometer-se com datas ou prazos específicos",
      condition_type: "keyword",
      condition_description: "prazo, quando fica pronto, demora quanto tempo",
      action_type: "refuse",
      action_message: "Para uma estimativa precisa de prazos, vou encaminhar a sua questão para a equipa responsável.",
      priority: 80
    }
  ],
  STOP: [
    {
      name: "Cliente insatisfeito",
      description: "Escalar quando o cliente demonstra insatisfação grave",
      condition_type: "sentiment",
      condition_description: "negativo",
      action_type: "escalate_human",
      action_message: "Peço desculpa pelo incómodo. Vou transferir para um colega que poderá ajudá-lo melhor.",
      priority: 100
    },
    {
      name: "Pedido de reclamação",
      description: "Transferir para humano quando há intenção de reclamar",
      condition_type: "intent",
      condition_description: "reclamação, queixa, insatisfação",
      action_type: "escalate_human",
      action_message: "Lamento a situação. Vou encaminhar para a nossa equipa de apoio ao cliente.",
      priority: 95
    },
    {
      name: "Muitas mensagens sem resolução",
      description: "Escalar após várias mensagens sem conseguir ajudar",
      condition_type: "message_count",
      condition_description: "5",
      action_type: "escalate_human",
      action_message: "Parece que não estou a conseguir ajudá-lo como merece. Vou passar para um colega especializado.",
      priority: 70
    }
  ],
  REDIRECT: [
    {
      name: "Questões técnicas",
      description: "Redirecionar questões técnicas para persona de suporte",
      condition_type: "topic",
      condition_description: "problema técnico, não funciona, erro, bug",
      action_type: "redirect_persona",
      action_message: "Vou transferi-lo para a nossa equipa de suporte técnico.",
      priority: 80
    },
    {
      name: "Interesse em compra",
      description: "Redirecionar para fluxo de vendas quando há interesse",
      condition_type: "intent",
      condition_description: "quero comprar, interessado, como adquiro",
      action_type: "redirect_flow",
      action_message: "Excelente! Vou encaminhá-lo para o nosso processo de aquisição.",
      priority: 85
    },
    {
      name: "Agendamento",
      description: "Redirecionar pedidos de agendamento",
      condition_type: "keyword",
      condition_description: "agendar, marcar, horário, disponibilidade",
      action_type: "redirect_flow",
      action_message: "Claro! Vamos verificar a disponibilidade para o agendamento.",
      priority: 75
    }
  ]
};

export function ConversationRuleForm({
  rule,
  defaultType,
  onSave,
  onCancel,
}: ConversationRuleFormProps) {
  const [formData, setFormData] = useState<Partial<ConversationRule>>({
    name: "",
    description: "",
    rule_type: defaultType,
    scope: "workspace",
    priority: 50,
    condition_type: "always",
    condition_value: {},
    condition_description: "",
    action_type: "respond_with",
    action_message: "",
    action_config: {},
    is_active: true,
    tags: [],
  });
  
  const [showAiHelper, setShowAiHelper] = useState(!rule); // Show by default for new rules
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || "",
        rule_type: rule.rule_type,
        scope: rule.scope,
        priority: rule.priority,
        condition_type: rule.condition_type,
        condition_value: rule.condition_value,
        condition_description: rule.condition_description || "",
        action_type: rule.action_type,
        action_message: rule.action_message || "",
        action_config: rule.action_config,
        is_active: rule.is_active,
        tags: rule.tags || [],
      });
      setShowAiHelper(false);
    } else {
      // Set appropriate defaults based on rule type
      const defaults: Record<ConversationRuleType, Partial<ConversationRule>> = {
        DO: { action_type: "respond_with", condition_type: "always" },
        DONT: { action_type: "refuse", condition_type: "keyword" },
        STOP: { action_type: "end_conversation", condition_type: "intent" },
        REDIRECT: { action_type: "redirect_persona", condition_type: "topic" },
      };
      setFormData((prev) => ({ ...prev, ...defaults[defaultType] }));
    }
  }, [rule, defaultType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = <K extends keyof ConversationRule>(
    field: K,
    value: ConversationRule[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applySuggestion = (suggestion: typeof AI_SUGGESTIONS["DO"][0]) => {
    setFormData((prev) => ({
      ...prev,
      name: suggestion.name,
      description: suggestion.description,
      condition_type: suggestion.condition_type,
      condition_description: suggestion.condition_description,
      action_type: suggestion.action_type,
      action_message: suggestion.action_message,
      priority: suggestion.priority,
    }));
    setShowAiHelper(false);
    toast.success("Sugestão aplicada! Reveja e ajuste conforme necessário.");
  };

  const generateFromPrompt = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Por favor, descreva o comportamento que pretende");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `És um assistente que cria regras de conversação para um chatbot empresarial em Português de Portugal.
              
O utilizador vai descrever um comportamento desejado e tu vais gerar uma regra com a seguinte estrutura JSON:
{
  "name": "Nome curto e descritivo da regra",
  "description": "Descrição mais detalhada do propósito",
  "condition_type": "keyword" | "regex" | "intent" | "sentiment" | "always" | "topic" | "message_count",
  "condition_description": "Palavras-chave separadas por vírgula, ou padrão regex, ou descrição da condição",
  "action_type": "respond_with" | "refuse" | "redirect_persona" | "redirect_flow" | "escalate_human" | "end_conversation",
  "action_message": "Mensagem que o bot deve enviar (em português de Portugal, educada e profissional)",
  "priority": número de 1-100 (quanto mais crítica a regra, maior o número)
}

Tipo de regra atual: ${formData.rule_type}
- DO: comportamentos que a IA DEVE sempre fazer
- DONT: comportamentos PROIBIDOS
- STOP: condições para terminar conversa ou escalar para humano
- REDIRECT: quando redirecionar para outra persona ou fluxo

Responde APENAS com o JSON, sem texto adicional.`
            },
            {
              role: "user",
              content: aiPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na API de IA");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const generated = JSON.parse(jsonMatch[0]);
          setFormData((prev) => ({
            ...prev,
            name: generated.name || prev.name,
            description: generated.description || prev.description,
            condition_type: generated.condition_type || prev.condition_type,
            condition_description: generated.condition_description || prev.condition_description,
            action_type: generated.action_type || prev.action_type,
            action_message: generated.action_message || prev.action_message,
            priority: generated.priority || prev.priority,
          }));
          setShowAiHelper(false);
          setAiPrompt("");
          toast.success("Regra gerada! Reveja os campos e ajuste se necessário.");
        }
      }
    } catch (error) {
      console.error("Error generating rule:", error);
      toast.error("Erro ao gerar regra. Por favor, tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter action types based on rule type
  const getRelevantActions = () => {
    const typeActionMap: Record<ConversationRuleType, string[]> = {
      DO: ["respond_with", "log_event"],
      DONT: ["refuse", "redirect_persona", "escalate_human", "log_event"],
      STOP: ["end_conversation", "escalate_human", "log_event"],
      REDIRECT: ["redirect_persona", "redirect_flow", "escalate_human"],
    };
    const allowed = typeActionMap[formData.rule_type as ConversationRuleType] || [];
    return ACTION_TYPE_OPTIONS.filter((opt) => allowed.includes(opt.value));
  };

  const currentSuggestions = AI_SUGGESTIONS[formData.rule_type as ConversationRuleType] || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Helper Section */}
      {!rule && (
        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary">Assistente IA</span>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAiHelper(!showAiHelper)}
              >
                {showAiHelper ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {showAiHelper && (
              <div className="space-y-4">
                {/* Natural Language Input */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Descreva o comportamento que pretende em linguagem natural:
                  </Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={
                        formData.rule_type === "DO" 
                          ? "Ex: Sempre agradecer ao cliente no início da conversa..."
                          : formData.rule_type === "DONT"
                          ? "Ex: Nunca mencionar valores ou dar orçamentos por mensagem..."
                          : formData.rule_type === "STOP"
                          ? "Ex: Passar para um humano se o cliente estiver zangado..."
                          : "Ex: Encaminhar para vendas quando o cliente mostrar interesse..."
                      }
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={generateFromPrompt}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="self-end"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Gerar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Quick Suggestions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm text-muted-foreground">
                      Ou escolha uma sugestão rápida:
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                    >
                      {showSuggestions ? "Esconder" : "Mostrar"}
                    </Button>
                  </div>
                  
                  {showSuggestions && (
                    <div className="grid grid-cols-1 gap-2">
                      {currentSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applySuggestion(suggestion)}
                          className="flex items-start gap-3 p-3 text-left rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        >
                          <Badge variant="secondary" className="shrink-0 mt-0.5">
                            P{suggestion.priority}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{suggestion.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {suggestion.description}
                            </p>
                          </div>
                          <Sparkles className="h-4 w-4 text-primary/50 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Regra *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Ex: Nunca discutir preços"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de Regra</Label>
          <Select
            value={formData.rule_type}
            onValueChange={(v) => updateField("rule_type", v as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RULE_TYPE_OPTIONS).map(([key, opt]) => (
                <SelectItem key={key} value={key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description || ""}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Descreve o propósito desta regra..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Âmbito</Label>
          <Select
            value={formData.scope}
            onValueChange={(v) => updateField("scope", v as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RULE_SCOPE_OPTIONS).map(([key, opt]) => (
                <SelectItem key={key} value={key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prioridade: {formData.priority}</Label>
          <Slider
            value={[formData.priority || 50]}
            onValueChange={([v]) => updateField("priority", v)}
            min={1}
            max={100}
            step={1}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground">
            Regras com maior prioridade são avaliadas primeiro
          </p>
        </div>
      </div>

      <Separator />

      {/* Condition */}
      <div>
        <h4 className="font-medium mb-4">Condição (Quando aplicar)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Condição</Label>
            <Select
              value={formData.condition_type}
              onValueChange={(v) => updateField("condition_type", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.condition_type !== "always" && (
            <div className="space-y-2">
              <Label htmlFor="condition_description">Valor/Padrão</Label>
              <Input
                id="condition_description"
                value={formData.condition_description || ""}
                onChange={(e) => updateField("condition_description", e.target.value)}
                placeholder={
                  formData.condition_type === "keyword"
                    ? "preço, custo, valor"
                    : formData.condition_type === "regex"
                    ? "quanto\\s+custa.*"
                    : "Descreva a condição..."
                }
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Action */}
      <div>
        <h4 className="font-medium mb-4">Ação (O que fazer)</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Ação</Label>
            <Select
              value={formData.action_type}
              onValueChange={(v) => updateField("action_type", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getRelevantActions().map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.action_type === "respond_with" ||
            formData.action_type === "refuse") && (
            <div className="space-y-2">
              <Label htmlFor="action_message">Mensagem de Resposta</Label>
              <Textarea
                id="action_message"
                value={formData.action_message || ""}
                onChange={(e) => updateField("action_message", e.target.value)}
                placeholder={
                  formData.action_type === "refuse"
                    ? "Peço desculpa, mas não posso ajudar com esse assunto. Posso ajudar com outra questão?"
                    : "Mensagem a enviar..."
                }
                rows={3}
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <Label>Regra Ativa</Label>
          <p className="text-xs text-muted-foreground">
            Esta regra será aplicada nas conversas
          </p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(v) => updateField("is_active", v)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          {rule ? "Guardar" : "Criar Regra"}
        </Button>
      </div>
    </form>
  );
}
