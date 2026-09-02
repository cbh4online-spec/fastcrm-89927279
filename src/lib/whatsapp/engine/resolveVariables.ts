/**
 * Resolvedor de variáveis comerciais do FastCRM WhatsApp Conversion Engine.
 *
 * Módulo puro: recebe os dados já carregados (lead, perfil comercial,
 * utilizador, workspace, proposta, reunião) e devolve o mapa de valores
 * consumido por `renderEngineMessage`.
 *
 * Nunca inventa valores. Quando a informação não existe, devolve `null`
 * e cabe ao render decidir entre fallback ou bloqueio do envio.
 */
import type { EngineVariable } from "./render";

export interface ResolveLeadInput {
  name?: string | null;
  company_name?: string | null;
  source?: string | null;
  tags?: string[] | null;
  industry?: string | null;
  notes?: string | null;
}

export interface ResolveProfileInput {
  objetivo_cliente?: string | null;
  problema_principal?: string | null;
  consequencia?: string | null;
  timing?: string | null;
  objecao_principal?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ResolveProposalInput {
  number?: string | null;
  total?: number | string | null;
  public_url?: string | null;
}

export interface ResolveMeetingInput {
  start_time?: string | null;
  duration_minutes?: number | null;
  meeting_url?: string | null;
}

export interface ResolveContext {
  lead?: ResolveLeadInput | null;
  profile?: ResolveProfileInput | null;
  proposal?: ResolveProposalInput | null;
  meeting?: ResolveMeetingInput | null;
  /** Nome do comercial responsável (utilizador autenticado ou dono da lead). */
  commercialName?: string | null;
  /** Nome da empresa do workspace (remetente). */
  workspaceName?: string | null;
  /** Produto/serviço de interesse, quando conhecido pelo contexto. */
  productInterest?: string | null;
  /** Link público de agendamento do workspace. */
  bookingUrl?: string | null;
  /** Pergunta binária de qualificação definida pelo comercial. */
  binaryQuestion?: string | null;
  /** Duração por omissão das reuniões, em minutos. */
  defaultMeetingMinutes?: number | null;
}

type Values = Partial<Record<EngineVariable, string | null>> & Record<string, string | null>;

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function firstName(full?: string | null): string | null {
  const n = clean(full);
  if (!n) return null;
  return n.split(/\s+/)[0] ?? null;
}

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!meta) return null;
  return clean(meta[key]);
}

function money(v: number | string | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
}

function dateParts(iso?: string | null): { date: string | null; time: string | null } {
  const s = clean(iso);
  if (!s) return { date: null, time: null };
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { date: null, time: null };
  return {
    date: new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long" }).format(d),
    time: new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(d),
  };
}

/**
 * Constrói o mapa de valores para as 24 variáveis do motor.
 * Variáveis sem fonte de dados ficam a `null` (nunca a texto inventado).
 */
export function resolveEngineVariables(ctx: ResolveContext): Values {
  const lead = ctx.lead ?? null;
  const profile = ctx.profile ?? null;
  const meta = profile?.metadata ?? null;
  const meeting = ctx.meeting ?? null;
  const { date: dataReuniao, time: horaReuniao } = dateParts(meeting?.start_time);

  return {
    primeiro_nome: firstName(lead?.name),
    nome_completo: clean(lead?.name),
    empresa: clean(ctx.workspaceName),
    comercial: clean(ctx.commercialName),
    produto_interesse: clean(ctx.productInterest) ?? metaString(meta, "produto_interesse"),
    servico_interesse: metaString(meta, "servico_interesse") ?? clean(ctx.productInterest),
    origem_lead: clean(lead?.source),
    campanha: metaString(meta, "campanha"),
    anuncio: metaString(meta, "anuncio"),
    funil: metaString(meta, "funil"),
    problema_principal: clean(profile?.problema_principal),
    objetivo_cliente: clean(profile?.objetivo_cliente),
    objecao: clean(profile?.objecao_principal),
    valor_proposta: money(ctx.proposal?.total),
    numero_proposta: clean(ctx.proposal?.number),
    link_proposta: clean(ctx.proposal?.public_url),
    data_reuniao: dataReuniao,
    hora_reuniao: horaReuniao,
    duracao_reuniao: clean(meeting?.duration_minutes ?? ctx.defaultMeetingMinutes),
    link_agendamento: clean(ctx.bookingUrl),
    link_reuniao: clean(meeting?.meeting_url),
    opcao_1: metaString(meta, "opcao_1"),
    opcao_2: metaString(meta, "opcao_2"),
    opcao_3: metaString(meta, "opcao_3"),
    pergunta_qualificacao_binaria:
      clean(ctx.binaryQuestion) ?? metaString(meta, "pergunta_qualificacao_binaria"),
  };
}
