import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  TrendingUp, 
  Headphones, 
  Heart, 
  GraduationCap,
  Save,
  X
} from "lucide-react";
import type { AIProfile, AIProfileType, ToneOfVoice, DetailLevel, LanguageStyle } from "@/types/ai-profiles";
import { PROFILE_TYPES, TONE_OPTIONS, DETAIL_LEVELS, LANGUAGE_STYLES, CONTENT_TYPES } from "@/types/ai-profiles";
import type { KnowledgeBase } from "@/types/knowledge-base";

interface AIProfileFormProps {
  profile?: AIProfile | null;
  knowledgeBases: KnowledgeBase[];
  onSave: (data: Partial<AIProfile>) => void;
  onCancel: () => void;
}

export function AIProfileForm({ profile, knowledgeBases, onSave, onCancel }: AIProfileFormProps) {
  const [formData, setFormData] = useState<Partial<AIProfile>>({
    name: '',
    profileType: 'suporte',
    description: '',
    objective: '',
    targetAudience: '',
    toneOfVoice: 'profissional',
    detailLevel: 'medio',
    languageStyle: 'mista',
    limits: {
      canRespondAutomatically: true,
      requiresHumanConfirmation: false,
      refuseOutsideKnowledge: true
    },
    allowedKnowledgeBases: [],
    allowedContentTypes: ['faq', 'procedure'],
    systemPrompt: '',
    fallbackMessage: '',
    isActive: true
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        profileType: profile.profileType,
        description: profile.description || '',
        objective: profile.objective || '',
        targetAudience: profile.targetAudience || '',
        toneOfVoice: profile.toneOfVoice,
        detailLevel: profile.detailLevel,
        languageStyle: profile.languageStyle,
        limits: profile.limits,
        allowedKnowledgeBases: profile.allowedKnowledgeBases || [],
        allowedContentTypes: profile.allowedContentTypes || [],
        systemPrompt: profile.systemPrompt || '',
        fallbackMessage: profile.fallbackMessage || '',
        isActive: profile.isActive
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = <K extends keyof AIProfile>(field: K, value: AIProfile[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLimits = (key: keyof AIProfile['limits'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      limits: { ...prev.limits!, [key]: value }
    }));
  };

  const toggleKnowledgeBase = (id: string) => {
    const current = formData.allowedKnowledgeBases || [];
    const updated = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    updateField('allowedKnowledgeBases', updated);
  };

  const toggleContentType = (type: string) => {
    const current = formData.allowedContentTypes || [];
    const updated = current.includes(type)
      ? current.filter(x => x !== type)
      : [...current, type];
    updateField('allowedContentTypes', updated);
  };

  const getProfileIcon = (type: AIProfileType) => {
    switch (type) {
      case 'vendas': return TrendingUp;
      case 'suporte': return Headphones;
      case 'clinica': return Heart;
      case 'formacao': return GraduationCap;
    }
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
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Ex: IA de Vendas Premium"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profileType">Tipo de Perfil *</Label>
          <Select
            value={formData.profileType}
            onValueChange={(v) => updateField('profileType', v as AIProfileType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROFILE_TYPES).map(([key, config]) => {
                const Icon = getProfileIcon(key as AIProfileType);
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Descreve o propósito deste perfil..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="objective">Objetivo Principal</Label>
          <Textarea
            id="objective"
            value={formData.objective}
            onChange={(e) => updateField('objective', e.target.value)}
            placeholder="O que a IA deve alcançar neste perfil?"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetAudience">Público-Alvo</Label>
          <Input
            id="targetAudience"
            value={formData.targetAudience}
            onChange={(e) => updateField('targetAudience', e.target.value)}
            placeholder="Ex: Potenciais clientes, Formandos..."
          />
        </div>
      </div>

      <Separator />

      {/* Behavior */}
      <div>
        <h4 className="font-medium mb-4">Comportamento</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tom de Voz</Label>
            <Select
              value={formData.toneOfVoice}
              onValueChange={(v) => updateField('toneOfVoice', v as ToneOfVoice)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TONE_OPTIONS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nível de Detalhe</Label>
            <Select
              value={formData.detailLevel}
              onValueChange={(v) => updateField('detailLevel', v as DetailLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DETAIL_LEVELS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estilo de Linguagem</Label>
            <Select
              value={formData.languageStyle}
              onValueChange={(v) => updateField('languageStyle', v as LanguageStyle)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANGUAGE_STYLES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Limits */}
      <div>
        <h4 className="font-medium mb-4">Limites & Segurança</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Responder automaticamente</Label>
              <p className="text-xs text-muted-foreground">A IA pode responder sem confirmação humana</p>
            </div>
            <Switch
              checked={formData.limits?.canRespondAutomatically}
              onCheckedChange={(v) => updateLimits('canRespondAutomatically', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Requer confirmação humana</Label>
              <p className="text-xs text-muted-foreground">Respostas precisam de aprovação antes de enviar</p>
            </div>
            <Switch
              checked={formData.limits?.requiresHumanConfirmation}
              onCheckedChange={(v) => updateLimits('requiresHumanConfirmation', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Recusar fora da base de conhecimento</Label>
              <p className="text-xs text-muted-foreground">Não responde se não encontrar na base validada</p>
            </div>
            <Switch
              checked={formData.limits?.refuseOutsideKnowledge}
              onCheckedChange={(v) => updateLimits('refuseOutsideKnowledge', v)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Knowledge Bases */}
      <div>
        <h4 className="font-medium mb-4">Bases de Conhecimento</h4>
        {knowledgeBases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma base de conhecimento disponível. Cria uma primeiro.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {knowledgeBases.map((kb) => (
              <div
                key={kb.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.allowedKnowledgeBases?.includes(kb.id)
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleKnowledgeBase(kb.id)}
              >
                <Checkbox
                  checked={formData.allowedKnowledgeBases?.includes(kb.id)}
                  onCheckedChange={() => toggleKnowledgeBase(kb.id)}
                />
                <div>
                  <p className="text-sm font-medium">{kb.name}</p>
                  {kb.description && (
                    <p className="text-xs text-muted-foreground">{kb.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content Types */}
      <div>
        <h4 className="font-medium mb-4">Tipos de Conteúdo Permitidos</h4>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((type) => (
            <Badge
              key={type.value}
              variant={formData.allowedContentTypes?.includes(type.value) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleContentType(type.value)}
            >
              {type.label}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Prompts */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <Textarea
            id="systemPrompt"
            value={formData.systemPrompt}
            onChange={(e) => updateField('systemPrompt', e.target.value)}
            placeholder="Instruções completas para a IA..."
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Define o comportamento, tom e limites da IA em detalhe
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fallbackMessage">Mensagem de Fallback</Label>
          <Textarea
            id="fallbackMessage"
            value={formData.fallbackMessage}
            onChange={(e) => updateField('fallbackMessage', e.target.value)}
            placeholder="Mensagem quando a IA não consegue responder..."
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Usada quando a IA não encontra resposta na base de conhecimento
          </p>
        </div>
      </div>

      <Separator />

      {/* Active Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <Label>Perfil Ativo</Label>
          <p className="text-xs text-muted-foreground">Este perfil pode ser usado nas interações</p>
        </div>
        <Switch
          checked={formData.isActive}
          onCheckedChange={(v) => updateField('isActive', v)}
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
          {profile ? 'Guardar Alterações' : 'Criar Perfil'}
        </Button>
      </div>
    </form>
  );
}
