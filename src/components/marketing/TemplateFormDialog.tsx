import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Eye, Code } from 'lucide-react';
import { useCreateMarketingTemplate, useUpdateMarketingTemplate } from '@/hooks/useMarketingTemplates';
import { TEMPLATE_CATEGORIES, DEFAULT_TEMPLATES } from '@/types/marketing';
import type { MarketingTemplate } from '@/types/marketing';

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MarketingTemplate | null;
  onClose: () => void;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onClose,
}: TemplateFormDialogProps) {
  const createTemplate = useCreateMarketingTemplate();
  const updateTemplate = useUpdateMarketingTemplate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    bodyHtml: '',
    bodyText: '',
    category: 'general',
    isActive: true,
  });

  const [activeTab, setActiveTab] = useState('editor');

  useEffect(() => {
    if (open) {
      if (template) {
        setFormData({
          name: template.name,
          description: template.description || '',
          subject: template.subject || '',
          bodyHtml: template.bodyHtml,
          bodyText: template.bodyText || '',
          category: template.category,
          isActive: template.isActive,
        });
      } else {
        // Use default simple template
        const defaultTemplate = DEFAULT_TEMPLATES[0];
        setFormData({
          name: '',
          description: '',
          subject: '',
          bodyHtml: defaultTemplate.bodyHtml,
          bodyText: '',
          category: 'general',
          isActive: true,
        });
      }
      setActiveTab('editor');
    }
  }, [open, template]);

  const loadPresetTemplate = (preset: typeof DEFAULT_TEMPLATES[0]) => {
    setFormData({
      ...formData,
      name: formData.name || preset.name,
      description: preset.description,
      category: preset.category,
      bodyHtml: preset.bodyHtml,
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.bodyHtml) {
      return;
    }

    try {
      if (template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          ...formData,
        });
      } else {
        await createTemplate.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {template ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Edita o template de email'
              : 'Cria um novo template reutilizável para as tuas campanhas'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor" className="gap-2">
              <Code className="h-4 w-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="presets" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates Base
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Newsletter Mensal"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Descrição breve do template"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subject">Assunto Padrão</Label>
                <Input
                  id="subject"
                  placeholder="Ex: {{empresa_nome}} - Newsletter"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bodyHtml">Conteúdo HTML *</Label>
                <Textarea
                  id="bodyHtml"
                  placeholder="<html>...</html>"
                  value={formData.bodyHtml}
                  onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {'{{primeiro_nome}}'}, {'{{nome_cliente}}'}, {'{{empresa_nome}}'}, {'{{subject}}'}, {'{{unsubscribe_url}}'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Template Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Templates inativos não aparecem na seleção
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escolhe um template base para começar:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {DEFAULT_TEMPLATES.map((preset, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                  onClick={() => loadPresetTemplate(preset)}
                >
                  <h4 className="font-medium">{preset.name}</h4>
                  <p className="text-sm text-muted-foreground">{preset.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Categoria: {TEMPLATE_CATEGORIES.find(c => c.value === preset.category)?.label}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="border rounded-lg p-4 bg-white">
              {formData.subject && (
                <p className="text-sm mb-4 pb-4 border-b">
                  <strong>Assunto:</strong> {formData.subject
                    .replace(/\{\{empresa_nome\}\}/g, 'Minha Empresa')
                    .replace(/\{\{subject\}\}/g, 'Assunto')}
                </p>
              )}
              <div
                className="email-preview"
                dangerouslySetInnerHTML={{
                  __html: formData.bodyHtml
                    .replace(/\{\{primeiro_nome\}\}/g, 'João')
                    .replace(/\{\{nome_cliente\}\}/g, 'João Silva')
                    .replace(/\{\{empresa_nome\}\}/g, 'Minha Empresa')
                    .replace(/\{\{subject\}\}/g, formData.subject || 'Assunto')
                    .replace(/\{\{unsubscribe_url\}\}/g, '#'),
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !formData.name || !formData.bodyHtml}
          >
            {isPending ? 'A guardar...' : template ? 'Guardar Alterações' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
