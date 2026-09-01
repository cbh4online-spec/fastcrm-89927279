/**
 * Camada de acesso a dados das ferramentas MCP WhatsApp.
 *
 * A interface `WhatsAppMcpGateway` isola a lógica de negócio (service.ts)
 * da infraestrutura, permitindo testes sem rede/DB. A implementação real
 * usa o cliente Supabase autenticado com o utilizador do token OAuth (RLS).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceRole } from "@/contexts/WorkspaceContext";

export interface ResolvedEntity {
  kind: "contact" | "lead";
  id: string;
  name: string | null;
  phone: string | null;
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string | null;
  error?: string;
}

export interface ConversationMessage {
  id: string;
  direction: string;
  message_type: string;
  content: string;
  media_url: string | null;
  provider_status: string | null;
  external_message_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

export interface WhatsAppMcpGateway {
  getUserId(): string;
  getMembership(workspaceId: string): Promise<{ role: WorkspaceRole | null; isSuperAdmin: boolean }>;
  getContact(workspaceId: string, contactId: string): Promise<ResolvedEntity | null>;
  getLead(workspaceId: string, leadId: string): Promise<ResolvedEntity | null>;
  findEntitiesByPhone(workspaceId: string, e164: string): Promise<ResolvedEntity[]>;
  isOptedOut(workspaceId: string, e164: string): Promise<boolean>;
  hasConsent(workspaceId: string, e164: string): Promise<boolean>;
  isRateLimited(key: string, maxRequests: number, windowMs: number): Promise<boolean>;
  lookupIdempotency(workspaceId: string, key: string): Promise<Record<string, unknown> | null>;
  recordIdempotency(workspaceId: string, key: string, tool: string, result: Record<string, unknown>): Promise<void>;
  send(payload: {
    workspaceId: string;
    phone: string;
    contactId: string | null;
    messageType: "text" | "image" | "video";
    text?: string;
    mediaUrl?: string;
    delayMessage?: number;
    metadata: Record<string, unknown>;
  }): Promise<SendResult>;
  findConversationId(workspaceId: string, e164: string): Promise<string | null>;
  listMessages(workspaceId: string, conversationId: string, limit: number): Promise<ConversationMessage[]>;
  schedule(payload: {
    workspaceId: string;
    phone: string;
    contactId: string | null;
    leadId: string | null;
    body: string;
    scheduledAt: string;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string }>;
  audit(entry: {
    workspaceId: string;
    entityType: string;
    entityId: string;
    activityType: string;
    title: string;
    description?: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}

const digits = (v: string) => v.replace(/\D/g, "");

export function createSupabaseWhatsAppGateway(
  supabase: SupabaseClient,
  userId: string,
): WhatsAppMcpGateway {
  const client = supabase as unknown as SupabaseClient<never>;
  const anyClient = client as unknown as {
    from: (t: string) => any;
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    functions: { invoke: (n: string, o: { body: unknown }) => Promise<{ data: any; error: { message: string } | null }> };
  };

  return {
    getUserId: () => userId,

    async getMembership(workspaceId) {
      const { data } = await anyClient
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
      return { role: (data?.role as WorkspaceRole | undefined) ?? null, isSuperAdmin: false };
    },

    async getContact(workspaceId, contactId) {
      const { data } = await anyClient
        .from("contacts")
        .select("id, name, phone, whatsapp_number")
        .eq("workspace_id", workspaceId)
        .eq("id", contactId)
        .maybeSingle();
      if (!data) return null;
      return { kind: "contact", id: data.id, name: data.name ?? null, phone: data.whatsapp_number || data.phone || null };
    },

    async getLead(workspaceId, leadId) {
      const { data } = await anyClient
        .from("leads")
        .select("id, name, phone")
        .eq("workspace_id", workspaceId)
        .eq("id", leadId)
        .maybeSingle();
      if (!data) return null;
      return { kind: "lead", id: data.id, name: data.name ?? null, phone: data.phone ?? null };
    },

    async findEntitiesByPhone(workspaceId, e164) {
      const tail = digits(e164).slice(-9);
      const out: ResolvedEntity[] = [];
      const { data: contacts } = await anyClient
        .from("contacts")
        .select("id, name, phone, whatsapp_number")
        .eq("workspace_id", workspaceId)
        .or(`phone.ilike.%${tail},whatsapp_number.ilike.%${tail}`)
        .limit(5);
      for (const c of contacts ?? []) {
        out.push({ kind: "contact", id: c.id, name: c.name ?? null, phone: c.whatsapp_number || c.phone || null });
      }
      const { data: leads } = await anyClient
        .from("leads")
        .select("id, name, phone")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .ilike("phone", `%${tail}`)
        .limit(5);
      for (const l of leads ?? []) {
        out.push({ kind: "lead", id: l.id, name: l.name ?? null, phone: l.phone ?? null });
      }
      return out;
    },

    async isOptedOut(workspaceId, e164) {
      const { data, error } = await anyClient
        .from("whatsapp_optouts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .or(`phone.eq.${e164},phone.eq.${digits(e164)}`)
        .limit(1);
      if (error) return true; // fail-closed
      return (data ?? []).length > 0;
    },

    async hasConsent(workspaceId, e164) {
      const { data, error } = await anyClient.rpc("has_whatsapp_consent", {
        _workspace_id: workspaceId,
        _phone: e164,
      });
      if (error) return false; // fail-closed
      return data === true;
    },

    async isRateLimited(key, maxRequests, windowMs) {
      const { data, error } = await anyClient.rpc("check_rate_limit", {
        p_key: key,
        p_max_requests: maxRequests,
        p_window_ms: windowMs,
      });
      if (error) return true; // fail-closed
      return data === true;
    },

    async lookupIdempotency(workspaceId, key) {
      const { data } = await anyClient
        .from("whatsapp_mcp_requests")
        .select("result")
        .eq("workspace_id", workspaceId)
        .eq("idempotency_key", key)
        .maybeSingle();
      return (data?.result as Record<string, unknown> | undefined) ?? null;
    },

    async recordIdempotency(workspaceId, key, tool, result) {
      await anyClient
        .from("whatsapp_mcp_requests")
        .upsert(
          { workspace_id: workspaceId, idempotency_key: key, tool, result, created_by: userId },
          { onConflict: "workspace_id,idempotency_key" },
        );
    },

    async send(payload) {
      const { data, error } = await anyClient.functions.invoke("whatsapp-pro-send", {
        body: {
          workspaceId: payload.workspaceId,
          phone: payload.phone,
          contactId: payload.contactId,
          messageType: payload.messageType,
          text: payload.text,
          mediaUrl: payload.mediaUrl,
          delayMessage: payload.delayMessage,
          metadata: payload.metadata,
        },
      });
      if (error) return { success: false, error: error.message };
      if (data?.error) return { success: false, error: String(data.error) };
      return { success: !!data?.success, providerMessageId: data?.providerMessageId ?? null };
    },

    async findConversationId(workspaceId, e164) {
      const tail = digits(e164).slice(-9);
      const { data } = await anyClient
        .from("conversations")
        .select("id, last_message_at")
        .eq("workspace_id", workspaceId)
        .eq("channel", "whatsapp")
        .ilike("external_thread_id", `%${tail}%`)
        .order("last_message_at", { ascending: false })
        .limit(1);
      return data?.[0]?.id ?? null;
    },

    async listMessages(workspaceId, conversationId, limit) {
      const { data } = await anyClient
        .from("messages")
        .select(
          "id, direction, message_type, content, media_url, provider_status, external_message_id, sent_at, delivered_at, read_at",
        )
        .eq("workspace_id", workspaceId)
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: false })
        .limit(limit);
      return ((data ?? []) as ConversationMessage[]).reverse();
    },

    async schedule(payload) {
      const { data, error } = await anyClient
        .from("whatsapp_scheduled_messages")
        .insert({
          workspace_id: payload.workspaceId,
          to_phone: payload.phone,
          contact_id: payload.contactId,
          lead_id: payload.leadId,
          body: payload.body,
          scheduled_at: payload.scheduledAt,
          status: "pending",
          created_by: userId,
          metadata: payload.metadata,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id as string };
    },

    async audit(entry) {
      await anyClient.from("entity_activities").insert({
        workspace_id: entry.workspaceId,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        activity_type: entry.activityType,
        title: entry.title,
        description: entry.description ?? null,
        metadata: entry.metadata,
        created_by: userId,
      });
    },
  };
}
