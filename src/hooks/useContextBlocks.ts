import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useCallback, useMemo } from "react";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { generateRequestId } from "@/lib/requestId";

export type ContextBlockType = 
  | 'strategy' | 'business_model' | 'offers' | 'team'
  | 'goals' | 'financials' | 'priorities' | 'processes';

export type ContextBlockStatus = 'draft' | 'approved';

export interface ContextField {
  id: string;
  block_id: string;
  field_key: string;
  field_type: string;
  field_value: any;
  display_order: number;
  updated_at: string;
}

export interface ContextBlock {
  id: string;
  workspace_id: string;
  block_type: ContextBlockType;
  title: string;
  rich_text: string | null;
  status: ContextBlockStatus;
  score: number;
  tags: string[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  fields?: ContextField[];
}

export const BLOCK_META: Record<ContextBlockType, { icon: string; label: string; labelPt: string }> = {
  strategy:       { icon: '🎯', label: 'Strategy',       labelPt: 'Estratégia' },
  business_model: { icon: '💼', label: 'Business Model', labelPt: 'Modelo de Negócio' },
  offers:         { icon: '🏷️', label: 'Offers',         labelPt: 'Ofertas' },
  team:           { icon: '👥', label: 'Team',            labelPt: 'Equipa' },
  goals:          { icon: '📊', label: 'Goals',           labelPt: 'Metas' },
  financials:     { icon: '💰', label: 'Financials',      labelPt: 'Financeiro' },
  priorities:     { icon: '🔥', label: 'Priorities',      labelPt: 'Prioridades' },
  processes:      { icon: '⚙️', label: 'Processes',       labelPt: 'Processos' },
};

export const FIELD_LABELS: Record<string, string> = {
  vision: 'Visão', mission: 'Missão', competitive_advantage: 'Vantagem Competitiva',
  market_position: 'Posição de Mercado', key_differentiators: 'Diferenciadores-chave',
  model_type: 'Tipo de Modelo', description: 'Descrição', revenue_streams: 'Fontes de Receita',
  cost_structure: 'Estrutura de Custos', products: 'Produtos/Serviços', pricing_model: 'Modelo de Pricing',
  average_ticket: 'Ticket Médio', upsell_strategy: 'Estratégia de Upsell',
  team_size: 'Tamanho da Equipa', roles: 'Funções', strategies: 'Estratégias', hiring_plan: 'Plano de Contratação',
  monthly_target: 'Meta Mensal', quarterly_target: 'Meta Trimestral', annual_target: 'Meta Anual',
  deals_monthly: 'Deals/Mês', conversion_rate: 'Taxa de Conversão (%)',
  mrr: 'MRR', arr: 'ARR', cac: 'CAC', ltv: 'LTV', churn_rate: 'Churn Rate (%)', margin: 'Margem (%)',
  current_quarter: 'Prioridades Q Atual', next_quarter: 'Prioridades Próximo Q',
  blockers: 'Bloqueios', initiatives: 'Iniciativas',
  sales_steps: 'Etapas de Venda', sales_cycle_days: 'Ciclo de Venda (dias)',
  follow_up_sla: 'SLA Follow-up (horas)', objections: 'Objeções Comuns', scripts: 'Scripts',
};

function computeBlockScore(fields: ContextField[]): number {
  if (!fields.length) return 0;
  const filled = fields.filter(f => {
    if (f.field_value === null || f.field_value === undefined) return false;
    if (typeof f.field_value === 'string' && f.field_value.trim() === '') return false;
    if (Array.isArray(f.field_value) && f.field_value.length === 0) return false;
    return true;
  });
  return Math.round((filled.length / fields.length) * 100);
}

export function useContextBlocks() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["context-blocks", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data: blocks, error } = await supabase
        .from("context_blocks" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("block_type");
      if (error) throw error;

      if (!blocks || blocks.length === 0) {
        // Seed blocks
        const { error: seedErr } = await supabase.rpc("seed_context_blocks" as any, { p_workspace_id: workspaceId });
        if (seedErr) throw seedErr;
        const { data: seeded, error: e2 } = await supabase
          .from("context_blocks" as any)
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("block_type");
        if (e2) throw e2;
        return await enrichBlocks(seeded as any[]);
      }
      return await enrichBlocks(blocks as any[]);
    },
    enabled: !!workspaceId,
  });

  return query;
}

async function enrichBlocks(blocks: any[]): Promise<ContextBlock[]> {
  if (!blocks.length) return [];
  const blockIds = blocks.map(b => b.id);
  const { data: fields, error } = await supabase
    .from("context_fields" as any)
    .select("*")
    .in("block_id", blockIds)
    .order("display_order");
  if (error) throw error;

  const fieldsByBlock: Record<string, ContextField[]> = {};
  (fields as any[] || []).forEach((f: any) => {
    if (!fieldsByBlock[f.block_id]) fieldsByBlock[f.block_id] = [];
    fieldsByBlock[f.block_id].push(f as ContextField);
  });

  return blocks.map(b => ({
    ...b,
    fields: fieldsByBlock[b.id] || [],
    score: computeBlockScore(fieldsByBlock[b.id] || []),
  })) as ContextBlock[];
}

export function useUpsertContextField() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ fieldId, value, blockId }: { fieldId: string; value: any; blockId?: string }) => {
      const { error } = await supabase
        .from("context_fields" as any)
        .update({ field_value: value, updated_at: new Date().toISOString() } as any)
        .eq("id", fieldId);
      if (error) throw error;
      return { fieldId, blockId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["context-blocks", currentWorkspace?.id] });
      console.log('[CONTEXT] Field updated', { fieldId: variables.fieldId, blockId: variables.blockId });

      if (currentWorkspace?.id && variables.blockId) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTEXT.BLOCK_UPDATED',
          entity_kind: 'context_block',
          entity_id: variables.blockId,
          payload: { field_id: variables.fieldId },
          source_module: 'strategy-context-os',
          idempotency_key: `ctx-field-${variables.fieldId}-${Date.now()}`,
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[CONTEXT] Field update failed', err.message);
      toast.error("Erro ao guardar campo: " + err.message);
    },
  });
}

export function useUpdateBlockStatus() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ blockId, status }: { blockId: string; status: ContextBlockStatus }) => {
      const { error } = await supabase
        .from("context_blocks" as any)
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", blockId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["context-blocks", currentWorkspace?.id] });
      toast.success("Status atualizado");
      console.log('[CONTEXT] Status changed', { blockId: variables.blockId, status: variables.status });

      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTEXT.STATUS_CHANGED',
          entity_kind: 'context_block',
          entity_id: variables.blockId,
          payload: { status: variables.status },
          source_module: 'strategy-context-os',
          correlation_id: generateRequestId(),
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[CONTEXT] Status change failed', err.message);
      toast.error("Erro: " + err.message);
    },
  });
}

export function useUpdateBlockRichText() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ blockId, richText }: { blockId: string; richText: string }) => {
      const { error } = await supabase
        .from("context_blocks" as any)
        .update({ rich_text: richText, updated_at: new Date().toISOString() } as any)
        .eq("id", blockId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["context-blocks", currentWorkspace?.id] });
      toast.success("Resumo guardado");
      console.log('[CONTEXT] Rich text updated', { blockId: variables.blockId, length: variables.richText.length });

      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTEXT.RICH_TEXT_UPDATED',
          entity_kind: 'context_block',
          entity_id: variables.blockId,
          payload: { content_length: variables.richText.length },
          source_module: 'strategy-context-os',
          correlation_id: generateRequestId(),
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[CONTEXT] Rich text update failed', err.message);
      toast.error("Erro: " + err.message);
    },
  });
}

export function useUpdateBlockTags() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ blockId, tags }: { blockId: string; tags: string[] }) => {
      const { error } = await supabase
        .from("context_blocks" as any)
        .update({ tags, updated_at: new Date().toISOString() } as any)
        .eq("id", blockId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["context-blocks", currentWorkspace?.id] });
      console.log('[CONTEXT] Tags updated', { blockId: variables.blockId, tags: variables.tags });
    },
    onError: (err: Error) => {
      console.warn('[CONTEXT] Tags update failed', err.message);
      toast.error("Erro: " + err.message);
    },
  });
}

export function useOverallScore(blocks: ContextBlock[] | undefined) {
  return useMemo(() => {
    if (!blocks || blocks.length === 0) return 0;
    const total = blocks.reduce((sum, b) => sum + (b.score || 0), 0);
    return Math.round(total / blocks.length);
  }, [blocks]);
}

export function useMissingFields(blocks: ContextBlock[] | undefined) {
  return useMemo(() => {
    if (!blocks) return [];
    const missing: { blockType: ContextBlockType; blockLabel: string; fieldKey: string; fieldLabel: string }[] = [];
    blocks.forEach(b => {
      const meta = BLOCK_META[b.block_type];
      (b.fields || []).forEach(f => {
        const isEmpty = f.field_value === null || f.field_value === undefined ||
          (typeof f.field_value === 'string' && f.field_value.trim() === '') ||
          (Array.isArray(f.field_value) && f.field_value.length === 0);
        if (isEmpty) {
          missing.push({
            blockType: b.block_type,
            blockLabel: meta.labelPt,
            fieldKey: f.field_key,
            fieldLabel: FIELD_LABELS[f.field_key] || f.field_key,
          });
        }
      });
    });
    return missing.slice(0, 5);
  }, [blocks]);
}
