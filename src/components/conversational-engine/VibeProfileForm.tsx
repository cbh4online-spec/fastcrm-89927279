/**
 * Vibe Profile Form - Create/Edit vibe profiles
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
import type { VibeProfile } from "@/types/conversational-engine";
import {
  VIBE_TONE_OPTIONS,
  VIBE_FORMALITY_OPTIONS,
  VIBE_RESPONSE_LENGTH_OPTIONS,
  VIBE_PERSONALITY_OPTIONS,
  VIBE_COMMERCIAL_OPTIONS,
} from "@/types/conversational-engine";

interface VibeProfileFormProps {
  profile?: VibeProfile | null;
  onSave: (data: Partial<VibeProfile>) => void;
  onCancel: () => void;
}

export function VibeProfileForm({ profile, onSave, onCancel }: VibeProfileFormProps) {
  const [formData, setFormData] = useState<Partial<VibeProfile>>({
    name: "",
    code: "",
    description: "",
    language_code: "pt-PT",
    tone: "calm",
    formality: "formal",
    personality: "empathetic",
    response_length: "concise",
    commercial_approach: "non_commercial",
    preferred_structure: "paragraphs",
    max_sentences_per_response: 3,
    use_emojis: false,
    use_exclamations: false,
    use_contractions: false,
    use_first_person: true,
    acknowledge_emotions: true,
    personalize_responses: true,
    focus_on_value: true,
    avoid_sales_language: true,
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        code: profile.code,
        description: profile.description || "",
        language_code: profile.language_code,
        tone: profile.tone,
        formality: profile.formality,
        personality: profile.personality,
        response_length: profile.response_length,
        commercial_approach: profile.commercial_approach,
        preferred_structure: profile.preferred_structure,
        max_sentences_per_response: profile.max_sentences_per_response,
        use_emojis: profile.use_emojis,
        use_exclamations: profile.use_exclamations,
        use_contractions: profile.use_contractions,
        use_first_person: profile.use_first_person,
        acknowledge_emotions: profile.acknowledge_emotions,
        personalize_responses: profile.personalize_responses,
        focus_on_value: profile.focus_on_value,
        avoid_sales_language: profile.avoid_sales_language,
        is_active: profile.is_active,
        is_default: profile.is_default,
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-generate code from name if empty
    if (!formData.code && formData.name) {
      formData.code = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    }
    onSave(formData);
  };

  const updateField = <K extends keyof VibeProfile>(field: K, value: VibeProfile[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Perfil *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Ex: Empresarial Formal PT"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language_code">Idioma</Label>
          <Select
            value={formData.language_code}
            onValueChange={(v) => updateField("language_code", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
              <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
              <SelectItem value="en-US">English (US)</SelectItem>
              <SelectItem value="en-GB">English (UK)</SelectItem>
              <SelectItem value="es-ES">Español</SelectItem>
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
          placeholder="Descreve quando usar este perfil..."
          rows={2}
        />
      </div>

      <Separator />

      {/* Tone & Style */}
      <div>
        <h4 className="font-medium mb-4">Tom & Estilo</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tom</Label>
            <Select
              value={formData.tone}
              onValueChange={(v) => updateField("tone", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VIBE_TONE_OPTIONS).map(([key, opt]) => (
                  <SelectItem key={key} value={key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Formalidade</Label>
            <Select
              value={formData.formality}
              onValueChange={(v) => updateField("formality", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VIBE_FORMALITY_OPTIONS).map(([key, opt]) => (
                  <SelectItem key={key} value={key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Personalidade</Label>
            <Select
              value={formData.personality}
              onValueChange={(v) => updateField("personality", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VIBE_PERSONALITY_OPTIONS).map(([key, opt]) => (
                  <SelectItem key={key} value={key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Response Format */}
      <div>
        <h4 className="font-medium mb-4">Formato de Resposta</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Comprimento</Label>
            <Select
              value={formData.response_length}
              onValueChange={(v) => updateField("response_length", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VIBE_RESPONSE_LENGTH_OPTIONS).map(([key, opt]) => (
                  <SelectItem key={key} value={key}>
                    {opt.label} (≈{opt.sentences} frases)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Máximo de Frases: {formData.max_sentences_per_response}</Label>
            <Slider
              value={[formData.max_sentences_per_response || 3]}
              onValueChange={([v]) => updateField("max_sentences_per_response", v)}
              min={1}
              max={10}
              step={1}
              className="mt-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Estrutura Preferida</Label>
            <Select
              value={formData.preferred_structure}
              onValueChange={(v) => updateField("preferred_structure", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraphs">Parágrafos</SelectItem>
                <SelectItem value="bullets">Listas/Bullets</SelectItem>
                <SelectItem value="mixed">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Abordagem Comercial</Label>
            <Select
              value={formData.commercial_approach}
              onValueChange={(v) => updateField("commercial_approach", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VIBE_COMMERCIAL_OPTIONS).map(([key, opt]) => (
                  <SelectItem key={key} value={key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Toggles */}
      <div>
        <h4 className="font-medium mb-4">Opções de Estilo</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label>Usar Emojis</Label>
            <Switch
              checked={formData.use_emojis}
              onCheckedChange={(v) => updateField("use_emojis", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Usar Exclamações</Label>
            <Switch
              checked={formData.use_exclamations}
              onCheckedChange={(v) => updateField("use_exclamations", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Usar Contrações</Label>
            <Switch
              checked={formData.use_contractions}
              onCheckedChange={(v) => updateField("use_contractions", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Usar Primeira Pessoa</Label>
            <Switch
              checked={formData.use_first_person}
              onCheckedChange={(v) => updateField("use_first_person", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Reconhecer Emoções</Label>
            <Switch
              checked={formData.acknowledge_emotions}
              onCheckedChange={(v) => updateField("acknowledge_emotions", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Personalizar Respostas</Label>
            <Switch
              checked={formData.personalize_responses}
              onCheckedChange={(v) => updateField("personalize_responses", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Focar no Valor</Label>
            <Switch
              checked={formData.focus_on_value}
              onCheckedChange={(v) => updateField("focus_on_value", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Evitar Linguagem Comercial</Label>
            <Switch
              checked={formData.avoid_sales_language}
              onCheckedChange={(v) => updateField("avoid_sales_language", v)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <Label>Perfil Ativo</Label>
          <p className="text-xs text-muted-foreground">
            Este perfil pode ser usado nas conversas
          </p>
        </div>
        <Switch
          checked={formData.is_active ?? true}
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
          {profile ? "Guardar" : "Criar Perfil"}
        </Button>
      </div>
    </form>
  );
}
