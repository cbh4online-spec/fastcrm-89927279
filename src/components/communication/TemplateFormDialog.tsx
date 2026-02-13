import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, Sparkles } from 'lucide-react';
import { 
  CommunicationTemplate, 
  TemplateChannel,
  TemplateStructure,
  JourneyContext,
  TemplateTone,
  CHANNEL_LABELS,
  JOURNEY_CONTEXT_LABELS,
  TONE_LABELS,
  STRUCTURE_LABELS,
  STRUCTURE_PLACEHOLDERS,
  LANGUAGE_OPTIONS,
  TEMPLATE_VARIABLES,
  renderTemplate,
  getPreviewVariables
} from '@/types/communicationTemplate';
import { useCreateCommunicationTemplate, useUpdateCommunicationTemplate } from '@/hooks/useCommunicationTemplates';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: CommunicationTemplate | null;
  onClose: () => void;
}

export function TemplateFormDialog({ open, onOpenChange, template, onClose }: TemplateFormDialogProps) {
  const isEditing = !!template?.id;
  const createTemplate = useCreateCommunicationTemplate();
  const updateTemplate = useUpdateCommunicationTemplate();

  const [formData, setFormData] = useState({
    name: '',
    channel: 'email' as TemplateChannel,
    language: 'pt',
    journeyContexts: [] as JourneyContext[],
    subject: '',
    body: '',
    tone: 'professional' as TemplateTone,
    structureType: 'custom' as TemplateStructure,
    cta: '',
    isActive: true,
    conversionCount: 0,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        channel: template.channel,
        language: template.language,
        journeyContexts: template.journeyContexts,
        subject: template.subject || '',
        body: template.body,
        tone: template.tone,
        structureType: template.structureType || 'custom',
        cta: template.cta || '',
        isActive: template.isActive,
        conversionCount: template.conversionCount || 0,
      });
    } else {
      setFormData({
        name: '',
        channel: 'email',
        language: 'pt',
        journeyContexts: [],
        subject: '',
        body: '',
        tone: 'professional',
        structureType: 'custom',
        cta: '',
        isActive: true,
        conversionCount: 0,
      });
    }
  }, [template, open]);

  const handleStructureChange = (structure: TemplateStructure) => {
    setFormData(prev => {
      const newData = { ...prev, structureType: structure };
      // If body is empty or matches another placeholder, pre-fill with new structure placeholder
      const allPlaceholders = Object.values(STRUCTURE_PLACEHOLDERS);
      if (!prev.body.trim() || allPlaceholders.some(p => p && prev.body.trim() === p.trim())) {
        newData.body = STRUCTURE_PLACEHOLDERS[structure] || '';
      }
      return newData;
    });
  };

  const handleSubmit = async () => {
    if (isEditing && template?.id) {
      await updateTemplate.mutateAsync({ id: template.id, ...formData });
    } else {
      await createTemplate.mutateAsync(formData);
    }
    onClose();
  };

  const toggleContext = (context: JourneyContext) => {
    setFormData(prev => ({
      ...prev,
      journeyContexts: prev.journeyContexts.includes(context)
        ? prev.journeyContexts.filter(c => c !== context)
        : [...prev.journeyContexts, context]
    }));
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      body: prev.body + `{{${variable}}}`
    }));
  };

  const previewText = renderTemplate(formData.body, getPreviewVariables());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="editor" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="variables">Variáveis</TabsTrigger>
            <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="editor" className="space-y-4 pr-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Template</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Boas-vindas Onboarding"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select 
                    value={formData.channel} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, channel: v as TemplateChannel }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estrutura</Label>
                  <Select 
                    value={formData.structureType} 
                    onValueChange={(v) => handleStructureChange(v as TemplateStructure)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STRUCTURE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tom</Label>
                  <Select 
                    value={formData.tone} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tone: v as TemplateTone }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TONE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select 
                    value={formData.language} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, language: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CTA (Call-to-Action)</Label>
                  <Input
                    value={formData.cta}
                    onChange={(e) => setFormData(prev => ({ ...prev, cta: e.target.value }))}
                    placeholder='Ex: "Responda QUERO EVOLUIR"'
                  />
                </div>
              </div>

              {/* Journey Contexts */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Contexto da Jornada
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Selecione em que momentos este template deve ser usado</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(JOURNEY_CONTEXT_LABELS).map(([value, label]) => (
                    <Badge
                      key={value}
                      variant={formData.journeyContexts.includes(value as JourneyContext) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleContext(value as JourneyContext)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Subject (email only) */}
              {formData.channel === 'email' && (
                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Ex: Olá {{primeiro_nome}}, bem-vindo!"
                  />
                </div>
              )}

              {/* Body */}
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder={STRUCTURE_PLACEHOLDERS[formData.structureType] || "Escreva a sua mensagem aqui. Use {{variável}} para personalizar."}
                  className="min-h-[200px]"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="isActive">Template ativo</Label>
              </div>
            </TabsContent>

            <TabsContent value="variables" className="space-y-4 pr-4">
              <p className="text-sm text-muted-foreground">
                Clique numa variável para a inserir no corpo da mensagem.
              </p>
              <div className="space-y-2">
                {TEMPLATE_VARIABLES.map(variable => (
                  <div 
                    key={variable.key}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                    onClick={() => insertVariable(variable.key)}
                  >
                    <div>
                      <div className="font-medium text-sm">{variable.label}</div>
                      <div className="text-xs text-muted-foreground">{variable.description}</div>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {`{{${variable.key}}}`}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 pr-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-2">Pré-visualização com dados de exemplo:</div>
                {formData.channel === 'email' && formData.subject && (
                  <div className="font-medium mb-2">
                    Assunto: {renderTemplate(formData.subject, getPreviewVariables())}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{previewText || 'Escreva algo para ver a pré-visualização...'}</div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.body || createTemplate.isPending || updateTemplate.isPending}
          >
            {isEditing ? 'Guardar' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
