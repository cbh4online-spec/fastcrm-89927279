import { emitAndPersist } from './eventBus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ActionGroup = 'Navigate' | 'Create' | 'Update' | 'Analyze' | 'Automate' | 'Governance';

export interface ActionContext {
  workspaceId: string;
  userId: string;
  activeBlockId?: string;
  selection?: { blockIds?: string[]; taskIds?: string[] };
  query?: string;
  navigate?: (path: string) => void;
}

export interface Action {
  id: string;
  title: string;
  group: ActionGroup;
  keywords: string[];
  description?: string;
  shortcut?: string[];
  requires?: {
    activeBlock?: boolean;
    blockTypes?: string[];
    roles?: string[];
  };
  run: (ctx: ActionContext, params?: Record<string, unknown>) => Promise<void>;
}

// Registry of all actions
const actions: Action[] = [
  // ── Navigate ──
  {
    id: 'navigate.dashboard',
    title: 'Ir para Dashboard',
    group: 'Navigate',
    keywords: ['dashboard', 'home', 'início'],
    run: async (ctx) => ctx.navigate?.('/dashboard'),
  },
  {
    id: 'navigate.command_center',
    title: 'Ir para Command Center',
    group: 'Navigate',
    keywords: ['command', 'center', 'central', 'comando'],
    run: async (ctx) => ctx.navigate?.('/dashboard/command-center'),
  },
  {
    id: 'navigate.leads',
    title: 'Ir para Leads',
    group: 'Navigate',
    keywords: ['leads', 'contactos', 'prospects'],
    run: async (ctx) => ctx.navigate?.('/dashboard/leads'),
  },
  {
    id: 'navigate.opportunities',
    title: 'Ir para Oportunidades',
    group: 'Navigate',
    keywords: ['opportunities', 'oportunidades', 'deals', 'pipeline'],
    run: async (ctx) => ctx.navigate?.('/dashboard/opportunities'),
  },
  {
    id: 'navigate.reports',
    title: 'Ir para Relatórios',
    group: 'Navigate',
    keywords: ['reports', 'relatórios', 'analytics'],
    run: async (ctx) => ctx.navigate?.('/dashboard/reports'),
  },
  {
    id: 'navigate.context_os',
    title: 'Ir para Context OS',
    group: 'Navigate',
    keywords: ['context', 'os', 'estratégia', 'blocos'],
    run: async (ctx) => ctx.navigate?.('/dashboard/command-center?tab=context'),
  },

  // ── Governance ──
  {
    id: 'context.verify_block',
    title: 'Verificar bloco de contexto',
    group: 'Governance',
    keywords: ['verify', 'validar', 'atualizar', 'contexto', 'verificar'],
    requires: { activeBlock: true },
    run: async (ctx) => {
      if (!ctx.activeBlockId) return;
      const { error } = await supabase
        .from('context_blocks')
        .update({ last_verified_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', ctx.activeBlockId);
      if (error) {
        toast.error('Erro ao verificar bloco');
        return;
      }
      emitAndPersist('context.block.verified', {
        workspace_id: ctx.workspaceId,
        actor_user_id: ctx.userId,
        entity_type: 'context_block',
        entity_id: ctx.activeBlockId,
      });
      toast.success('Bloco verificado ✓');
    },
  },

  // ── Analyze ──
  {
    id: 'brief.generate_daily',
    title: 'Gerar Daily Brief (últimas 24h)',
    group: 'Analyze',
    keywords: ['brief', 'daily', 'resumo', '24h', 'diário'],
    run: async (ctx) => {
      emitAndPersist('brief.generated', {
        workspace_id: ctx.workspaceId,
        actor_user_id: ctx.userId,
        data: { scope: '24h' },
      });
      toast.info('A gerar Daily Brief...');
      const { error } = await supabase.functions.invoke('daily-revenue-brief', {
        body: { workspace_id: ctx.workspaceId },
      });
      if (error) toast.error('Erro ao gerar brief');
      else toast.success('Daily Brief gerado');
    },
  },
  {
    id: 'impact.run',
    title: 'Calcular Impact Map (bloco atual)',
    group: 'Analyze',
    keywords: ['impact', 'map', 'dependências', 'outdated', 'impacto'],
    requires: { activeBlock: true },
    run: async (ctx) => {
      if (!ctx.activeBlockId) return;
      emitAndPersist('impact.calculated', {
        workspace_id: ctx.workspaceId,
        actor_user_id: ctx.userId,
        entity_type: 'context_block',
        entity_id: ctx.activeBlockId,
      });
      toast.info('A calcular impacto...');
      const { error } = await supabase.functions.invoke('compute-impact', {
        body: { source_block_id: ctx.activeBlockId, workspace_id: ctx.workspaceId },
      });
      if (error) toast.error('Erro ao calcular impacto');
      else toast.success('Impact Map calculado');
    },
  },
  {
    id: 'drift.compute',
    title: 'Recalcular Drift Score do workspace',
    group: 'Analyze',
    keywords: ['drift', 'score', 'recalcular', 'desatualizado'],
    run: async (ctx) => {
      toast.info('A recalcular drift...');
      const { error } = await supabase.functions.invoke('compute-drift', {
        body: { workspace_id: ctx.workspaceId },
      });
      if (error) toast.error('Erro ao calcular drift');
      else {
        emitAndPersist('drift.computed', {
          workspace_id: ctx.workspaceId,
          actor_user_id: ctx.userId,
        });
        toast.success('Drift recalculado');
      }
    },
  },

  // ── Automate ──
  {
    id: 'tasks.create_from_drift',
    title: 'Criar tasks para itens desatualizados',
    group: 'Automate',
    keywords: ['tasks', 'drift', 'outdated', 'ações', 'criar'],
    run: async (ctx) => {
      // Fetch blocks with risk/critical drift
      const { data: driftItems } = await supabase
        .from('context_drift')
        .select('block_id, drift_score, severity, reasons_json, context_blocks(title, block_type)')
        .eq('workspace_id', ctx.workspaceId)
        .in('severity', ['risk', 'critical']);

      if (!driftItems?.length) {
        toast.info('Nenhum bloco com drift crítico');
        return;
      }

      let created = 0;
      for (const item of driftItems) {
        const block = item.context_blocks as unknown as { title: string; block_type: string } | null;
        await supabase.from('tasks').insert({
          workspace_id: ctx.workspaceId,
          related_type: 'context_block',
          related_id: item.block_id,
          title: `Atualizar: ${block?.title ?? 'Bloco'}`,
          description: `Drift score: ${item.drift_score}. Severidade: ${item.severity}`,
          status: 'open',
          priority: item.severity === 'critical' ? 'high' : 'medium',
          assigned_to: ctx.userId,
        });
        created++;
      }

      emitAndPersist('task.created', {
        workspace_id: ctx.workspaceId,
        actor_user_id: ctx.userId,
        data: { count: created, source: 'drift' },
      });
      toast.success(`${created} tasks criadas a partir do drift`);
    },
  },

  // ── Create ──
  {
    id: 'context.create_block',
    title: 'Criar novo bloco de contexto',
    group: 'Create',
    keywords: ['criar', 'novo', 'bloco', 'contexto', 'create'],
    run: async (ctx) => {
      ctx.navigate?.('/dashboard/command-center?tab=context&action=create');
    },
  },

  // ── Update ──
  {
    id: 'context.refresh_ai',
    title: 'Pedir sugestões IA para bloco',
    group: 'Update',
    keywords: ['ia', 'ai', 'sugestão', 'preencher', 'gemini'],
    requires: { activeBlock: true },
    run: async (ctx) => {
      if (!ctx.activeBlockId) return;
      toast.info('A pedir sugestões IA...');
      const { error } = await supabase.functions.invoke('context-ai-assist', {
        body: {
          workspace_id: ctx.workspaceId,
          block_id: ctx.activeBlockId,
          action: 'suggest_fields',
        },
      });
      if (error) toast.error('Erro ao pedir sugestões IA');
      else toast.success('Sugestões IA recebidas');
    },
  },

  // ── Automate (system jobs) ──
  {
    id: 'jobs.process',
    title: 'Processar jobs pendentes',
    group: 'Automate',
    keywords: ['jobs', 'processar', 'queue', 'fila'],
    run: async (ctx) => {
      toast.info('A processar jobs...');
      const { error } = await supabase.functions.invoke('process-jobs', {});
      if (error) toast.error('Erro ao processar jobs');
      else toast.success('Jobs processados');
    },
  },
  {
    id: 'metrics.compute',
    title: 'Calcular métricas do sistema',
    group: 'Analyze',
    keywords: ['metrics', 'métricas', 'health', 'saúde', 'telemetria'],
    run: async (ctx) => {
      toast.info('A calcular métricas...');
      const { error } = await supabase.functions.invoke('compute-metrics', {
        body: { workspace_id: ctx.workspaceId },
      });
      if (error) toast.error('Erro ao calcular métricas');
      else toast.success('Métricas calculadas');
    },
  },
  {
    id: 'alerts.cleanup',
    title: 'Limpar alertas antigos (>30 dias)',
    group: 'Governance',
    keywords: ['alertas', 'limpar', 'cleanup', 'antigos'],
    run: async (ctx) => {
      toast.info('A limpar alertas...');
      const { error } = await supabase.from('jobs' as any).insert({
        workspace_id: ctx.workspaceId,
        type: 'cleanup_alerts',
        payload_json: { workspace_id: ctx.workspaceId },
      } as any);
      if (error) toast.error('Erro ao agendar limpeza');
      else toast.success('Job de limpeza criado');
    },
  },
  {
    id: 'navigate.alerts',
    title: 'Ir para Alertas',
    group: 'Navigate',
    keywords: ['alerts', 'alertas', 'inbox'],
    run: async (ctx) => ctx.navigate?.('/dashboard/alerts'),
  },
  {
    id: 'navigate.impact_map',
    title: 'Ir para Impact Map',
    group: 'Navigate',
    keywords: ['impact', 'map', 'mapa', 'impacto', 'dependências'],
    run: async (ctx) => ctx.navigate?.('/dashboard/impact-map'),
  },
  {
    id: 'kernel.decisions',
    title: 'Ver decisões pendentes do Kernel',
    group: 'Analyze',
    keywords: ['decisions', 'decisões', 'kernel', 'pendentes'],
    run: async (ctx) => ctx.navigate?.('/dashboard/command-center?tab=decisions'),
  },
  {
    id: 'kernel.process_events',
    title: 'Processar eventos do Kernel',
    group: 'Automate',
    keywords: ['kernel', 'events', 'processar', 'eventos'],
    run: async (ctx) => {
      toast.info('A processar eventos do Kernel...');
      const { error } = await supabase.functions.invoke('kernel-process-events', {
        body: { workspace_id: ctx.workspaceId },
      });
      if (error) toast.error('Erro ao processar eventos');
      else toast.success('Eventos processados');
    },
  },
  {
    id: 'kernel.compute_drift',
    title: 'Recalcular Drift do Workspace (Kernel)',
    group: 'Analyze',
    keywords: ['kernel', 'drift', 'workspace', 'recalcular'],
    run: async (ctx) => {
      toast.info('A recalcular drift...');
      const { error } = await supabase.functions.invoke('kernel-compute-drift', {
        body: { workspace_id: ctx.workspaceId },
      });
      if (error) toast.error('Erro ao calcular drift');
      else toast.success('Drift do workspace recalculado');
    },
  },
  // ── Command Center Quick Actions ──
  {
    id: 'ask.daily_priorities',
    title: 'Ver prioridades do dia',
    group: 'Analyze',
    keywords: ['prioridades', 'hoje', 'daily', 'priorities', 'agenda'],
    run: async (ctx) => ctx.navigate?.('/dashboard'),
  },
  {
    id: 'ask.pipeline_risk',
    title: 'Ver deals em risco',
    group: 'Analyze',
    keywords: ['risco', 'risk', 'deals em risco', 'at risk'],
    run: async (ctx) => ctx.navigate?.('/dashboard/opportunities'),
  },
  {
    id: 'ask.lead_analysis',
    title: 'Análise de leads',
    group: 'Analyze',
    keywords: ['leads', 'queda', 'drop', 'análise leads'],
    run: async (ctx) => ctx.navigate?.('/dashboard/leads'),
  },
  {
    id: 'ask.drift_overview',
    title: 'Ver drift do contexto',
    group: 'Analyze',
    keywords: ['drift', 'contexto', 'desatualizado', 'overview'],
    run: async (ctx) => ctx.navigate?.('/dashboard/command-center?tab=context'),
  },
];
// ── Public API ──
export function getActions(): Action[] {
  return actions;
}

export function getFilteredActions(
  query: string,
  ctx: Partial<ActionContext> = {}
): Action[] {
  const q = query.toLowerCase().trim();
  return actions.filter((a) => {
    // Check requires
    if (a.requires?.activeBlock && !ctx.activeBlockId) return false;
    // Keyword/title match
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.keywords.some((k) => k.includes(q)) ||
      a.group.toLowerCase().includes(q)
    );
  });
}

export async function executeAction(
  action: Action,
  ctx: ActionContext,
  params?: Record<string, unknown>
) {
  emitAndPersist('command.executed', {
    workspace_id: ctx.workspaceId,
    actor_user_id: ctx.userId,
    data: { action_id: action.id, params },
    meta: { source: 'cmdk' },
  });
  await action.run(ctx, params);
}
