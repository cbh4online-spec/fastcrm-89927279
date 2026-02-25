import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  BarChart3,
  GitBranch,
  Brain,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Toolbar } from '@/components/common/Toolbar';
import { FilterSidebar, FilterGroup } from '@/components/common/FilterSidebar';
import { useCommunicationTemplates, useDeleteCommunicationTemplate, useUpdateCommunicationTemplate } from '@/hooks/useCommunicationTemplates';
import { useWorkspaceTemplateStats, useTemplateVariants } from '@/hooks/usePredictiveTemplates';
import { useStructureLengthStats } from '@/hooks/useMessageLength';
import { 
  CommunicationTemplate, 
  TemplateChannel,
  CHANNEL_LABELS,
  JOURNEY_CONTEXT_LABELS,
  TONE_LABELS,
  STRUCTURE_LABELS
} from '@/types/communicationTemplate';
import { TemplateFormDialog } from './TemplateFormDialog';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';
import { SendEmailFromTemplateDialog } from './SendEmailFromTemplateDialog';
import { AITemplateGeneratorDialog } from './AITemplateGeneratorDialog';
import { TemplateLibraryDialog } from './TemplateLibraryDialog';
import type { LibraryTemplate } from './templateLibraryData';
import { BookOpen } from 'lucide-react';

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
  { value: 'conversion_desc', label: 'Maior Conversão' },
  { value: 'score_desc', label: 'Melhor Score' },
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
  const [showLibraryDialog, setShowLibraryDialog] = useState(false);
  const [activePageTab, setActivePageTab] = useState('templates');
  const [selectedStatsTemplate, setSelectedStatsTemplate] = useState<string | undefined>();
  
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
  const { data: allStats } = useWorkspaceTemplateStats();
  const { data: selectedVariants } = useTemplateVariants(selectedStatsTemplate);
  const { data: lengthStats } = useStructureLengthStats();
  const [lengthChannelFilter, setLengthChannelFilter] = useState<string>('all');

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
        { id: 'status_dynamic', label: 'Dinâmicos' },
        { id: 'status_predictive', label: 'Preditivos' },
      ],
    },
  ];

  // Stats calculation
  const stats = useMemo(() => {
    if (!templates) return { total: 0, active: 0, byChannel: {}, avgUsage: 0, avgConversion: 0, avgScore: 0 };
    
    const active = templates.filter(t => t.isActive).length;
    const byChannel = templates.reduce((acc, t) => {
      acc[t.channel] = (acc[t.channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const avgUsage = templates.length > 0 
      ? templates.reduce((sum, t) => sum + t.usageCount, 0) / templates.length 
      : 0;
    const templatesWithUsage = templates.filter(t => t.usageCount > 0);
    const avgConversion = templatesWithUsage.length > 0
      ? templatesWithUsage.reduce((sum, t) => sum + ((t.conversionCount || 0) / t.usageCount) * 100, 0) / templatesWithUsage.length
      : 0;
    
    // Average score from stats
    const avgScore = allStats && allStats.length > 0
      ? allStats.reduce((sum, s) => sum + (s.score || 0), 0) / allStats.length
      : 0;

    return { total: templates.length, active, byChannel, avgUsage, avgConversion, avgScore };
  }, [templates, allStats]);

  // Get stats map by template_id
  const statsMap = useMemo(() => {
    if (!allStats) return {};
    const map: Record<string, { score: number; weightedScore: number; replyRate: number; oppRate: number; winRate: number; stageProgression: number; samples: number }> = {};
    for (const s of allStats) {
      const ws = s.weighted_score ?? s.score;
      if (!map[s.template_id] || ws > map[s.template_id].weightedScore) {
        map[s.template_id] = { 
          score: s.score,
          weightedScore: ws,
          replyRate: s.reply_rate, 
          oppRate: s.opportunity_rate,
          winRate: s.win_rate,
          stageProgression: s.stage_progression_rate ?? 0,
          samples: s.samples 
        };
      }
    }
    return map;
  }, [allStats]);

  // Filtered and sorted templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    
    let result = [...templates];
    
    if (searchValue) {
      const query = searchValue.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.body.toLowerCase().includes(query)
      );
    }

    if (activeFilterId) {
      if (activeFilterId.startsWith('channel_')) {
        const channel = activeFilterId.replace('channel_', '');
        result = result.filter(t => t.channel === channel);
      } else if (activeFilterId === 'status_active') {
        result = result.filter(t => t.isActive);
      } else if (activeFilterId === 'status_inactive') {
        result = result.filter(t => !t.isActive);
      } else if (activeFilterId === 'status_dynamic') {
        result = result.filter(t => t.isDynamic);
      } else if (activeFilterId === 'status_predictive') {
        result = result.filter(t => t.personalizationLevel === 'predictive');
      }
    }

    result.sort((a, b) => {
      switch (sortValue) {
        case 'updated_desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'updated_asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'usage_desc':
          return b.usageCount - a.usageCount;
        case 'conversion_desc': {
          const aRate = a.usageCount > 0 ? (a.conversionCount || 0) / a.usageCount : 0;
          const bRate = b.usageCount > 0 ? (b.conversionCount || 0) / b.usageCount : 0;
          return bRate - aRate;
        }
        case 'score_desc': {
          const aScore = statsMap[a.id]?.score || 0;
          const bScore = statsMap[b.id]?.score || 0;
          return bScore - aScore;
        }
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [templates, searchValue, activeFilterId, sortValue, statsMap]);

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
    await queryClient.invalidateQueries({ queryKey: ['workspace-template-stats'] });
    setIsRefreshing(false);
  }, [queryClient]);

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
          description="Crie e gira mensagens reutilizáveis com IA preditiva"
          actions={[
            {
              label: 'Biblioteca',
              icon: <BookOpen className="h-4 w-4" />,
              onClick: () => setShowLibraryDialog(true),
              variant: 'outline',
            },
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

        {/* Page Tabs */}
        <Tabs value={activePageTab} onValueChange={setActivePageTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="templates" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="learning" className="gap-1.5">
              <Brain className="h-4 w-4" />
              Treino do Workspace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4 space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold">{stats.total}</p>}
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
                      {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold">{stats.active}</p>}
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
                      <p className="text-xs text-muted-foreground">Conversão</p>
                      {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold">{stats.avgConversion.toFixed(1)}%</p>}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Score Médio</p>
                      {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold">{(stats.avgScore * 100).toFixed(0)}%</p>}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Uso Médio</p>
                      {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold">{stats.avgUsage.toFixed(0)}</p>}
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
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              }
            />

            {/* Templates Grid */}
            <div className="flex-1">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48" />)}
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
                    const tStats = statsMap[template.id];
                    
                    return (
                      <Card key={template.id} className={`${!template.isActive ? 'opacity-60' : ''} hover:shadow-md transition-all`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <ChannelIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base flex items-center gap-1.5">
                                  {template.name}
                                  {template.personalizationLevel === 'predictive' && (
                                    <Brain className="h-3.5 w-3.5 text-purple-500" />
                                  )}
                                  {template.isDynamic && (
                                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  {CHANNEL_LABELS[template.channel]} • {TONE_LABELS[template.tone]}
                                  {template.structureType && template.structureType !== 'custom' && ` • ${STRUCTURE_LABELS[template.structureType]}`}
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
                                <DropdownMenuItem onClick={() => {
                                  setSelectedStatsTemplate(template.id);
                                  setActivePageTab('performance');
                                }}>
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  Ver Performance
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
                          <div className="flex flex-wrap gap-1">
                            {template.journeyContexts.slice(0, 3).map(ctx => (
                              <Badge key={ctx} variant="secondary" className="text-xs">
                                {JOURNEY_CONTEXT_LABELS[ctx]}
                              </Badge>
                            ))}
                            {template.journeyContexts.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{template.journeyContexts.length - 3}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.body.substring(0, 100)}...
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              <span>{template.usageCount} usos</span>
                              {template.usageCount > 0 && (
                                <span>• {((template.conversionCount || 0) / template.usageCount * 100).toFixed(0)}% conv.</span>
                              )}
                              {tStats && tStats.samples > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-[10px] py-0 gap-0.5">
                                        <Brain className="h-2.5 w-2.5" />
                                        {(tStats.weightedScore * 100).toFixed(0)}%
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      <div className="space-y-0.5">
                                        <div>Win Rate: {(tStats.winRate * 100).toFixed(1)}%</div>
                                        <div>Opp Rate: {(tStats.oppRate * 100).toFixed(1)}%</div>
                                        <div>Stage Prog: {(tStats.stageProgression * 100).toFixed(1)}%</div>
                                        <div>Reply Rate: {(tStats.replyRate * 100).toFixed(1)}%</div>
                                        <div className="text-muted-foreground">{tStats.samples} amostras</div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                  <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Performance por Template</h3>
              {selectedStatsTemplate && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedStatsTemplate(undefined)}>
                  Ver Todos
                </Button>
              )}
            </div>

            {!allStats || allStats.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sem dados de performance</h3>
                  <p className="text-muted-foreground">
                    Os dados aparecem após os templates serem usados e receberem respostas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {(selectedStatsTemplate 
                  ? allStats.filter(s => s.template_id === selectedStatsTemplate) 
                  : allStats
                ).map(stat => {
                  const tpl = templates?.find(t => t.id === stat.template_id);
                  return (
                    <Card key={stat.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">{tpl?.name || 'Template'}</span>
                              {stat.variant_id && (
                                <Badge variant="outline" className="text-[10px] py-0 gap-0.5">
                                  <GitBranch className="h-2.5 w-2.5" />
                                  Variante
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px] py-0">{stat.channel}</Badge>
                              {stat.tone && <Badge variant="outline" className="text-[10px] py-0">{stat.tone}</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-bold text-primary">{((stat.weighted_score ?? stat.score) * 100).toFixed(1)}%</div>
                              <div className="text-[10px] text-muted-foreground">W.Score</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold">{(stat.win_rate * 100).toFixed(1)}%</div>
                              <div className="text-[10px] text-muted-foreground">Win</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold">{(stat.opportunity_rate * 100).toFixed(1)}%</div>
                              <div className="text-[10px] text-muted-foreground">Oportunidade</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold">{((stat.stage_progression_rate ?? 0) * 100).toFixed(1)}%</div>
                              <div className="text-[10px] text-muted-foreground">Progressão</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold">{(stat.reply_rate * 100).toFixed(1)}%</div>
                              <div className="text-[10px] text-muted-foreground">Reply</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold">{stat.samples}</div>
                              <div className="text-[10px] text-muted-foreground">Amostras</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Variants for selected template */}
            {selectedStatsTemplate && selectedVariants && selectedVariants.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4" />
                  Variantes ({selectedVariants.length})
                </h4>
                {selectedVariants.map(v => (
                  <Card key={v.id} className="border-dashed">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{v.variant_key}</span>
                        <Badge variant="outline" className="text-[10px]">{v.tone}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{v.body.substring(0, 120)}...</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Length Performance Matrix */}
            {lengthStats && lengthStats.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-1.5">
                    📏 Por Comprimento (Estrutura × Length × Canal)
                  </h4>
                  <Select value={lengthChannelFilter} onValueChange={setLengthChannelFilter}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  {(() => {
                    const filtered = lengthChannelFilter === 'all'
                      ? lengthStats
                      : lengthStats.filter(s => s.channel === lengthChannelFilter);

                    // Group by structure_key
                    const grouped: Record<string, typeof filtered> = {};
                    for (const s of filtered) {
                      if (!grouped[s.structure_key]) grouped[s.structure_key] = [];
                      grouped[s.structure_key].push(s);
                    }

                    return Object.entries(grouped).map(([structKey, items]) => (
                      <Card key={structKey} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-medium text-sm">{structKey}</span>
                            <Badge variant="secondary" className="text-[10px] py-0">
                              {items.reduce((sum, i) => sum + i.samples, 0)} amostras
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {['short', 'medium', 'long'].map(len => {
                              const stat = items.find(i => i.chosen_length === len);
                              const label = len === 'short' ? 'Curto' : len === 'long' ? 'Longo' : 'Médio';
                              return (
                                <div key={len} className={`rounded-lg border p-2 text-center ${stat ? 'bg-muted/30' : 'opacity-40'}`}>
                                  <div className="text-[10px] font-medium text-muted-foreground mb-1">{label}</div>
                                  {stat ? (
                                    <div className="space-y-0.5">
                                      <div className="text-sm font-bold text-primary">{(stat.score * 100).toFixed(1)}%</div>
                                      <div className="text-[10px] text-muted-foreground">Win: {(stat.win_rate * 100).toFixed(1)}%</div>
                                      <div className="text-[10px] text-muted-foreground">Opp: {(stat.opportunity_rate * 100).toFixed(1)}%</div>
                                      <div className="text-[10px] text-muted-foreground">{stat.samples} amostras</div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-muted-foreground">—</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ));
                  })()}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Learning Tab */}
          <TabsContent value="learning" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Treino do Workspace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  O sistema de aprendizagem analisa automaticamente a performance dos templates e variantes 
                  para recomendar a melhor versão em cada contexto.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border bg-muted/30 text-center">
                    <div className="text-2xl font-bold text-primary">{allStats?.length || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">Combinações rastreadas</div>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {allStats?.reduce((sum, s) => sum + s.samples, 0) || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Total de amostras</div>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {allStats && allStats.length > 0
                        ? (allStats.reduce((sum, s) => sum + (s.reply_rate || 0), 0) / allStats.length * 100).toFixed(1)
                        : '0'}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Reply Rate Médio</div>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {allStats && allStats.filter(s => s.samples >= 50).length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Com dados suficientes (≥50)</div>
                  </div>
                </div>
                <div className="rounded-lg border p-3 bg-primary/5">
                  <div className="text-xs font-medium mb-1 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-primary" />
                    Multi-Armed Bandit
                  </div>
                  <p className="text-xs text-muted-foreground">
                    80% das vezes usa a variante com melhor weighted score (Win 45% + Opp 35% + Reply 10% + Progressão 10%). 
                    20% testa alternativas. Com menos de 50 amostras, exploração a 30%.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

      <SendEmailFromTemplateDialog
        open={!!sendEmailTemplate}
        onOpenChange={(open) => !open && setSendEmailTemplate(null)}
        template={sendEmailTemplate}
      />

      <AITemplateGeneratorDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        onGenerated={(generated) => {
          setEditingTemplate(generated as CommunicationTemplate);
          setShowCreateDialog(true);
        }}
      />

      <TemplateLibraryDialog
        open={showLibraryDialog}
        onOpenChange={setShowLibraryDialog}
        onSelectTemplate={(libTemplate: LibraryTemplate) => {
          setEditingTemplate({
            id: '',
            workspaceId: '',
            name: libTemplate.name,
            channel: libTemplate.channel,
            language: 'pt',
            journeyContexts: [],
            subject: libTemplate.subject,
            body: libTemplate.body,
            tone: libTemplate.tone,
            structureType: libTemplate.structureType,
            isActive: true,
            usageCount: 0,
            conversionCount: 0,
            isDynamic: false,
            dynamicRules: {},
            personalizationLevel: 'basic',
            structureFamilies: [],
            brandConstraints: {},
            maxLengthByChannel: {},
            createdBy: '',
            createdAt: '',
            updatedAt: '',
          } as CommunicationTemplate);
          setShowCreateDialog(true);
        }}
      />
    </div>
  );
}
