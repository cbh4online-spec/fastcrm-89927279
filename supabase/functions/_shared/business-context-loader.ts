/**
 * Business Context Loader — Shared helper for Edge Functions
 * 
 * Loads the workspace's Context OS data (ICP, offers, tone of voice, goals, etc.)
 * and formats it as a system prompt block for AI calls.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface BusinessContextData {
  business_model: string | null;
  business_description: string | null;
  icp_description: string | null;
  icp_industries: string[] | null;
  icp_company_size: string | null;
  icp_decision_maker: string | null;
  icp_pain_points: string[] | null;
  offers: Array<{ name: string; price: string; type: string; description: string }>;
  pricing_model: string | null;
  average_ticket: number | null;
  sales_process_steps: string[] | null;
  sales_cycle_days: number | null;
  objections_common: string[] | null;
  scripts: Array<{ name: string; content: string; stage: string }>;
  follow_up_sla_hours: number | null;
  monthly_revenue_target: number | null;
  quarterly_revenue_target: number | null;
  annual_revenue_target: number | null;
  deals_target_monthly: number | null;
  team_size: number | null;
  team_roles: string[] | null;
  active_strategies: string[] | null;
}

export interface ContextOSResult {
  raw: BusinessContextData | null;
  systemPrompt: string;
  isEmpty: boolean;
}

/**
 * Load the business context for a workspace and format as a system prompt block.
 */
export async function loadBusinessContext(workspaceId: string): Promise<ContextOSResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await sb
    .from('business_context')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error || !data) {
    console.log(`[ContextLoader] No business context for workspace ${workspaceId}`);
    return { raw: null, systemPrompt: '', isEmpty: true };
  }

  const ctx = data as unknown as BusinessContextData;
  const sections: string[] = [];

  // Strategy
  if (ctx.business_description || ctx.business_model) {
    sections.push(`## Negócio\n- Modelo: ${ctx.business_model || 'N/A'}\n- Descrição: ${ctx.business_description || 'N/A'}`);
  }

  // ICP
  if (ctx.icp_description) {
    let icpBlock = `## Cliente Ideal (ICP)\n${ctx.icp_description}`;
    if (ctx.icp_industries?.length) icpBlock += `\n- Indústrias: ${ctx.icp_industries.join(', ')}`;
    if (ctx.icp_company_size) icpBlock += `\n- Dimensão empresa: ${ctx.icp_company_size}`;
    if (ctx.icp_decision_maker) icpBlock += `\n- Decisor: ${ctx.icp_decision_maker}`;
    if (ctx.icp_pain_points?.length) icpBlock += `\n- Dores: ${ctx.icp_pain_points.join('; ')}`;
    sections.push(icpBlock);
  }

  // Offers
  if (ctx.offers?.length) {
    const offerLines = ctx.offers.map(o => `  - ${o.name} (${o.type}): ${o.price} — ${o.description}`).join('\n');
    sections.push(`## Ofertas\n${offerLines}`);
    if (ctx.pricing_model) sections.push(`- Modelo de preço: ${ctx.pricing_model}`);
    if (ctx.average_ticket) sections.push(`- Ticket médio: €${ctx.average_ticket}`);
  }

  // Goals
  const goals: string[] = [];
  if (ctx.monthly_revenue_target) goals.push(`Receita mensal: €${ctx.monthly_revenue_target}`);
  if (ctx.quarterly_revenue_target) goals.push(`Receita trimestral: €${ctx.quarterly_revenue_target}`);
  if (ctx.deals_target_monthly) goals.push(`Deals/mês: ${ctx.deals_target_monthly}`);
  if (goals.length) sections.push(`## Metas\n${goals.map(g => `- ${g}`).join('\n')}`);

  // Sales Process
  if (ctx.sales_process_steps?.length) {
    sections.push(`## Processo de Vendas\n${ctx.sales_process_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    if (ctx.sales_cycle_days) sections.push(`- Ciclo médio: ${ctx.sales_cycle_days} dias`);
    if (ctx.follow_up_sla_hours) sections.push(`- SLA follow-up: ${ctx.follow_up_sla_hours}h`);
  }

  // Objections & Scripts
  if (ctx.objections_common?.length) {
    sections.push(`## Objeções Comuns\n${ctx.objections_common.map(o => `- ${o}`).join('\n')}`);
  }
  if (ctx.scripts?.length) {
    const scriptLines = ctx.scripts.map(s => `### ${s.name} (${s.stage})\n${s.content}`).join('\n\n');
    sections.push(`## Scripts\n${scriptLines}`);
  }

  // Team
  if (ctx.team_size || ctx.team_roles?.length) {
    let teamBlock = '## Equipa';
    if (ctx.team_size) teamBlock += `\n- Tamanho: ${ctx.team_size}`;
    if (ctx.team_roles?.length) teamBlock += `\n- Funções: ${ctx.team_roles.join(', ')}`;
    sections.push(teamBlock);
  }

  if (sections.length === 0) {
    return { raw: ctx, systemPrompt: '', isEmpty: true };
  }

  const systemPrompt = `<CONTEXTO_DO_NEGOCIO>\nUsa este contexto do negócio do utilizador para personalizar todas as respostas, sugestões e análises.\n\n${sections.join('\n\n')}\n</CONTEXTO_DO_NEGOCIO>`;

  console.log(`[ContextLoader] Loaded business context for ${workspaceId} — ${sections.length} sections`);
  return { raw: ctx, systemPrompt, isEmpty: false };
}
