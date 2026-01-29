/**
 * Conversation Objective Form
 * Modal for creating/editing objectives
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Target, Loader2 } from "lucide-react";
import { useConversationObjectives, CRM_FIELDS, type CrmEntity } from "@/hooks/useConversationObjectives";
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

export function ConversationObjectiveForm({
  open,
  onOpenChange,
  objective,
}: ConversationObjectiveFormProps) {
  const { createObjective, updateObjective, isCreating, isUpdating } =
    useConversationObjectives();
  const [formData, setFormData] = useState<FormData>(initialFormData);

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
    } else {
      setFormData(initialFormData);
    }
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
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
