import { useMemo } from 'react';
import { BusinessContext } from './useBusinessContext';

export interface BlockStatus {
  key: string;
  title: string;
  icon: string;
  description: string;
  fillPercent: number;
  updatedAt: string | null;
  staleDays: number;
  state: 'filled' | 'aging' | 'stale' | 'empty';
}

const BLOCK_DEFINITIONS = [
  { key: 'strategy', title: 'Estratégia', icon: '🎯', description: 'Visão, missão, posicionamento e vantagem competitiva', fields: ['business_model', 'business_description'] },
  { key: 'offers', title: 'Ofertas & Produtos', icon: '💼', description: 'O que vendes, para quem, a que preço e com que diferencial', fields: ['offers', 'pricing_model', 'average_ticket'] },
  { key: 'team', title: 'Equipa', icon: '👥', description: 'Quem faz o quê, competências e responsabilidades', fields: ['team_size', 'team_roles'] },
  { key: 'goals', title: 'Metas & OKRs', icon: '🏆', description: 'Objectivos do trimestre, métricas e targets', fields: ['monthly_revenue_target', 'quarterly_revenue_target', 'annual_revenue_target', 'deals_target_monthly'] },
  { key: 'icp', title: 'Cliente Ideal (ICP)', icon: '🎯', description: 'Perfil do cliente ideal, dores, motivações e onde encontrá-lo', fields: ['icp_description', 'icp_industries', 'icp_company_size', 'icp_decision_maker', 'icp_pain_points'] },
  { key: 'process', title: 'Processos', icon: '⚙️', description: 'Fluxos de trabalho, automações e como opera o negócio', fields: ['sales_process_steps', 'sales_cycle_days', 'follow_up_sla_hours'] },
  { key: 'business_model', title: 'Modelo de Negócio', icon: '💰', description: 'Como gera receita, estrutura de preços e margens', fields: ['business_model', 'pricing_model', 'average_ticket'] },
  { key: 'scripts', title: 'Scripts & Objeções', icon: '🛡️', description: 'Objeções comuns, scripts de vendas e estratégias de resposta', fields: ['objections_common', 'scripts'] },
] as const;

function isFieldFilled(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return value > 0;
  return !!value;
}

export function useContextScore(data: BusinessContext | null | undefined) {
  const blocks = useMemo((): BlockStatus[] => {
    if (!data) {
      return BLOCK_DEFINITIONS.map(def => ({
        key: def.key,
        title: def.title,
        icon: def.icon,
        description: def.description,
        fillPercent: 0,
        updatedAt: null,
        staleDays: 999,
        state: 'empty' as const,
      }));
    }

    const updatedAt = data.updated_at;
    const staleDays = updatedAt
      ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return BLOCK_DEFINITIONS.map(def => {
      const filled = def.fields.filter(f => isFieldFilled((data as any)[f])).length;
      const fillPercent = Math.round((filled / def.fields.length) * 100);
      
      let state: BlockStatus['state'] = 'empty';
      if (fillPercent === 0) state = 'empty';
      else if (staleDays > 30) state = 'stale';
      else if (staleDays > 14) state = 'aging';
      else state = 'filled';

      return {
        key: def.key,
        title: def.title,
        icon: def.icon,
        description: def.description,
        fillPercent,
        updatedAt,
        staleDays,
        state,
      };
    });
  }, [data]);

  const globalScore = useMemo(() => {
    if (blocks.length === 0) return 0;
    return Math.round(blocks.reduce((sum, b) => sum + b.fillPercent, 0) / blocks.length);
  }, [blocks]);

  const emptyCount = blocks.filter(b => b.state === 'empty').length;
  const totalBlocks = blocks.length;

  return { blocks, globalScore, emptyCount, totalBlocks };
}
