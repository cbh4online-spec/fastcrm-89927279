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
  return stored.includes(candidate);
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
