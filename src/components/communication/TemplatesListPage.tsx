import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Mail, 
  MessageCircle, 
  Inbox, 
  StickyNote,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Eye,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useCommunicationTemplates, useDeleteCommunicationTemplate, useUpdateCommunicationTemplate } from '@/hooks/useCommunicationTemplates';
import { 
  CommunicationTemplate, 
  TemplateChannel,
  CHANNEL_LABELS,
  JOURNEY_CONTEXT_LABELS,
  TONE_LABELS
} from '@/types/communicationTemplate';
import { TemplateFormDialog } from './TemplateFormDialog';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';

const CHANNEL_ICONS: Record<TemplateChannel, React.ElementType> = {
  email: Mail,
  whatsapp: MessageCircle,
  inbox: Inbox,
  note: StickyNote
};

export function TemplatesListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<TemplateChannel | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CommunicationTemplate | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);

  const { data: templates, isLoading } = useCommunicationTemplates(
    channelFilter !== 'all' ? { channel: channelFilter } : undefined
  );
  const deleteTemplate = useDeleteCommunicationTemplate();
  const updateTemplate = useUpdateCommunicationTemplate();

  const filteredTemplates = templates?.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleActive = (template: CommunicationTemplate) => {
    updateTemplate.mutate({ id: template.id, isActive: !template.isActive });
  };

  const handleDuplicate = (template: CommunicationTemplate) => {
    setEditingTemplate({
      ...template,
      id: '',
      name: `${template.name} (cópia)`
    });
    setShowCreateDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates de Comunicação</h1>
          <p className="text-muted-foreground">
            Crie e gira mensagens reutilizáveis para a jornada do cliente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAIDialog(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Criar com IA
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as TemplateChannel | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os canais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="inbox">Inbox</SelectItem>
            <SelectItem value="note">Nota Interna</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sem templates</h3>
            <p className="text-muted-foreground mb-4">
              Crie o seu primeiro template para começar
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates?.map(template => {
            const ChannelIcon = CHANNEL_ICONS[template.channel];
            
            return (
              <Card key={template.id} className={!template.isActive ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ChannelIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {CHANNEL_LABELS[template.channel]} • {TONE_LABELS[template.tone]}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Pré-visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditingTemplate(template);
                          setShowCreateDialog(true);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteTemplate.mutate(template.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Journey contexts */}
                  <div className="flex flex-wrap gap-1">
                    {template.journeyContexts.slice(0, 3).map(ctx => (
                      <Badge key={ctx} variant="secondary" className="text-xs">
                        {JOURNEY_CONTEXT_LABELS[ctx]}
                      </Badge>
                    ))}
                    {template.journeyContexts.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.journeyContexts.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.body.substring(0, 100)}...
                  </p>

                  {/* Stats & Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>{template.usageCount} usos</span>
                      {template.responseRate && (
                        <span>• {template.responseRate.toFixed(0)}% resposta</span>
                      )}
                    </div>
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <TemplateFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        template={editingTemplate}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingTemplate(null);
        }}
      />

      {previewTemplate && (
        <TemplatePreviewDialog
          open={!!previewTemplate}
          onOpenChange={(open) => !open && setPreviewTemplate(null)}
          template={previewTemplate}
        />
      )}
    </div>
  );
}
