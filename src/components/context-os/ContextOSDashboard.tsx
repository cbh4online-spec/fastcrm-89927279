import { useState } from "react";
import { useContextBlocks, useOverallScore, useMissingFields, BLOCK_META, ContextBlock } from "@/hooks/useContextBlocks";
import { useContextDrift } from "@/hooks/useContextDrift";
import { ContextScoreRing } from "./ContextScoreRing";
import { ContextBlockDetail } from "./ContextBlockDetail";
import { ContextActionsPanel } from "./ContextActionsPanel";
import { ContextAlertsPanel } from "./ContextAlertsPanel";
import { ContextEventLog } from "./ContextEventLog";
import { ContextDriftBadge } from "./ContextDriftBadge";
import { SystemHealthBadge } from "./SystemHealthBadge";
import { SystemMetricsPanel } from "./SystemMetricsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Edit3, Loader2, Database, Zap, Bell, Activity, RefreshCw, BarChart3, Network, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContextAlerts } from "@/hooks/useContextAlerts";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function ContextOSDashboard() {
  const { data: blocks, isLoading } = useContextBlocks();
  const overallScore = useOverallScore(blocks);
  const missingFields = useMissingFields(blocks);
  const { getDriftForBlock, recompute } = useContextDrift();
  const { unreadCount } = useContextAlerts();
  const { currentWorkspace } = useWorkspace();
  const [selectedBlock, setSelectedBlock] = useState<ContextBlock | null>(null);

  // Fetch context_bindings
  const { data: bindings } = useQuery({
    queryKey: ['context-bindings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from('context_bindings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);
      return data ?? [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Run Impact mutation
  const runImpact = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { error } = await supabase.functions.invoke('kernel-compute-impact', {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Impacto calculado'),
    onError: (err: Error) => toast.error('Erro: ' + err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-medium">
            <Database className="h-3 w-3" />
            Context OS
          </div>
          <h2 className="text-xl font-bold text-foreground">Memória Estratégica do Negócio</h2>
          <p className="text-sm text-muted-foreground">
            Documentação viva que alimenta toda a inteligência do sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SystemHealthBadge />
          <Button
            size="sm"
            variant="outline"
            onClick={() => runImpact.mutate()}
            disabled={runImpact.isPending}
            className="gap-1.5 text-xs"
          >
            <Network className={cn("h-3.5 w-3.5", runImpact.isPending && "animate-spin")} />
            Run Impact
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", recompute.isPending && "animate-spin")} />
            Drift
          </Button>
          <ContextScoreRing score={overallScore} size={80} strokeWidth={6} />
        </div>
      </motion.div>

      <Tabs defaultValue="blocks" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="blocks" className="gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5" /> Blocos
          </TabsTrigger>
          <TabsTrigger value="bindings" className="gap-1.5 text-xs">
            <Link2 className="h-3.5 w-3.5" /> Bindings
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Actions
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 text-xs relative">
            <Bell className="h-3.5 w-3.5" /> Alertas
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] text-destructive-foreground flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" /> Eventos
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Métricas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="space-y-4">
          {/* Missing Fields Alert */}
          {missingFields.length > 0 && (
            <motion.div
              className="rounded-lg border border-gold/20 bg-gold/5 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-gold" />
                <span className="text-sm font-medium text-gold">Campos por preencher</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {missingFields.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted/30 border border-border/50 text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground mr-1">{m.blockLabel}:</span>
                    {m.fieldLabel}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(blocks || []).map((block, idx) => {
              const meta = BLOCK_META[block.block_type];
              const drift = getDriftForBlock(block.id);
              return (
                <motion.div
                  key={block.id}
                  className={cn(
                    "group relative rounded-xl border p-5 transition-all cursor-pointer",
                    "bg-card/50 border-border/50",
                    "hover:border-gold/30 hover:bg-card/80 hover:shadow-lg hover:shadow-gold/5"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedBlock(block)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{meta.labelPt}</h3>
                        <p className="text-[11px] text-muted-foreground">{meta.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {drift && drift.severity !== 'ok' && (
                        <ContextDriftBadge
                          severity={drift.severity}
                          score={drift.drift_score}
                          staleDays={drift.stale_days}
                          compact
                        />
                      )}
                      <Badge
                        variant={block.status === 'approved' ? 'default' : 'secondary'}
                        className={cn(
                          "text-[10px]",
                          block.status === 'approved' && "bg-green-500/10 text-green-500 border-green-500/20"
                        )}
                      >
                        {block.status === 'approved' ? 'Aprovado' : 'Rascunho'}
                      </Badge>
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-muted-foreground">Preenchimento</span>
                      <span className="text-[11px] font-medium text-gold">{block.score}%</span>
                    </div>
                    <Progress value={block.score} className="h-1.5 bg-muted/30 [&>div]:bg-gold" />
                  </div>

                  {/* Tags */}
                  {block.tags && block.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {block.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-gold/10 text-[10px] text-gold border border-gold/20">
                          {tag}
                        </span>
                      ))}
                      {block.tags.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-muted/30 text-[10px] text-muted-foreground">
                          +{block.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Fields count */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {(block.fields || []).filter(f => f.field_value !== null && f.field_value !== undefined).length}/{(block.fields || []).length} campos
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs gap-1 text-gold hover:text-gold hover:bg-gold/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit3 className="h-3 w-3" /> Editar
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="bindings" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Mapeamento de blocos de contexto para assets operacionais
          </div>
          {(!bindings || bindings.length === 0) ? (
            <Card className="border-dashed border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Link2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sem bindings registados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bindings.map((b: any) => {
                const block = blocks?.find(bl => bl.id === b.block_id);
                return (
                  <Card key={b.id} className="border-border/50">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-foreground">
                          {block ? BLOCK_META[block.block_type as keyof typeof BLOCK_META]?.icon : '📦'} {block?.title ?? b.block_id}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline" className="text-[10px]">{b.asset_kind}</Badge>
                        <span className="text-muted-foreground font-mono truncate max-w-[120px]">{b.asset_id}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions">
          <ContextActionsPanel />
        </TabsContent>

        <TabsContent value="alerts">
          <ContextAlertsPanel onBlockClick={(blockId) => {
            const block = blocks?.find(b => b.id === blockId);
            if (block) setSelectedBlock(block);
          }} />
        </TabsContent>

        <TabsContent value="events">
          <ContextEventLog />
        </TabsContent>

        <TabsContent value="metrics">
          <SystemMetricsPanel />
        </TabsContent>
      </Tabs>

      {/* Block Detail Dialog */}
      {selectedBlock && (
        <ContextBlockDetail
          block={selectedBlock}
          open={!!selectedBlock}
          onOpenChange={(open) => !open && setSelectedBlock(null)}
        />
      )}
    </div>
  );
}
