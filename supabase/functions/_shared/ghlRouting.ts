// Shared GHL routing helpers — guarantees that conversations/messages
// are attributed to the workspace that actually owns the social account.
//
// Used by ghl-sync-conversations, ghl-webhook-message and the cleanup job.

export interface SocialChannelRow {
  workspace_id: string;
  ghl_account_id: string;
  channel_type: string; // instagram | facebook | whatsapp
  is_active: boolean;
}

/**
 * Map free-form GHL channel labels to our canonical social types.
 */
export function toSocialType(channel: string | undefined | null): string | null {
  if (!channel) return null;
  const map: Record<string, string> = {
    instagram: "instagram",
    ig: "instagram",
    messenger: "facebook",
    facebook: "facebook",
    fb: "facebook",
    whatsapp: "whatsapp",
    wa: "whatsapp",
  };
  return map[channel.toLowerCase()] ?? null;
}

/**
 * Match a candidate page/account id against the stored ghl_account_id.
 * Stored format is typically `<convProviderId>_<locationId>_<pageId>`,
 * so we accept exact, suffix and substring matches.
 */
export function matchAccountId(stored: string, candidate: string): boolean {
  if (!stored || !candidate) return false;
  if (stored === candidate) return true;
  if (stored.endsWith(`_${candidate}`)) return true;
  if (stored.includes(candidate)) return true;
  // Phone-like candidates (WhatsApp): compare digits only (+351 912 → 351912)
  const digits = candidate.replace(/\D/g, "");
  if (digits.length >= 9 && stored.replace(/\D/g, "").includes(digits)) return true;
  return false;
}


/**
 * Extract every plausible page/account identifier from a GHL conversation
 * detail payload (GET /conversations/{id}).
 */
export function extractAccountIdsFromConversation(detail: any): string[] {
  const out = new Set<string>();
  const push = (v: unknown) => {
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    if (s) out.add(s);
  };

  const conv = detail?.conversation ?? detail;
  if (!conv) return [];

  push(conv.providerOutboundUserId);
  push(conv.providerOutboundChannelId);
  push(conv.providerInboundUserId);
  push(conv.providerInboundChannelId);
  push(conv.conversationProviderId);
  push(conv.lastMessageMeta?.facebookPageId);
  push(conv.lastMessageMeta?.pageId);
  push(conv.lastMessageMeta?.igUserId);
  push(conv.lastMessageMeta?.instagramUserId);
  push(conv.lastMessageMeta?.fromNumber);
  push(conv.lastMessageMeta?.toNumber);

  const provider = conv.providerData ?? {};
  push(provider.pageId);
  push(provider.igUserId);
  push(provider.instagramUserId);
  push(provider.accountId);
  push(provider.recipient?.id);
  push(provider.sender?.id);

  return Array.from(out);
}

/**
 * Extract account ids from a single GHL message payload.
 */
export function extractAccountIdsFromMessage(msg: any): string[] {
  const out = new Set<string>();
  const push = (v: unknown) => {
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    if (s) out.add(s);
  };

  push(msg?.meta?.facebookPageId);
  push(msg?.meta?.pageId);
  push(msg?.meta?.igUserId);
  push(msg?.meta?.instagramUserId);
  push(msg?.meta?.fromNumber);
  push(msg?.meta?.toNumber);

  const provider = msg?.providerData ?? {};
  push(provider.pageId);
  push(provider.igUserId);
  push(provider.instagramUserId);
  push(provider.accountId);
  push(provider.recipient?.id);
  push(provider.sender?.id);

  push(msg?.conversationProviderId);

  return Array.from(out);
}

/**
 * Given a list of social channels and a list of candidate account ids,
 * return the workspace_id that owns the account, or null if no match.
 */
export function resolveWorkspaceFromAccountIds(
  channels: SocialChannelRow[],
  socialType: string,
  candidateIds: string[]
): { workspaceId: string; matchedAccountId: string } | null {
  const active = channels.filter(c => c.is_active && c.channel_type === socialType);
  for (const ch of active) {
    for (const cand of candidateIds) {
      if (matchAccountId(String(ch.ghl_account_id), String(cand))) {
        return { workspaceId: ch.workspace_id, matchedAccountId: ch.ghl_account_id };
      }
    }
  }
  return null;
}

export interface WorkspaceConfigRow {
  workspace_id: string;
  sync_messages?: boolean;
  is_primary?: boolean;
}

export type RoutingMethod =
  | "single_config"
  | "account_id_match"
  | "non_social_fallback";

export type RoutingFailureReason =
  | "no_workspace_owns_account_id"
  | "social_channel_missing_account_id"
  | "ambiguous_account_id_match";

export type RoutingDecision =
  | { ok: true; workspaceId: string; method: RoutingMethod; matchedAccountId?: string }
  | { ok: false; reason: RoutingFailureReason; candidateWorkspaces: string[] };

/**
 * Deterministic, isolation-safe workspace resolution for an inbound GHL message.
 *
 * Rules:
 *  - `configs` MUST already be filtered by the payload's location id.
 *  - Exactly one config for the location → that workspace.
 *  - Social channel (instagram/facebook/whatsapp) on a SHARED location → the
 *    account id in the payload must match exactly ONE workspace channel.
 *    No match, no account id, or more than one candidate workspace matching
 *    → fail closed (never guess, never fall back to `is_primary`).
 *  - Non-social channels (sms/email/chat/voice) keep the primary fallback.
 */
export function resolveWorkspaceForMessage(params: {
  configs: WorkspaceConfigRow[];
  channels: SocialChannelRow[];
  socialType: string | null;
  candidateAccountIds: string[];
}): RoutingDecision {
  const { configs, channels, socialType, candidateAccountIds } = params;
  const candidateWorkspaces = configs.map(c => c.workspace_id);

  if (configs.length === 1) {
    return { ok: true, workspaceId: configs[0].workspace_id, method: "single_config" };
  }

  if (socialType) {
    if (!candidateAccountIds.length) {
      return { ok: false, reason: "social_channel_missing_account_id", candidateWorkspaces };
    }

    const eligible = channels.filter(
      c => c.is_active && c.channel_type === socialType && candidateWorkspaces.includes(c.workspace_id),
    );

    const matches = eligible.filter(ch =>
      candidateAccountIds.some(cand => matchAccountId(String(ch.ghl_account_id), String(cand))),
    );

    const distinctWorkspaces = Array.from(new Set(matches.map(m => m.workspace_id)));

    if (distinctWorkspaces.length === 1) {
      return {
        ok: true,
        workspaceId: distinctWorkspaces[0],
        method: "account_id_match",
        matchedAccountId: matches[0].ghl_account_id,
      };
    }

    if (distinctWorkspaces.length > 1) {
      // Same account id claimed by several workspaces on a shared location.
      return { ok: false, reason: "ambiguous_account_id_match", candidateWorkspaces };
    }

    return { ok: false, reason: "no_workspace_owns_account_id", candidateWorkspaces };
  }

  const primary = configs.find(c => c.is_primary) ?? configs[0];
  return { ok: true, workspaceId: primary.workspace_id, method: "non_social_fallback" };
}


/**
 * Fetch conversation detail from GHL API.
 * Returns null on failure (caller should skip-safe).
 */
export async function fetchGHLConversationDetail(
  apiKey: string,
  conversationId: string
): Promise<any | null> {
  try {
    const r = await fetch(
      `https://services.leadconnectorhq.com/conversations/${conversationId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-04-15",
          Accept: "application/json",
        },
      }
    );
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/**
 * Best-effort audit logging — never throws.
 */
export async function logRoutingDecision(
  supabase: any,
  row: {
    source: "sync_conversations" | "webhook" | "cleanup";
    source_workspace_id?: string | null;
    resolved_workspace_id?: string | null;
    ghl_location_id?: string | null;
    ghl_conversation_id?: string | null;
    ghl_account_id?: string | null;
    channel_type?: string | null;
    action: "imported" | "skipped_wrong_workspace" | "unrouted" | "moved";
    reason?: string;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from("ghl_routing_audit").insert(row);
  } catch (err) {
    console.error("[GHL-ROUTE-AUDIT] insert failed (non-blocking)", err);
  }
}
