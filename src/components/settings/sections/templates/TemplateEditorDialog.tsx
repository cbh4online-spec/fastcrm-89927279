import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useCreateTemplate,
  useUpdateTemplate,
  useTemplateVersions,
  Template,
  TemplateType,
  TemplateGoal,
  TemplateTone,
} from '@/hooks/useTemplates';
import { TemplateVariablePicker } from '@/components/templates/TemplateVariablePicker';
import { RichTemplateEditor } from './RichTemplateEditor';
import { TemplatePreview } from './TemplatePreview';
import { TemplateVersionHistory } from './TemplateVersionHistory';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Mail,
  MessageCircle,
  Instagram,
  FileText,
  Smartphone,
  Save,
  X,
  Eye,
  History,
  Variable,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}

const typeConfig: Record<TemplateType, { label: string; icon: React.ElementType; color: string }> = {
  email: { label: 'Email', icon: Mail, color: 'text-blue-500' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
  instagram_dm: { label: 'Instagram DM', icon: Instagram, color: 'text-pink-500' },
  proposal: { label: 'Proposta', icon: FileText, color: 'text-purple-500' },
  sms: { label: 'SMS', icon: Smartphone, color: 'text-amber-500' },
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

const compatibleModulesOptions = [
  { value: 'lead', label: 'Leads' },
  { value: 'opportunity', label: 'Oportunidades' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'contact', label: 'Contactos' },
  { value: 'company', label: 'Empresas' },
];

export function TemplateEditorDialog({ open, onOpenChange, template }: TemplateEditorDialogProps) {
  const isEditing = template?.id ? true : false;
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const { data: versions = [] } = useTemplateVersions(template?.id || null);

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'history'>('edit');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TemplateType>('email');
  const [goal, setGoal] = useState<TemplateGoal>('other');
  const [tone, setTone] = useState<TemplateTone>('friendly');
  const [language, setLanguage] = useState('pt');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [richContent, setRichContent] = useState<any>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [compatibleModules, setCompatibleModules] = useState<string[]>(['lead', 'opportunity', 'inbox']);
  const [requiredVariables, setRequiredVariables] = useState<string[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setType(template.type);
      setGoal(template.goal);
      setTone(template.tone);
      setLanguage(template.language);
      setSubject(template.subject || '');
      setContent(template.content);
      setRichContent(template.rich_content);
      setTags(template.tags || []);
      setCompatibleModules(template.compatible_modules || []);
      setRequiredVariables(template.required_variables || []);
    } else {
      resetForm();
    }
  }, [template, open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('email');
    setGoal('other');
    setTone('friendly');
    setLanguage('pt');
    setSubject('');
    setContent('');
    setRichContent(null);
    setTags([]);
    setCompatibleModules(['lead', 'opportunity', 'inbox']);
    setRequiredVariables([]);
    setActiveTab('edit');
  };

  const handleInsertVariable = (variable: string) => {
    setContent(prev => prev + variable);
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleToggleModule = (module: string) => {
    setCompatibleModules(prev => 
      prev.includes(module) 
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

  // Detect required variables from content
  useEffect(() => {
    const matches = content.match(/\{\{[^}]+\}\}/g) || [];
    setRequiredVariables([...new Set(matches)]);
  }, [content]);

  const handleSave = async () => {
    if (!name || !content) return;

    const templateData = {
      name,
      description: description || null,
      type,
      goal,
      tone,
      language,
      subject: type === 'email' ? subject : null,
      content,
      rich_content: type === 'proposal' ? richContent : null,
      tags,
      compatible_modules: compatibleModules,
      required_variables: requiredVariables,
    };

    if (isEditing && template?.id) {
      await updateTemplate.mutateAsync({
        id: template.id,
        ...templateData,
        createVersion: true,
      });
    } else {
      await createTemplate.mutateAsync(templateData);
    }

    onOpenChange(false);
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? 'Editar Template' : 'Novo Template'}
              {type && (
                <Badge variant="outline" className={cn('ml-2', typeConfig[type].color)}>
                  {React.createElement(typeConfig[type].icon, { className: 'h-3 w-3 mr-1' })}
                  {typeConfig[type].label}
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !name || !content}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? 'Guardar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b shrink-0">
            <TabsList className="h-10">
              <TabsTrigger value="edit">Editar</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-1" />
                Pré-visualizar
              </TabsTrigger>
              {isEditing && (
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-1" />
                  Histórico ({versions.length})
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="edit" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome do Template *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Follow-up após reunião"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Descrição</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Breve descrição do uso deste template"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={type} onValueChange={(v) => setType(v as TemplateType)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className={cn('h-4 w-4', config.color)} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Objetivo</Label>
                    <Select value={goal} onValueChange={(v) => setGoal(v as TemplateGoal)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(goalLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tom</Label>
                    <Select value={tone} onValueChange={(v) => setTone(v as TemplateTone)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(toneLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Idioma</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt">Português</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Compatible Modules */}
                <div>
                  <Label>Módulos compatíveis</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {compatibleModulesOptions.map((mod) => (
                      <Badge
                        key={mod.value}
                        variant={compatibleModules.includes(mod.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleToggleModule(mod.value)}
                      >
                        {mod.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label>Tags</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Adicionar tag..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleAddTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject (for email) */}
                {type === 'email' && (
                  <div>
                    <Label>Assunto do Email</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Sobre a nossa conversa..."
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Content Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Conteúdo *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" size="sm" variant="outline">
                          <Variable className="h-4 w-4 mr-2" />
                          Inserir Variável
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="end">
                        <TemplateVariablePicker
                          onInsert={handleInsertVariable}
                          compatibleModules={compatibleModules}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {type === 'proposal' ? (
                    <RichTemplateEditor
                      value={richContent}
                      onChange={setRichContent}
                      textContent={content}
                      onTextChange={setContent}
                    />
                  ) : (
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Escreve o teu template aqui. Usa variáveis como {{lead.first_name}} para personalização..."
                      className="min-h-[200px] font-mono text-sm"
                    />
                  )}
                </div>

                {/* Required Variables Detection */}
                {requiredVariables.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-xs">Variáveis detetadas</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {requiredVariables.map((v) => (
                        <Badge key={v} variant="outline" className="font-mono text-xs">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 m-0 min-h-0">
            <TemplatePreview
              type={type}
              subject={subject}
              content={content}
              richContent={richContent}
              device={previewDevice}
              onDeviceChange={setPreviewDevice}
            />
          </TabsContent>

          {isEditing && (
            <TabsContent value="history" className="flex-1 m-0 min-h-0">
              <TemplateVersionHistory
                versions={versions}
                currentContent={content}
                onRestore={(version) => {
                  setContent(version.content);
                  setRichContent(version.rich_content);
                  setSubject(version.subject || '');
                  setActiveTab('edit');
                }}
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
