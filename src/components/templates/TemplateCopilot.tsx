import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TemplateType, TemplateGoal, TemplateTone } from '@/hooks/useTemplates';
import {
  Sparkles,
  Wand2,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  Lightbulb,
  AlertCircle,
  Mail,
  MessageCircle,
  Instagram,
  FileText,
  Smartphone,
  Loader2,
  Variable,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GeneratedTemplate {
  content: string;
  subject?: string;
  suggestedVariables: string[];
  suggestedName: string;
  suggestedGoal?: TemplateGoal;
  tips?: string;
}

interface TemplateCopilotProps {
  onTemplateGenerated?: (template: GeneratedTemplate) => void;
  initialChannel?: TemplateType;
  className?: string;
}

const channelConfig: Record<TemplateType, { icon: React.ElementType; label: string; color: string }> = {
  email: { icon: Mail, label: 'Email', color: 'text-blue-500' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'text-green-500' },
  instagram_dm: { icon: Instagram, label: 'Instagram DM', color: 'text-pink-500' },
  proposal: { icon: FileText, label: 'Proposta', color: 'text-purple-500' },
  sms: { icon: Smartphone, label: 'SMS', color: 'text-amber-500' },
};

const goalLabels: Record<TemplateGoal, string> = {
  qualification: 'Qualificação',
  follow_up: 'Follow-up',
  booking: 'Agendamento',
  closing: 'Fecho',
  support: 'Suporte',
  other: 'Outro',
};

const toneLabels: Record<TemplateTone, string> = {
  formal: 'Formal',
  direct: 'Direto',
  friendly: 'Amigável',
  casual: 'Casual',
};

export function TemplateCopilot({
  onTemplateGenerated,
  initialChannel = 'email',
  className,
}: TemplateCopilotProps) {
  const [description, setDescription] = useState('');
  const [channel, setChannel] = useState<TemplateType>(initialChannel);
  const [tone, setTone] = useState<TemplateTone>('friendly');
  const [goal, setGoal] = useState<TemplateGoal>('follow_up');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<GeneratedTemplate | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Descreva o que pretende no template');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedTemplate(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-template-copilot', {
        body: {
          action: 'generate_template',
          description,
          channel,
          tone,
          goal,
          language: 'pt',
        },
      });

      if (fnError) throw fnError;

      if (data?.result) {
        setGeneratedTemplate(data.result);
        toast.success('Template gerado com sucesso!');
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (err: any) {
      console.error('Generate template error:', err);
      const errorMessage = err.message || 'Erro ao gerar template';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedTemplate) return;
    const text = generatedTemplate.subject 
      ? `Assunto: ${generatedTemplate.subject}\n\n${generatedTemplate.content}`
      : generatedTemplate.content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado para a área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseTemplate = () => {
    if (generatedTemplate && onTemplateGenerated) {
      onTemplateGenerated(generatedTemplate);
    }
  };

  const handleRegenerate = () => {
    setGeneratedTemplate(null);
    handleGenerate();
  };

  const ChannelIcon = channelConfig[channel].icon;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Gerar Template com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description Input */}
        <div className="space-y-2">
          <Label htmlFor="description">Descreva o template que pretende</Label>
          <Textarea
            id="description"
            placeholder="Ex: Uma mensagem de follow-up amigável para leads que visitaram o nosso site mas não agendaram demonstração..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* Channel & Tone Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Canal</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as TemplateType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(channelConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <config.icon className={cn("h-3.5 w-3.5", config.color)} />
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">Tom</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as TemplateTone)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(toneLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8">
              <span className="text-xs text-muted-foreground">Opções avançadas</span>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform",
                showAdvanced && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Objetivo</Label>
              <Select value={goal} onValueChange={(v) => setGoal(v as TemplateGoal)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(goalLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !description.trim()}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              A gerar...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Gerar Template
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Generated Template */}
        {generatedTemplate && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChannelIcon className={cn("h-4 w-4", channelConfig[channel].color)} />
                  <span className="font-medium text-sm">{generatedTemplate.suggestedName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 text-xs gap-1"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
              </div>

              {/* Subject Line (for email) */}
              {generatedTemplate.subject && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Assunto</Label>
                  <div className="p-2 rounded-md bg-muted/50 text-sm">
                    {generatedTemplate.subject}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Conteúdo</Label>
                <ScrollArea className="h-[200px] rounded-md border bg-muted/30 p-3">
                  <div className="whitespace-pre-wrap text-sm">
                    {generatedTemplate.content}
                  </div>
                </ScrollArea>
              </div>

              {/* Variables Used */}
              {generatedTemplate.suggestedVariables.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Variable className="h-3 w-3" />
                    Variáveis utilizadas
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {generatedTemplate.suggestedVariables.map((v) => (
                      <Badge key={v} variant="secondary" className="text-[10px]">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {generatedTemplate.tips && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 text-xs">
                  <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{generatedTemplate.tips}</span>
                </div>
              )}

              {/* Use Template Button */}
              {onTemplateGenerated && (
                <Button onClick={handleUseTemplate} className="w-full">
                  Usar Este Template
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
