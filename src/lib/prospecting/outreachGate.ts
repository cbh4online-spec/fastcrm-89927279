import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ProspectingIdentityCheck, ProspectingIdentityStatus } from "@/lib/prospecting/identity";

/** Statuses that always stop outreach/cadence/conversion. */
export const OUTREACH_HARD_STOP: ReadonlySet<ProspectingIdentityStatus> = new Set([
  "blocked", "exists", "opportunity", "unavailable",
]);

export interface IdentityPartition<T> {
  allowed: T[];
  review: T[];
  stopped: T[];
  /** Selected but not on the current page or without a verified result. */
  ignored: number;
}

/**
 * Restricts a bulk action to profiles that are selected, on the visible page and
 * have a verified identity. `review` items need explicit user confirmation.
 */
export function partitionByIdentity<T extends { id: string }>(
  pageItems: T[],
  selectedIds: ReadonlySet<string>,
  identity: Record<string, ProspectingIdentityCheck> | undefined,
  identityReady: boolean,
): IdentityPartition<T> {
  const out: IdentityPartition<T> = { allowed: [], review: [], stopped: [], ignored: 0 };
  const pageIds = new Set(pageItems.map((p) => p.id));
  for (const id of selectedIds) if (!pageIds.has(id)) out.ignored += 1;
  for (const item of pageItems) {
    if (!selectedIds.has(item.id)) continue;
    const check = identityReady ? identity?.[item.id] : undefined;
    if (!check || check.status === "unavailable") { out.ignored += 1; continue; }
    if (check.status === "new") out.allowed.push(item);
    else if (check.status === "review") out.review.push(item);
    else out.stopped.push(item);
  }
  return out;
}

export type ConfirmOutreachStatus = ProspectingIdentityStatus | "sent" | "already_sent";

export interface ConfirmOutreachArgs {
  workspaceId: string;
  profileId: string;
  stepIndex: number;
  sentMessage: string;
  mediaUrl?: string | null;
  queueId?: string | null;
  allowReview?: boolean;
  message?: string | null;
  messagePlain?: string | null;
  tone?: string | null;
  scheduleFollowUps?: boolean;
  followUpMessages?: { step_index: number; message: string | null; message_plain: string | null }[];
}

export interface ConfirmOutreachResult {
  status: ConfirmOutreachStatus;
  recorded: boolean;
  queue_id?: string;
}

/**
 * Records a sent outreach through one transactional RPC that re-checks identity
 * (no cached result), locks profile+step and writes queue + outreach_step together.
 */
export async function confirmOutreachSent(
  client: SupabaseClient<Database>,
  args: ConfirmOutreachArgs,
): Promise<ConfirmOutreachResult> {
  const { data, error } = await (client as unknown as {
    rpc: (n: string, a: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  }).rpc("prospecting_confirm_outreach", {
    p_workspace_id: args.workspaceId,
    p_profile_id: args.profileId,
    p_step_index: args.stepIndex,
    p_sent_message: args.sentMessage,
    p_media_url: args.mediaUrl ?? null,
    p_queue_id: args.queueId ?? null,
    p_allow_review: args.allowReview ?? false,
    p_message: args.message ?? null,
    p_message_plain: args.messagePlain ?? null,
    p_tone: args.tone ?? null,
    p_schedule_followups: args.scheduleFollowUps ?? false,
    p_followup_messages: args.followUpMessages ?? [],
  });
  if (error) throw new Error(error.message);
  const record = (data ?? {}) as Record<string, unknown>;
  const status = typeof record.status === "string" ? (record.status as ConfirmOutreachStatus) : "unavailable";
  return { status, recorded: record.recorded === true, queue_id: typeof record.queue_id === "string" ? record.queue_id : undefined };
}

const STOP_MESSAGES: Record<string, string> = {
  blocked: "Envio não registado: este contacto está marcado como «Não contactar».",
  exists: "Envio não registado: este perfil já existe no CRM.",
  opportunity: "Envio não registado: existe uma oportunidade em curso.",
  unavailable: "Envio não registado: a verificação de registo existente não está disponível.",
  already_sent: "Este passo já estava registado como enviado.",
};

/**
 * Confirm with a fresh server check; a `review` result asks the user explicitly
 * (unless already confirmed) and retries with allowReview.
 */
export async function confirmOutreachWithReview(
  client: SupabaseClient<Database>,
  args: ConfirmOutreachArgs,
  askReview: () => boolean | Promise<boolean>,
): Promise<ConfirmOutreachResult> {
  let result = await confirmOutreachSent(client, args);
  if (result.status === "review" && !args.allowReview) {
    if (!(await askReview())) throw new Error("Registo cancelado: possível duplicado não confirmado.");
    result = await confirmOutreachSent(client, { ...args, allowReview: true });
  }
  if (result.status === "already_sent") return result;
  if (!result.recorded) throw new Error(STOP_MESSAGES[result.status] ?? "Envio não registado.");
  return result;
}

export const REVIEW_CONFIRM_TEXT =
  "Possível duplicado no CRM. Confirma que reviu o registo existente e quer registar este envio?";
