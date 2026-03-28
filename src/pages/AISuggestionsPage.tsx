import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles, Tag, FileText, Zap, Check, X, ChevronDown,
  Loader2, Target, Users, Building2, Briefcase,
  TrendingUp, Clock, CheckCircle2, Brain, Settings,
  Filter, ArrowUpDown, Trash2, CheckSquare, Eye,
  BarChart3, Activity, AlertCircle, ExternalLink,
  ChevronRight, Search, SlidersHorizontal, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAISuggestionsHub,
  useSuggestionHubStats,
  useAcceptSuggestionHub,
  useDismissSuggestionHub,
  useGenerateSuggestionsHub,
} from '@/hooks/useAISuggestions';
import type { AISuggestion, SuggestionType, SuggestionEntityType } from '@/types/ai-suggestions';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

// ============================================================================
// CONSTANTS
// ============================================================================

const ENTITY_ICONS: Record<string, typeof Target> = {
  lead: Target,
  contact: Users,
  company: Building2,
  opportunity: Briefcase,
};

const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead',
  contact: 'Contacto',
  company: 'Empresa',
  opportunity: 'Oportunidade',
};

const ENTITY_COLORS: Record<string, string> = {
  lead: 'bg-blue-500/10 text-blue-600 border-blue-200',
  contact: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  company: 'bg-violet-500/10 text-violet-600 border-violet-200',
  opportunity: 'bg-amber-500/10 text-amber-600 border-amber-200',
};

const TYPE_CONFIG: Record<SuggestionType, { icon: typeof Tag; label: string; color: string }> = {
  tag: { icon: Tag, label: 'Tag', color: 'bg-primary/10 text-primary' },
  field_value: { icon: FileText, label: 'Campo', color: 'bg-accent/10 text-accent-foreground' },
  automation: { icon: Zap, label: 'Automação', color: 'bg-amber-500/10 text-amber-600' },
};

type SortMode = 'confidence' | 'date' | 'type';

// ============================================================================
// STATS CARDS
// ============================================================================

function StatsBar({ stats }: { stats: { total_pending: number; tags_pending: number; fields_pending: number; automations_pending: number; accepted_last_7_days: number; dismissed_last_7_days: number } }) {
  const items = [
    { label: 'Pendentes', value: stats.total_pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Tags', value: stats.tags_pending, icon: Tag, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Campos', value: stats.fields_pending, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Automações', value: stats.automations_pending, icon: Zap, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Aceites (7d)', value: stats.accepted_last_7_days, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Ignoradas (7d)', value: stats.dismissed_last_7_days, icon: X, color: 'text-muted-foreground', bg: 'bg-muted' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', item.bg)}>
                <Icon className={cn('h-4 w-4', item.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{item.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// CONFIDENCE INDICATOR
// ============================================================================

function ConfidenceIndicator({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? 'text-emerald-500' : pct >= 70 ? 'text-amber-500' : 'text-destructive';
  const bg = pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-destructive';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', bg)} style={{ width: `${pct}%` }} />
            </div>
            <span className={cn('text-xs font-semibold tabular-nums', color)}>{pct}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>Confiança da IA: {pct}%</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// UNIFIED SUGGESTION CARD (Advanced)
// ============================================================================

function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  selected,
  onToggleSelect,
}: {
  suggestion: AISuggestion;
  onAccept: () => void;
  onDismiss: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const EntityIcon = ENTITY_ICONS[suggestion.entity_type || ''] || Target;
  const typeConfig = TYPE_CONFIG[suggestion.suggestion_type] || TYPE_CONFIG.tag;
  const TypeIcon = typeConfig.icon;

  const timeAgo = suggestion.created_at
    ? formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true, locale: pt })
    : '';

  // Build summary based on type
  let summary = '';
  let detail = '';
  if (suggestion.suggestion_type === 'tag') {
    summary = suggestion.tag_value || 'Tag';
  } else if (suggestion.suggestion_type === 'field_value') {
    summary = suggestion.field_name || 'Campo';
    const val = suggestion.suggested_value;
    detail = val === null || val === undefined ? '—' : typeof val === 'object' ? JSON.stringify(val) : String(val);
  } else if (suggestion.suggestion_type === 'automation') {
    summary = suggestion.automation_title || 'Automação';
    detail = suggestion.automation_description || '';
  }

  const isAutomation = suggestion.suggestion_type === 'automation';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
    >
      <Card className={cn(
        'transition-all duration-200 hover:shadow-md group',
        selected && 'ring-2 ring-primary/50 border-primary/30',
      )}>
        <CardContent className="p-0">
          {/* Main Row */}
          <div className="flex items-start gap-3 p-4">
            {/* Checkbox */}
            <div className="pt-0.5">
              <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
            </div>

            {/* Type icon */}
            <div className={cn('p-2 rounded-lg shrink-0', typeConfig.color)}>
              <TypeIcon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{summary}</span>
                {suggestion.suggestion_type === 'field_value' && detail && (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-primary truncate max-w-[200px]">{detail}</span>
                  </>
                )}
                {suggestion.suggestion_type === 'tag' && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">
                    {suggestion.tag_value}
                  </Badge>
                )}
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap">
                {suggestion.entity_type && (
                  <Badge variant="outline" className={cn('text-[10px] gap-1 border', ENTITY_COLORS[suggestion.entity_type] || '')}>
                    <EntityIcon className="h-3 w-3" />
                    {ENTITY_LABELS[suggestion.entity_type] || suggestion.entity_type}
                  </Badge>
                )}
                {suggestion.field_type && (
                  <Badge variant="secondary" className="text-[10px]">{suggestion.field_type}</Badge>
                )}
                {isAutomation && suggestion.automation_trigger && (
                  <Badge variant="outline" className="text-[10px]">
                    Trigger: {(suggestion.automation_trigger as any).event || 'evento'}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {timeAgo}
                </span>
              </div>

              {/* Automation description */}
              {isAutomation && detail && (
                <p className="text-xs text-muted-foreground line-clamp-2">{detail}</p>
              )}
            </div>

            {/* Right side */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <ConfidenceIndicator value={suggestion.confidence} />
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={isAutomation ? () => navigate(`/dashboard/automations?suggestion_id=${suggestion.id}`) : onAccept}
                      >
                        {isAutomation ? <Zap className="h-3.5 w-3.5 text-primary" /> : <Check className="h-3.5 w-3.5 text-emerald-500" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isAutomation ? 'Criar automação' : 'Aplicar'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDismiss}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ignorar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Expandable reasoning */}
          {(suggestion.reasoning || suggestion.explanation || suggestion.automation_example) && (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger className="w-full px-4 pb-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                {expanded ? 'Ocultar detalhes' : 'Ver raciocínio da IA'}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-3 space-y-2">
                  <Separator />
                  {(suggestion.reasoning || suggestion.explanation) && (
                    <div className="flex gap-2 pt-2">
                      <Brain className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {suggestion.reasoning || suggestion.explanation}
                      </p>
                    </div>
                  )}
                  {suggestion.automation_example && (
                    <div className="flex gap-2">
                      <Activity className="h-3.5 w-3.5 text-accent-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        {suggestion.automation_example}
                      </p>
                    </div>
                  )}

                  {/* Inline actions for mobile */}
                  <div className="flex gap-2 pt-1 sm:hidden">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={isAutomation ? () => navigate(`/dashboard/automations?suggestion_id=${suggestion.id}`) : onAccept}>
                      {isAutomation ? <><Zap className="h-3 w-3 mr-1" /> Criar</> : <><Check className="h-3 w-3 mr-1" /> Aplicar</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={onDismiss}>
                      <X className="h-3 w-3 mr-1" /> Ignorar
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// GENERATE DIALOG (Advanced)
// ============================================================================

function GenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [genType, setGenType] = useState<'tags' | 'fields' | 'automations'>('automations');
  const [entityType, setEntityType] = useState<SuggestionEntityType>('lead');
  const [entityId, setEntityId] = useState('');
  const generateMutation = useGenerateSuggestionsHub();

  const needsEntity = genType === 'tags' || genType === 'fields';

  const handleGenerate = async () => {
    if (genType === 'automations') {
      await generateMutation.mutateAsync({ type: 'automations' });
    } else if (entityId.trim()) {
      await generateMutation.mutateAsync({ type: genType, entity_type: entityType, entity_id: entityId.trim() });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Gerar Sugestões com IA
          </DialogTitle>
          <DialogDescription>
            A IA analisa os teus dados e sugere tags, campos e automações personalizadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'automations', label: 'Automações', icon: Zap, desc: 'Fluxos automáticos' },
              { value: 'tags', label: 'Tags', icon: Tag, desc: 'Classificação' },
              { value: 'fields', label: 'Campos', icon: FileText, desc: 'Enriquecimento' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setGenType(opt.value)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  genType === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <opt.icon className={cn('h-5 w-5 mb-1', genType === opt.value ? 'text-primary' : 'text-muted-foreground')} />
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>

          {needsEntity && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entidade alvo</p>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as SuggestionEntityType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="contact">Contacto</SelectItem>
                  <SelectItem value="company">Empresa</SelectItem>
                  <SelectItem value="opportunity">Oportunidade</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="ID da entidade"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={generateMutation.isPending || (needsEntity && !entityId.trim())}
            onClick={handleGenerate}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Gerar Sugestões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AISuggestionsPage() {
  const [tab, setTab] = useState('all');
  const [showGenerate, setShowGenerate] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('confidence');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [minConfidence, setMinConfidence] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const navigate = useNavigate();

  const filterType = tab === 'all' ? undefined : tab as SuggestionType;
  const { data: suggestions = [], isLoading } = useAISuggestionsHub(
    filterType ? { suggestion_type: filterType } : undefined
  );
  const { data: stats } = useSuggestionHubStats();
  const acceptMutation = useAcceptSuggestionHub();
  const dismissMutation = useDismissSuggestionHub();

  // Filter & sort
  const displayed = useMemo(() => {
    let list = [...suggestions];

    // Entity filter
    if (entityFilter !== 'all') {
      list = list.filter(s => s.entity_type === entityFilter);
    }

    // Confidence filter
    if (minConfidence > 0) {
      list = list.filter(s => s.confidence >= minConfidence / 100);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        (s.tag_value?.toLowerCase().includes(q)) ||
        (s.field_name?.toLowerCase().includes(q)) ||
        (s.automation_title?.toLowerCase().includes(q)) ||
        (s.automation_description?.toLowerCase().includes(q)) ||
        (s.reasoning?.toLowerCase().includes(q)) ||
        (s.explanation?.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      if (sortBy === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return a.suggestion_type.localeCompare(b.suggestion_type);
    });

    return list;
  }, [suggestions, entityFilter, minConfidence, searchQuery, sortBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === displayed.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayed.map(s => s.id)));
    }
  };

  const handleBatchAccept = async () => {
    const selected = suggestions.filter(s => selectedIds.has(s.id) && s.suggestion_type !== 'automation');
    for (const s of selected) {
      await acceptMutation.mutateAsync(s);
    }
    setSelectedIds(new Set());
  };

  const handleBatchDismiss = async () => {
    for (const id of selectedIds) {
      await dismissMutation.mutateAsync({ id });
    }
    setSelectedIds(new Set());
  };

  const hasActiveFilters = entityFilter !== 'all' || minConfidence > 0 || searchQuery.trim();
  const allSelected = displayed.length > 0 && selectedIds.size === displayed.length;

  return (
    <DashboardLayout>
      <FeatureGate feature="ai_suggestions">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Sugestões</h1>
                <p className="text-muted-foreground text-sm">
                  Recomendações inteligentes de tags, campos e automações
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/ai-suggestions-history')}>
                <History className="h-4 w-4 mr-1.5" />
                Histórico
              </Button>
              <Button onClick={() => setShowGenerate(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar sugestões
              </Button>
            </div>
          </div>

          {/* Stats */}
          {stats && <StatsBar stats={stats} />}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => { setTab(v); setSelectedIds(new Set()); }} className="flex-1">
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs gap-1 px-3">
                  Todas
                  {stats && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{stats.total_pending}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="tag" className="text-xs gap-1 px-3">
                  <Tag className="h-3 w-3" /> Tags
                </TabsTrigger>
                <TabsTrigger value="field_value" className="text-xs gap-1 px-3">
                  <FileText className="h-3 w-3" /> Campos
                </TabsTrigger>
                <TabsTrigger value="automation" className="text-xs gap-1 px-3">
                  <Zap className="h-3 w-3" /> Automações
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search & Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar sugestões..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-48 pl-8 text-xs"
                />
              </div>
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="sm"
                className="h-9"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                Filtros
                {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
              </Button>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidence">Maior confiança</SelectItem>
                  <SelectItem value="date">Mais recentes</SelectItem>
                  <SelectItem value="type">Por tipo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Entidade</Label>
                        <Select value={entityFilter} onValueChange={setEntityFilter}>
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="lead">Leads</SelectItem>
                            <SelectItem value="contact">Contactos</SelectItem>
                            <SelectItem value="company">Empresas</SelectItem>
                            <SelectItem value="opportunity">Oportunidades</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 min-w-[200px]">
                        <Label className="text-xs text-muted-foreground">Confiança mínima: {minConfidence}%</Label>
                        <Slider
                          value={[minConfidence]}
                          onValueChange={([v]) => setMinConfidence(v)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setEntityFilter('all'); setMinConfidence(0); setSearchQuery(''); }}>
                          <X className="h-3 w-3 mr-1" /> Limpar filtros
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Batch Actions Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={allSelected} onCheckedChange={selectAll} />
                      <span className="text-sm font-medium">{selectedIds.size} selecionadas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={handleBatchAccept}
                        disabled={acceptMutation.isPending}
                      >
                        {acceptMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                        Aceitar selecionadas
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleBatchDismiss}
                        disabled={dismissMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Ignorar selecionadas
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                        Limpar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">A carregar sugestões...</p>
              </div>
            </div>
          ) : displayed.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                    <Brain className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    {hasActiveFilters ? 'Nenhuma sugestão encontrada' : 'Nenhuma sugestão pendente'}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-md">
                    {hasActiveFilters
                      ? 'Ajusta os filtros ou pesquisa para ver mais resultados'
                      : 'Clica em "Gerar sugestões" para a IA analisar os teus dados e criar recomendações personalizadas'}
                  </p>
                  <div className="flex gap-2 mt-4">
                    {hasActiveFilters ? (
                      <Button variant="outline" onClick={() => { setEntityFilter('all'); setMinConfidence(0); setSearchQuery(''); }}>
                        <X className="h-4 w-4 mr-2" />
                        Limpar filtros
                      </Button>
                    ) : (
                      <Button onClick={() => setShowGenerate(true)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gerar sugestões
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Select all row */}
              <div className="flex items-center justify-between px-1">
                <button
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={selectAll}
                >
                  <Checkbox checked={allSelected} onCheckedChange={selectAll} />
                  {allSelected ? 'Desselecionar todas' : 'Selecionar todas'}
                </button>
                <span className="text-xs text-muted-foreground">{displayed.length} sugestões</span>
              </div>

              <ScrollArea className="max-h-[calc(100vh-420px)]">
                <div className="space-y-2 pr-4">
                  <AnimatePresence mode="popLayout">
                    {displayed.map(s => (
                      <SuggestionCard
                        key={s.id}
                        suggestion={s}
                        selected={selectedIds.has(s.id)}
                        onToggleSelect={() => toggleSelect(s.id)}
                        onAccept={() => acceptMutation.mutate(s)}
                        onDismiss={() => dismissMutation.mutate({ id: s.id })}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {showGenerate && <GenerateDialog open={showGenerate} onClose={() => setShowGenerate(false)} />}
      </FeatureGate>
    </DashboardLayout>
  );
}
