/**
 * Motor determinístico de Next Best Action para o ciclo WhatsApp.
 * Módulo puro — sem IA, sem I/O.
 */
import type { LeadTemperature, NextBestActionKind } from "./families";

export interface EngineLeadContext {
  leadId: string;
  workspaceId: string;
  /** Momento de referência (default: agora). */
  now?: Date;
  createdAt: string | Date;
  /** Última mensagem outbound enviada à lead. */
  lastOutboundAt?: string | Date | null;
  /** Última mensagem inbound recebida da lead. */
  lastInboundAt?: string | Date | null;
  /** Nº de mensagens outbound da sequência quente já enviadas. */
  outboundCount: number;
  hasReplied: boolean;
  hasPhone: boolean;
  optedOut: boolean;
  stopContact: boolean;
  automationActive: boolean;
  snoozeUntil?: string | Date | null;
  hasMeeting: boolean;
  hasProposal: boolean;
  proposalViewed?: boolean;
  proposalAcceptedAt?: string | Date | null;
  isLost: boolean;
  intent?: "postpone" | "objection" | "interested" | null;
  objetivoCliente?: string | null;
  problemaPrincipal?: string | null;
  consequencia?: string | null;
  timing?: string | null;
  temperature?: LeadTemperature | null;
}

export interface NextBestActionDecision {
  action: NextBestActionKind;
  templateCode: string | null;
  reason: string;
  priority: number;
  /** Momento em que a ação fica elegível (ISO). */
  dueAt: string | null;
  urgency: "low" | "medium" | "high" | "critical";
  confidence: "low" | "medium" | "high";
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function minutesBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 60000);
}

/** Janelas por número de mensagens já enviadas (minutos mínimos desde a última). */
const FOLLOWUP_LADDER: { count: number; code: string; minMinutes: number; priority: number }[] = [
  { count: 1, code: "LEAD_NEW_02", minMinutes: 15, priority: 85 },
  { count: 2, code: "LEAD_NEW_03", minMinutes: 240, priority: 75 },
  { count: 3, code: "LEAD_NEW_04", minMinutes: 1440, priority: 65 },
  { count: 4, code: "LEAD_NEW_05", minMinutes: 2880, priority: 55 },
];

export function decideNextBestAction(ctx: EngineLeadContext): NextBestActionDecision {
  const now = ctx.now ?? new Date();

  // 1. Bloqueios absolutos.
  if (ctx.stopContact || ctx.optedOut) {
    return {
      action: "STOP_CONTACT",
      templateCode: null,
      reason: ctx.optedOut ? "Lead pediu para não ser contactada (opt-out)." : "Contacto interrompido manualmente.",
      priority: 0,
      dueAt: null,
      urgency: "low",
      confidence: "high",
    };
  }
  if (!ctx.hasPhone) {
    return {
      action: "WAIT",
      templateCode: null,
      reason: "Lead sem telefone válido para WhatsApp.",
      priority: 0,
      dueAt: null,
      urgency: "low",
      confidence: "high",
    };
  }
  if (ctx.isLost) {
    return {
      action: "REACTIVATE",
      templateCode: null,
      reason: "Oportunidade perdida — elegível para reativação futura.",
      priority: 20,
      dueAt: null,
      urgency: "low",
      confidence: "medium",
    };
  }
  const accepted = toDate(ctx.proposalAcceptedAt);
  if (accepted) {
    return {
      action: "WAIT",
      templateCode: null,
      reason: "Proposta aceite — sequência comercial concluída.",
      priority: 10,
      dueAt: null,
      urgency: "low",
      confidence: "high",
    };
  }

  // 2. Snooze / follow-up adiado.
  const snooze = toDate(ctx.snoozeUntil);
  if (snooze && snooze > now) {
    return {
      action: "WAIT",
      templateCode: null,
      reason: `Contacto adiado a pedido da lead até ${snooze.toISOString().slice(0, 10)}.`,
      priority: 15,
      dueAt: snooze.toISOString(),
      urgency: "low",
      confidence: "high",
    };
  }

  // 3. Intenção explícita de adiamento.
  if (ctx.intent === "postpone" && !snooze) {
    return {
      action: "FOLLOW_UP",
      templateCode: "LEAD_NEW_06",
      reason: 'Lead indicou "agora não" — confirmar quando voltar a contactar.',
      priority: 80,
      dueAt: now.toISOString(),
      urgency: "medium",
      confidence: "high",
    };
  }

  if (ctx.intent === "objection") {
    return {
      action: "HANDLE_OBJECTION",
      templateCode: null,
      reason: "Objeção detetada na conversa — requer resposta comercial.",
      priority: 90,
      dueAt: now.toISOString(),
      urgency: "high",
      confidence: "medium",
    };
  }

  // 4. Estados de proposta e agendamento.
  if (ctx.hasProposal) {
    return {
      action: "FOLLOW_UP_PROPOSAL",
      templateCode: null,
      reason: ctx.proposalViewed
        ? "Proposta visualizada e ainda sem decisão."
        : "Proposta enviada e ainda sem visualização confirmada.",
      priority: 88,
      dueAt: now.toISOString(),
      urgency: "high",
      confidence: "medium",
    };
  }
  if (ctx.hasMeeting) {
    return {
      action: "WAIT",
      templateCode: null,
      reason: "Reunião agendada — prospeção suspensa até à reunião.",
      priority: 30,
      dueAt: null,
      urgency: "low",
      confidence: "high",
    };
  }

  // 5. Lead que já respondeu → qualificação.
  if (ctx.hasReplied) {
    if (!ctx.objetivoCliente) {
      return qualify("QUALIFY_01", "Lead respondeu — falta identificar o objetivo.", 90, now);
    }
    if (!ctx.problemaPrincipal) {
      return qualify("QUALIFY_02", "Objetivo conhecido — falta identificar o problema principal.", 88, now);
    }
    if (!ctx.consequencia) {
      return qualify("QUALIFY_03", "Problema conhecido — falta medir a consequência de não agir.", 84, now);
    }
    if (!ctx.timing) {
      return qualify("QUALIFY_04", "Falta classificar o timing e a intenção de compra.", 82, now);
    }
    return {
      action: "SCHEDULE_MEETING",
      templateCode: "QUALIFY_05",
      reason: "Lead qualificada (objetivo, problema, consequência e timing) e sem reunião marcada.",
      priority: 92,
      dueAt: now.toISOString(),
      urgency: "high",
      confidence: "high",
    };
  }

  // 6. Lead nova sem resposta — escada de follow-ups.
  if (ctx.outboundCount === 0) {
    const created = toDate(ctx.createdAt) ?? now;
    const age = minutesBetween(now, created);
    return {
      action: "SEND_MESSAGE",
      templateCode: "LEAD_NEW_01",
      reason: `Lead inbound recente (${age} min) e ainda sem primeiro contacto.`,
      priority: 95,
      dueAt: now.toISOString(),
      urgency: age > 5 ? "critical" : "high",
      confidence: "high",
    };
  }

  const lastOut = toDate(ctx.lastOutboundAt) ?? toDate(ctx.createdAt) ?? now;
  const sinceLast = minutesBetween(now, lastOut);
  const rung = FOLLOWUP_LADDER.find((r) => r.count === ctx.outboundCount);

  if (!rung) {
    // Escada esgotada → nurturing/reativação, sem eliminar a lead.
    return {
      action: "REACTIVATE",
      templateCode: null,
      reason: "Sequência quente esgotada sem resposta — mover para nurturing/reativação.",
      priority: 25,
      dueAt: null,
      urgency: "low",
      confidence: "high",
    };
  }

  if (sinceLast < rung.minMinutes) {
    const due = new Date(lastOut.getTime() + rung.minMinutes * 60000);
    return {
      action: "WAIT",
      templateCode: rung.code,
      reason: `Aguardar janela de ${rung.minMinutes} min antes de ${rung.code}.`,
      priority: 20,
      dueAt: due.toISOString(),
      urgency: "low",
      confidence: "high",
    };
  }

  return {
    action: rung.count === 1 ? "ASK_QUESTION" : "SEND_MESSAGE",
    templateCode: rung.code,
    reason: `Sem resposta há ${sinceLast} min após a mensagem ${ctx.outboundCount}.`,
    priority: rung.priority,
    dueAt: now.toISOString(),
    urgency: rung.count >= 4 ? "medium" : "high",
    confidence: "high",
  };
}

function qualify(code: string, reason: string, priority: number, now: Date): NextBestActionDecision {
  return {
    action: "ASK_QUESTION",
    templateCode: code,
    reason,
    priority,
    dueAt: now.toISOString(),
    urgency: "high",
    confidence: "high",
  };
}

/** Verificação final antes de qualquer envio automático (anti-corrida). */
export function canDispatch(ctx: EngineLeadContext): { allowed: boolean; blockReason?: string } {
  if (ctx.stopContact) return { allowed: false, blockReason: "stop_contact" };
  if (ctx.optedOut) return { allowed: false, blockReason: "opted_out" };
  if (!ctx.automationActive) return { allowed: false, blockReason: "automation_paused" };
  if (!ctx.hasPhone) return { allowed: false, blockReason: "no_phone" };
  if (ctx.hasReplied) return { allowed: false, blockReason: "lead_replied" };
  if (ctx.hasMeeting) return { allowed: false, blockReason: "meeting_scheduled" };
  if (ctx.isLost) return { allowed: false, blockReason: "lead_lost" };
  if (toDate(ctx.proposalAcceptedAt)) return { allowed: false, blockReason: "proposal_accepted" };
  const snooze = toDate(ctx.snoozeUntil);
  if (snooze && snooze > (ctx.now ?? new Date())) return { allowed: false, blockReason: "snoozed" };
  return { allowed: true };
}
