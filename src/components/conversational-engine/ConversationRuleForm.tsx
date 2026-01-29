/**
 * Conversation Rule Form - Create/Edit conversation rules
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X } from "lucide-react";
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
