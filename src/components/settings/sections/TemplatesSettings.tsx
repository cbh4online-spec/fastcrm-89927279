import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useTemplates,
  useTemplateFolders,
  useDeleteTemplate,
  useUpdateTemplate,
  Template,
  TemplateType,
  TemplateGoal,
  TemplateFilters,
} from '@/hooks/useTemplates';
import { TemplateEditorDialog } from './templates/TemplateEditorDialog';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Search,
  Plus,
  Mail,
  MessageCircle,
  Instagram,
  FileText,
  Smartphone,
  Star,
  StarOff,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  FolderOpen,
  Filter,
  BarChart3,
  Eye,
  Clock,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function TemplatesSettings() {
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [selectedType, setSelectedType] = useState<TemplateType | 'all'>('all');
  const [selectedGoal, setSelectedGoal] = useState<TemplateGoal | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useTemplates({
    search: searchQuery || undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
    goal: selectedGoal !== 'all' ? selectedGoal : undefined,
    folderId: selectedFolder,
  });
  const { data: folders = [] } = useTemplateFolders();
  const deleteTemplate = useDeleteTemplate();
  const updateTemplate = useUpdateTemplate();

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDuplicate = async (template: Template) => {
    setEditingTemplate({
      ...template,
      id: '',
      name: `${template.name} (cópia)`,
    });
    setEditorOpen(true);
  };

  const handleToggleFavorite = async (template: Template) => {
    await updateTemplate.mutateAsync({
      id: template.id,
      is_favorite: !template.is_favorite,
    });
  };

  const handleDeleteClick = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };

  const renderTemplateCard = (template: Template) => {
    const TypeIcon = typeConfig[template.type].icon;
    
    return (
      <Card key={template.id} className="group hover:shadow-md transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn('p-2 rounded-lg bg-muted', typeConfig[template.type].color)}>
                <TypeIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{template.name}</h4>
                  {template.is_favorite && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {template.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {typeConfig[template.type].label}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {goalLabels[template.goal]}
                  </Badge>
                  {template.tags.slice(0, 2).map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <Tag className="h-2 w-2 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(template)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleFavorite(template)}>
                    {template.is_favorite ? (
                      <>
                        <StarOff className="h-4 w-4 mr-2" />
                        Remover favorito
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        Adicionar favorito
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDeleteClick(template)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{template.usage_count} usos</span>
            </div>
            {template.last_used_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {format(new Date(template.last_used_at), "d MMM", { locale: pt })}
                </span>
              </div>
            )}
            {template.reply_rate !== null && (
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                <span>{template.reply_rate}% resposta</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates</h2>
          <p className="text-muted-foreground">
            Gere os templates de mensagens para Email, WhatsApp, Instagram e propostas.
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
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
            <Select value={selectedGoal} onValueChange={(v) => setSelectedGoal(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Objetivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os objetivos</SelectItem>
                {Object.entries(goalLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {folders.length > 0 && (
              <Select 
                value={selectedFolder || 'all'} 
                onValueChange={(v) => setSelectedFolder(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[150px]">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Pasta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as pastas</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: folder.color }}
                        />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(typeConfig).map(([key, config]) => {
          const count = templates.filter(t => t.type === key).length;
          return (
            <Card 
              key={key}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedType === key && 'ring-2 ring-primary'
              )}
              onClick={() => setSelectedType(selectedType === key ? 'all' : key as TemplateType)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <config.icon className={cn('h-5 w-5', config.color)} />
                  <div>
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">{config.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Templates List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            Todos ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="h-4 w-4 mr-1" />
            Favoritos ({templates.filter(t => t.is_favorite).length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="h-4 w-4 mr-1" />
            Recentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24" />
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">Nenhum template encontrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || selectedType !== 'all' || selectedGoal !== 'all'
                    ? 'Tenta ajustar os filtros de pesquisa.'
                    : 'Cria o teu primeiro template para começar.'}
                </p>
                {!searchQuery && selectedType === 'all' && (
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {templates.map(renderTemplateCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          <div className="grid gap-3">
            {templates.filter(t => t.is_favorite).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum template favorito</p>
                </CardContent>
              </Card>
            ) : (
              templates.filter(t => t.is_favorite).map(renderTemplateCard)
            )}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <div className="grid gap-3">
            {templates
              .filter(t => t.last_used_at)
              .sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())
              .slice(0, 10)
              .map(renderTemplateCard)}
            {templates.filter(t => t.last_used_at).length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum template usado recentemente</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Editor Dialog */}
      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres eliminar "{templateToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
