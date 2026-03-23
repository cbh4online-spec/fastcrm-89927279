import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sparkles, Tag, FileText, Zap, Check, X, ChevronDown,
  Loader2, RefreshCw, Target, Users, Building2, Briefcase,
  TrendingUp, Clock, CheckCircle2, XCircle, Brain,
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

// ============================================================================
// STAT PILL
// ============================================================================

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium', color)}>
      <span className="text-lg font-bold">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

// ============================================================================
// CONFIDENCE BAR
// ============================================================================

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 80 ? 'bg-primary' : pct >= 60 ? 'bg-accent' : 'bg-destructive'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ============================================================================
// TAG SUGGESTION CARD
// ============================================================================

function TagSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: AISuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const EntityIcon = ENTITY_ICONS[suggestion.entity_type || ''] || Target;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
    >
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              {suggestion.entity_type && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <EntityIcon className="h-3 w-3" />
                  {ENTITY_LABELS[suggestion.entity_type] || suggestion.entity_type}
                </Badge>
              )}
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                {suggestion.tag_value}
              </Badge>
            </div>
            <ConfidenceBar value={suggestion.confidence} />
          </div>

          {(suggestion.reasoning || suggestion.explanation) && (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                Raciocínio
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="text-xs text-muted-foreground mt-1 pl-4">
                  {suggestion.reasoning || suggestion.explanation}
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs" onClick={onAccept}>
              <Check className="h-3 w-3 mr-1" /> Aplicar tag
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDismiss}>
              <X className="h-3 w-3 mr-1" /> Ignorar
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// FIELD SUGGESTION CARD
// ============================================================================

function FieldSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: AISuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const EntityIcon = ENTITY_ICONS[suggestion.entity_type || ''] || Target;
  const displayValue = suggestion.suggested_value === null || suggestion.suggested_value === undefined
    ? '—'
    : typeof suggestion.suggested_value === 'object'
      ? JSON.stringify(suggestion.suggested_value)
      : String(suggestion.suggested_value);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
    >
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              {suggestion.entity_type && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <EntityIcon className="h-3 w-3" />
                  {ENTITY_LABELS[suggestion.entity_type] || suggestion.entity_type}
                </Badge>
              )}
              <span className="text-sm font-medium">{suggestion.field_name}</span>
              <span className="text-muted-foreground text-xs">→</span>
              <span className="text-sm font-semibold text-primary truncate max-w-[200px]">{displayValue}</span>
            </div>
            <ConfidenceBar value={suggestion.confidence} />
          </div>

          {suggestion.field_type && (
            <Badge variant="secondary" className="text-[10px]">{suggestion.field_type}</Badge>
          )}

          {(suggestion.reasoning || suggestion.explanation) && (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                Raciocínio
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="text-xs text-muted-foreground mt-1 pl-4">
                  {suggestion.reasoning || suggestion.explanation}
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs" onClick={onAccept}>
              <Check className="h-3 w-3 mr-1" /> Aplicar valor
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDismiss}>
              <X className="h-3 w-3 mr-1" /> Ignorar
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// AUTOMATION SUGGESTION CARD
// ============================================================================

function AutomationSuggestionCard({
  suggestion,
  onDismiss,
}: {
  suggestion: AISuggestion;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const triggerLabel = suggestion.automation_trigger
    ? `Quando ${(suggestion.automation_trigger as any).event || (suggestion.automation_trigger as any).trigger_type || 'evento'}`
    : '';

  const actionTypes = Array.isArray(suggestion.automation_actions)
    ? (suggestion.automation_actions as any[]).map(a => a.type || a.action_type || '?')
    : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
    >
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold">{suggestion.automation_title}</span>
            </div>
            <ConfidenceBar value={suggestion.confidence} />
          </div>

          {suggestion.automation_description && (
            <p className="text-xs text-muted-foreground">{suggestion.automation_description}</p>
          )}

          {triggerLabel && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">Trigger: {triggerLabel}</Badge>
              {actionTypes.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          )}

          {suggestion.automation_example && (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                Exemplo
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="text-xs text-muted-foreground italic mt-1 pl-4">
                  {suggestion.automation_example}
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate(`/dashboard/automations?suggestion_id=${suggestion.id}`)}
            >
              <Zap className="h-3 w-3 mr-1" /> Criar automação
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDismiss}>
              <X className="h-3 w-3 mr-1" /> Ignorar
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// GENERATE DIALOG
// ============================================================================

function GenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [genType, setGenType] = useState<'tags' | 'fields' | 'automations'>('automations');
  const [entityType, setEntityType] = useState<SuggestionEntityType>('lead');
  const [entityId, setEntityId] = useState('');
  const generateMutation = useGenerateSuggestionsHub();

  const handleGenerate = useCallback(async () => {
    if (genType === 'automations') {
      await generateMutation.mutateAsync({ type: 'automations' });
    } else if (entityId.trim()) {
      await generateMutation.mutateAsync({ type: genType, entity_type: entityType, entity_id: entityId.trim() });
    }
    onClose();
  }, [genType, entityType, entityId, generateMutation, onClose]);

  const needsEntity = genType === 'tags' || genType === 'fields';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Sugestões
          </DialogTitle>
          <DialogDescription>Escolha o tipo de sugestões a gerar</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={genType} onValueChange={(v) => setGenType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tags">Tags para entidade</SelectItem>
              <SelectItem value="fields">Campos para entidade</SelectItem>
              <SelectItem value="automations">Sugestões de automação</SelectItem>
            </SelectContent>
          </Select>

          {needsEntity && (
            <>
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
            </>
          )}

          <Button
            className="w-full"
            disabled={generateMutation.isPending || (needsEntity && !entityId.trim())}
            onClick={handleGenerate}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Gerar
          </Button>
        </div>
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

  const filterType = tab === 'all' ? undefined : tab as SuggestionType;
  const { data: suggestions = [], isLoading } = useAISuggestionsHub(
    filterType ? { suggestion_type: filterType } : undefined
  );
  const { data: stats } = useSuggestionHubStats();
  const acceptMutation = useAcceptSuggestionHub();
  const dismissMutation = useDismissSuggestionHub();

  const tags = suggestions.filter(s => s.suggestion_type === 'tag');
  const fields = suggestions.filter(s => s.suggestion_type === 'field_value');
  const automations = suggestions.filter(s => s.suggestion_type === 'automation');
  const displayed = tab === 'all' ? suggestions : tab === 'tag' ? tags : tab === 'field_value' ? fields : automations;

  return (
    <DashboardLayout>
      <FeatureGate feature="ai_suggestions">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Sugestões</h1>
                <p className="text-muted-foreground text-sm">Tags, campos e automações sugeridos por IA</p>
              </div>
            </div>
            <Button onClick={() => setShowGenerate(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar sugestões
            </Button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex flex-wrap gap-3">
              <StatPill label="pendentes" value={stats.total_pending} color="bg-accent/10 text-accent" />
              <StatPill label="aceites (7d)" value={stats.accepted_last_7_days} color="bg-primary/10 text-primary" />
              <StatPill label="ignoradas (7d)" value={stats.dismissed_last_7_days} color="bg-muted text-muted-foreground" />
            </div>
          )}

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all" className="gap-1.5">
                Todas
                {stats && <Badge variant="secondary" className="text-[10px] ml-1">{stats.total_pending}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="tag" className="gap-1.5">
                <Tag className="h-3 w-3" /> Tags
                {stats && stats.tags_pending > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{stats.tags_pending}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="field_value" className="gap-1.5">
                <FileText className="h-3 w-3" /> Campos
                {stats && stats.fields_pending > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{stats.fields_pending}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="automation" className="gap-1.5">
                <Zap className="h-3 w-3" /> Automações
                {stats && stats.automations_pending > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{stats.automations_pending}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma sugestão pendente</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md">
                Clica em "Gerar sugestões" para obter recomendações personalizadas para o teu workspace
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setShowGenerate(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar sugestões
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[calc(100vh-320px)]">
              <div className="grid gap-3 pr-4">
                <AnimatePresence mode="popLayout">
                  {displayed.map(s => {
                    if (s.suggestion_type === 'tag') {
                      return (
                        <TagSuggestionCard
                          key={s.id}
                          suggestion={s}
                          onAccept={() => acceptMutation.mutate(s)}
                          onDismiss={() => dismissMutation.mutate({ id: s.id })}
                        />
                      );
                    }
                    if (s.suggestion_type === 'automation') {
                      return (
                        <AutomationSuggestionCard
                          key={s.id}
                          suggestion={s}
                          onDismiss={() => dismissMutation.mutate({ id: s.id })}
                        />
                      );
                    }
                    return (
                      <FieldSuggestionCard
                        key={s.id}
                        suggestion={s}
                        onAccept={() => acceptMutation.mutate(s)}
                        onDismiss={() => dismissMutation.mutate({ id: s.id })}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>

        {showGenerate && <GenerateDialog open={showGenerate} onClose={() => setShowGenerate(false)} />}
      </FeatureGate>
    </DashboardLayout>
  );
}
