/**
 * Motor (puro) do assistente guiado do módulo "Contacto 1:1 validado".
 *
 * Não faz I/O, não envia nada e não esconde regras: cada passo bloqueado
 * explica o motivo e indica a área onde o operador o pode corrigir.
 */
import type { OutreachCheck, OutreachDraft, OutreachSuppression, OutreachValidation } from "../types";

export type OutreachStepId =
  | "validate"
  | "legal_basis"
  | "draft"
  | "review"
  | "prepare"
  | "follow_up";

export type OutreachStepStatus = "done" | "current" | "blocked" | "pending";

export interface OutreachWizardStep {
  id: OutreachStepId;
  title: string;
  description: string;
  status: OutreachStepStatus;
  /** Motivo do bloqueio, em linguagem simples. Vazio quando não está bloqueado. */
  blockedReason?: string;
  /** Etiqueta e destino do CTA (tab interna do módulo). */
  ctaLabel: string;
  ctaTarget: "validation" | "draft" | "channels" | "limits" | "audit";
}

export interface WizardInput {
  channel: "email" | "whatsapp" | "social";
  validation: OutreachValidation | null;
  draft: OutreachDraft | null;
  suppressions: OutreachSuppression[];
  /** Checks de elegibilidade já avaliados para o canal. */
  checks: OutreachCheck[];
  /** Última tentativa registada (simulada/bloqueada), se existir. */
  lastAttemptOutcome?: "blocked" | "simulated" | "sent" | "error" | null;
}

const STOP_REASONS: Record<string, string> = {
  opt_out: "A pessoa pediu para não ser contactada (opt-out).",
  blocked: "O contacto está bloqueado.",
  replied: "Já existe resposta — a sequência pára aqui.",
  manual: "Paragem manual registada pela equipa.",
};

export function activeStopReason(suppressions: OutreachSuppression[]): string | null {
  const found = suppressions.find((s) => STOP_REASONS[s.reason]);
  return found ? STOP_REASONS[found.reason] : null;
}

export function buildOutreachWizard(input: WizardInput): {
  steps: OutreachWizardStep[];
  currentStep: OutreachStepId;
  progress: number;
} {
  const { validation, draft, suppressions, checks, lastAttemptOutcome } = input;

  const stop = activeStopReason(suppressions);
  const check = (id: string) => checks.find((c) => c.id === id);
  const blockingFailures = checks.filter((c) => c.blocking && !c.passed);

  const validated = !!validation?.is_validated;
  const hasLegalBasis = !!validation?.legal_basis;
  const channelAllowed = !!check("channel_allowed")?.passed;
  const hasDraft = !!draft && !!draft.body?.trim();
  const reviewed = draft?.status === "reviewed" || draft?.status === "used";
  const prepared = lastAttemptOutcome === "simulated" || lastAttemptOutcome === "sent";

  const steps: OutreachWizardStep[] = [
    {
      id: "validate",
      title: "Validar entidade",
      description: "Confirme que este contacto/empresa pode ser abordado.",
      status: validated ? "done" : "current",
      blockedReason: validated ? undefined : "A entidade ainda não está marcada como validada.",
      ctaLabel: "Ir para validação",
      ctaTarget: "validation",
    },
    {
      id: "legal_basis",
      title: "Registar base legal e canal",
      description: "Base legal do contacto e canais autorizados.",
      status: !validated
        ? "pending"
        : hasLegalBasis && channelAllowed
          ? "done"
          : "blocked",
      blockedReason: !validated
        ? undefined
        : !hasLegalBasis
          ? "Falta registar a base legal ou o consentimento."
          : !channelAllowed
            ? "Este canal não está autorizado para a entidade."
            : undefined,
      ctaLabel: "Registar base legal",
      ctaTarget: "validation",
    },
    {
      id: "draft",
      title: "Criar rascunho",
      description: "Mensagem personalizada com factos reais da ficha.",
      status: !validated || !hasLegalBasis ? "pending" : hasDraft ? "done" : "current",
      blockedReason: hasDraft ? undefined : "Ainda não existe rascunho com conteúdo.",
      ctaLabel: "Escrever rascunho",
      ctaTarget: "draft",
    },
    {
      id: "review",
      title: "Rever",
      description: "Revisão humana obrigatória antes de qualquer preparação.",
      status: !hasDraft ? "pending" : reviewed ? "done" : "current",
      blockedReason: reviewed ? undefined : "O rascunho ainda não foi marcado como revisto.",
      ctaLabel: "Marcar como revisto",
      ctaTarget: "draft",
    },
    {
      id: "prepare",
      title: "Preparar envio",
      description: "Simulação segura: revalida tudo no servidor e não envia mensagem.",
      status: stop
        ? "blocked"
        : !reviewed
          ? "pending"
          : blockingFailures.length > 0
            ? "blocked"
            : prepared
              ? "done"
              : "current",
      blockedReason: stop
        ? stop
        : blockingFailures.length > 0 && reviewed
          ? blockingFailures.map((f) => f.detail ?? f.label).join(" · ")
          : undefined,
      ctaLabel: "Ir para canais",
      ctaTarget: "channels",
    },
    {
      id: "follow_up",
      title: "Acompanhar resposta",
      description: "Respostas, opt-out e bloqueios param imediatamente novos contactos.",
      status: stop ? "done" : prepared ? "current" : "pending",
      ctaLabel: "Ver histórico",
      ctaTarget: "audit",
    },
  ];

  const currentStep =
    steps.find((s) => s.status === "current")?.id ??
    steps.find((s) => s.status === "blocked")?.id ??
    "follow_up";

  const done = steps.filter((s) => s.status === "done").length;
  return { steps, currentStep, progress: Math.round((done / steps.length) * 100) };
}

/** Estado apresentável da ligação à instância. */
export type OutreachConnectionState = "not_configured" | "ready_simulation" | "error" | "active";

export function resolveConnectionState(input: {
  linkEnabled: boolean;
  linkMode: "disabled" | "simulation" | "live";
  providerConfigured: boolean;
  providerStatus?: string | null;
  lastProviderError?: string | null;
}): { state: OutreachConnectionState; label: string; hint: string } {
  if (input.lastProviderError) {
    return {
      state: "error",
      label: "Erro",
      hint: "O fornecedor reportou um erro. Reveja a configuração no backend.",
    };
  }
  if (!input.providerConfigured || !input.linkEnabled || input.linkMode === "disabled") {
    return {
      state: "not_configured",
      label: "Não configurada",
      hint: "Sem instância activa para este workspace. A preparação continua disponível em simulação.",
    };
  }
  if (input.linkMode === "simulation") {
    return {
      state: "ready_simulation",
      label: "Pronta para simulação",
      hint: "Tudo revalidado no servidor; nenhuma mensagem é enviada.",
    };
  }
  return {
    state: "active",
    label: "Ativa",
    hint: "Modo real selecionado — o envio continua desativado até decisão explícita do administrador.",
  };
}
