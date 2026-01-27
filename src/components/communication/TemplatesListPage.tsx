import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
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
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Toolbar } from '@/components/common/Toolbar';
import { FilterSidebar, FilterGroup } from '@/components/common/FilterSidebar';
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
import { SendEmailFromTemplateDialog } from './SendEmailFromTemplateDialog';

const CHANNEL_ICONS: Record<TemplateChannel, React.ElementType> = {
  email: Mail,
  whatsapp: MessageCircle,
  inbox: Inbox,
  note: StickyNote
};

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const sortOptions = [
  { value: 'updated_desc', label: 'Mais recentes' },
  { value: 'updated_asc', label: 'Mais antigos' },
  { value: 'usage_desc', label: 'Mais usados' },
  { value: 'name_asc', label: 'Nome (A-Z)' },
];

export function TemplatesListPage() {
  const queryClient = useQueryClient();
  const [channelFilter, setChannelFilter] = useState<TemplateChannel | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CommunicationTemplate | null>(null);
  const [sendEmailTemplate, setSendEmailTemplate] = useState<CommunicationTemplate | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  
  // New UI state
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState('updated_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: templates, isLoading } = useCommunicationTemplates(
    channelFilter !== 'all' ? { channel: channelFilter } : undefined
  );
  const deleteTemplate = useDeleteCommunicationTemplate();
  const updateTemplate = useUpdateCommunicationTemplate();

  // Filter groups for sidebar
  const filterGroups: FilterGroup[] = [
    {
      id: 'channel',
      label: 'Canal',
      icon: <MessageCircle className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: 'channel_email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
        { id: 'channel_whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-4 w-4" /> },
        { id: 'channel_inbox', label: 'Inbox', icon: <Inbox className="h-4 w-4" /> },
        { id: 'channel_note', label: 'Nota Interna', icon: <StickyNote className="h-4 w-4" /> },
      ],
    },
    {
      id: 'status',
      label: 'Estado',
      icon: <Zap className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: 'status_active', label: 'Ativos' },
        { id: 'status_inactive', label: 'Inativos' },
      ],
    },
  ];

  // Stats calculation
  const stats = useMemo(() => {
    if (!templates) return { total: 0, active: 0, byChannel: {}, avgUsage: 0 };
    
    const active = templates.filter(t => t.isActive).length;
    const byChannel = templates.reduce((acc, t) => {
      acc[t.channel] = (acc[t.channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const avgUsage = templates.length > 0 
      ? templates.reduce((sum, t) => sum + t.usageCount, 0) / templates.length 
      : 0;

    return { total: templates.length, active, byChannel, avgUsage };
  }, [templates]);

  // Filtered and sorted templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    
    let result = [...templates];
    
    // Search filter
    if (searchValue) {
      const query = searchValue.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.body.toLowerCase().includes(query)
      );
    }

    // Filter by activeFilterId
    if (activeFilterId) {
      if (activeFilterId.startsWith('channel_')) {
        const channel = activeFilterId.replace('channel_', '');
        result = result.filter(t => t.channel === channel);
      } else if (activeFilterId === 'status_active') {
        result = result.filter(t => t.isActive);
      } else if (activeFilterId === 'status_inactive') {
        result = result.filter(t => !t.isActive);
      }
    }

    // Sort
    result.sort((a, b) => {
      switch (sortValue) {
        case 'updated_desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'updated_asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'usage_desc':
          return b.usageCount - a.usageCount;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [templates, searchValue, activeFilterId, sortValue]);

  // Pagination
  const totalTemplates = filteredTemplates.length;
  const totalPages = Math.ceil(totalTemplates / pageSize);
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTemplates.slice(start, start + pageSize);
  }, [filteredTemplates, currentPage, pageSize]);

  const filtersActive = !!activeFilterId || channelFilter !== 'all';

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

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId === activeFilterId ? undefined : filterId);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setActiveFilterId(undefined);
    setChannelFilter('all');
    setCurrentPage(1);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
    setIsRefreshing(false);
  }, [queryClient]);

  // Page tabs
  const pageTabs = [
    { id: 'templates', label: 'Templates', count: stats.total },
    { id: 'ai', label: 'Gerador IA', icon: <Sparkles className="h-4 w-4" /> },
  ];

  return (
    <div className="flex h-full -m-6">
      {/* Filter Sidebar */}
      <FilterSidebar
        filterGroups={filterGroups}
        activeFilterId={activeFilterId}
        onFilterSelect={handleFilterSelect}
        onClearFilter={handleClearFilters}
        isOpen={showFilterSidebar}
        onClose={() => setShowFilterSidebar(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 p-6">
        {/* Page Header */}
        <PageHeader
          title="Templates de Comunicação"
          count={stats.total}
          description="Crie e gira mensagens reutilizáveis para a jornada do cliente"
          actions={[
            {
              label: 'Criar com IA',
              icon: <Sparkles className="h-4 w-4" />,
              onClick: () => setShowAIDialog(true),
              variant: 'outline',
            },
            {
              label: 'Novo Template',
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setShowCreateDialog(true),
            },
          ]}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.total}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.active}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Emails</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.byChannel.email || 0}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Uso Médio</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.avgUsage.toFixed(0)}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder="Pesquisar templates..."
          onSearchChange={(v) => { setSearchValue(v); setCurrentPage(1); }}
          showFilters={true}
          filtersActive={filtersActive}
          onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
          onClearFilters={handleClearFilters}
          sortOptions={sortOptions}
          sortValue={sortValue}
          onSortChange={setSortValue}
          rightActions={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          }
          className="mt-4"
        />

        {/* Templates Grid */}
        <div className="flex-1 mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : paginatedTemplates.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchValue ? 'Nenhum template encontrado' : 'Sem templates'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchValue ? 'Tente uma pesquisa diferente' : 'Crie o seu primeiro template para começar'}
                </p>
                {!searchValue && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedTemplates.map(template => {
                const ChannelIcon = CHANNEL_ICONS[template.channel];
                
                return (
                  <Card key={template.id} className={`${!template.isActive ? 'opacity-60' : ''} hover:shadow-md transition-all`}>
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
                            {template.channel === 'email' && (
                              <DropdownMenuItem onClick={() => setSendEmailTemplate(template)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Enviar Email
                              </DropdownMenuItem>
                            )}
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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostrar</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>por página ({totalTemplates} total)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

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

      {/* Send Email Dialog */}
      <SendEmailFromTemplateDialog
        open={!!sendEmailTemplate}
        onOpenChange={(open) => !open && setSendEmailTemplate(null)}
        template={sendEmailTemplate}
      />
    </div>
  );
}
