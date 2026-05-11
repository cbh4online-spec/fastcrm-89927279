import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "./useLeads";

export type ConversationChannel = "whatsapp" | "email" | "sms" | "webchat" | "instagram" | "facebook" | "messenger" | "live_chat" | "web_widget" | "phone" | "ghl" | "other";
export type ConversationStatus = "open" | "closed" | "pending" | "archived";

export interface ConversationContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface ConversationCompany {
  id: string;
  name: string;
}

export interface ConversationLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

export interface ConversationOpportunity {
  id: string;
  title: string;
  status: string;
  value: number | null;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  channel: ConversationChannel;
  external_thread_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  assigned_to: string | null;
  status: ConversationStatus;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  lead?: ConversationLead | null;
  contact?: ConversationContact | null;
  company?: ConversationCompany | null;
  opportunities?: ConversationOpportunity[];
  /** Resolved by phone normalization when conversation has no linked lead/contact/company */
  resolved_contact?: {
    type: "lead" | "contact" | "company";
    id: string;
    name: string;
    matched_phone?: string | null;
    /** True when multiple records share the same normalized phone — auto-link is skipped. */
    ambiguous?: boolean;
    candidates_count?: number;
  } | null;
  // AI Classification fields
  ai_priority?: "high" | "medium" | "low" | null;
  ai_intent?: "support" | "sales" | "question" | "follow_up" | "complaint" | "other" | null;
  ai_sentiment?: "positive" | "neutral" | "negative" | null;
  ai_classification_at?: string | null;
  user_priority?: "high" | "medium" | "low" | null;
  user_intent?: "support" | "sales" | "question" | "follow_up" | "complaint" | "other" | null;
  classification_confirmed?: boolean;
  classification_confirmed_at?: string | null;
  classification_confirmed_by?: string | null;
}

export interface ConversationFilters {
  status?: ConversationStatus;
  channel?: ConversationChannel;
  assigned_to?: string;
  unread_only?: boolean;
  lastMessageDirection?: "inbound" | "outbound";
}

export function useConversations(filters?: ConversationFilters) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  // Realtime subscription for conversations table
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const channel = supabase
      .channel(`conversations-realtime-${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });

          // Emit kernel event for new/updated conversations
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            import('@/lib/kernelEmitter').then(({ emitKernelEvent }) => {
              emitKernelEvent({
                workspace_id: currentWorkspace!.id,
                type: payload.eventType === 'INSERT' ? 'CONVERSATION.RECEIVED' : 'CONVERSATION.UPDATED',
                entity_kind: 'conversation',
                entity_id: row.id,
                payload: { channel: row.channel, status: row.status, lead_id: row.lead_id },
                source_module: 'comm-inbox',
                idempotency_key: `conv-${row.id}-${payload.eventType}-${row.updated_at}`,
              });
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Inbox Realtime] conversations subscription: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, queryClient]);

  return useQuery({
    queryKey: ["conversations", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("conversations")
        .select(`
          *,
          lead:leads(id, name, email, phone, status),
          contact:contacts(id, name, email, phone, company),
          company:companies(id, name),
          resolution:conversation_contact_resolutions(
            resolved_type, resolved_entity_id, resolved_entity_name,
            matched_phone, ambiguous, candidates_count, resolved_at
          )
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("conversation_priority_score", { ascending: false, nullsFirst: true })
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (filters?.status !== undefined) {
        query = query.eq("status", filters.status);
      }

      if (filters?.channel) {
        query = query.eq("channel", filters.channel);
      }

      if (filters?.assigned_to) {
        query = query.eq("assigned_to", filters.assigned_to);
      }

      if (filters?.unread_only) {
        query = query.gt("unread_count", 0);
      }

      if (filters?.lastMessageDirection) {
        query = query.eq("last_message_direction", filters.lastMessageDirection);
      }

      const { data: convData, error: convError } = await query;
      if (convError) throw convError;

      // Get all lead IDs that have conversations
      const leadIds = convData
        ?.map(c => c.lead?.id)
        .filter((id): id is string => !!id) || [];

      // Fetch open opportunities for these leads
      let opportunitiesMap: Record<string, ConversationOpportunity[]> = {};
      if (leadIds.length > 0) {
        const { data: oppsData } = await workspaceClient
          .from("opportunities")
          .select("id, title, status, value, lead_id")
          .in("lead_id", leadIds)
          .eq("status", "open");

        if (oppsData) {
          for (const opp of oppsData) {
            if (!opp.lead_id) continue;
            if (!opportunitiesMap[opp.lead_id]) {
              opportunitiesMap[opp.lead_id] = [];
            }
            opportunitiesMap[opp.lead_id].push({
              id: opp.id,
              title: opp.title,
              status: opp.status,
              value: opp.value,
            });
          }
        }
      }

      // Attach opportunities to conversations
      const conversationsWithOpps = convData?.map(conv => ({
        ...conv,
        opportunities: conv.lead?.id ? opportunitiesMap[conv.lead.id] || [] : [],
      })) || [];

      // ----- Resolve display name by phone for unlinked conversations -----
      // For conversations without lead/contact/company but with a phone-like
      // external_thread_id, look up matching leads/contacts/companies by phone
      // suffix (last 9 digits) so the inbox can show the real contact name
      // instead of the raw phone number.
      const phoneChannels: ConversationChannel[] = ["whatsapp", "sms", "phone", "ghl"];
      const unlinked = conversationsWithOpps.filter(
        (c) =>
          !c.lead?.id &&
          !c.contact?.id &&
          !c.company?.id &&
          phoneChannels.includes(c.channel as ConversationChannel) &&
          !!c.external_thread_id,
      );

      if (unlinked.length > 0) {
        // Lazy-load libphonenumber to keep the main bundle lean.
        const { parsePhoneNumberFromString } = await import("libphonenumber-js");

        // Robust normalization: try E.164 with PT default; fall back to a 9-digit
        // national-number suffix when parsing fails. Returns null when the input
        // has too few digits to be considered a phone number at all.
        const normalize = (raw: string | null | undefined): { key: string; e164: string | null; suffix: string } | null => {
          if (!raw) return null;
          const digits = String(raw).replace(/\D/g, "");
          if (digits.length < 7) return null;

          // Try parsing as-is, then with explicit '+' prefix when missing.
          let parsed = parsePhoneNumberFromString(raw, "PT");
          if ((!parsed || !parsed.isValid()) && !raw.startsWith("+") && digits.length >= 11) {
            parsed = parsePhoneNumberFromString(`+${digits}`);
          }

          if (parsed && parsed.isValid()) {
            const e164 = parsed.format("E.164"); // e.g. +351966014669
            const national = parsed.nationalNumber.toString();
            // Use national-number digits for suffix to avoid country-code collisions.
            return { key: e164, e164, suffix: national.slice(-9) };
          }

          // Fallback: keep raw digits suffix; prefix the key to avoid colliding
          // with E.164 keys.
          const suffix = digits.slice(-9);
          return { key: `~${suffix}`, e164: null, suffix };
        };

        type ConvNorm = { convId: string; key: string; suffix: string; raw: string };
        const convNorms: ConvNorm[] = [];
        const suffixSet = new Set<string>();
        for (const c of unlinked) {
          const n = normalize(c.external_thread_id);
          if (!n) continue;
          convNorms.push({ convId: c.id, key: n.key, suffix: n.suffix, raw: c.external_thread_id! });
          suffixSet.add(n.suffix);
        }

        if (suffixSet.size > 0) {
          // Broad DB filter via suffix ilike; final precision happens client-side via E.164 match.
          const orFilter = Array.from(suffixSet).map((s) => `phone.ilike.%${s}%`).join(",");

          const [leadsRes, contactsRes, companiesRes] = await Promise.all([
            workspaceClient
              .from("leads")
              .select("id, name, phone")
              .eq("workspace_id", currentWorkspace.id)
              .not("phone", "is", null)
              .or(orFilter)
              .limit(1000),
            workspaceClient
              .from("contacts")
              .select("id, name, phone")
              .eq("workspace_id", currentWorkspace.id)
              .not("phone", "is", null)
              .or(orFilter)
              .limit(1000),
            workspaceClient
              .from("companies")
              .select("id, name, phone")
              .eq("workspace_id", currentWorkspace.id)
              .not("phone", "is", null)
              .or(orFilter)
              .limit(1000),
          ]);

          // Group rows by normalized key per type — so we can detect ambiguity within a tier.
          type Row = { id: string; name: string; phone: string };
          const byKey: Record<"contact" | "lead" | "company", Map<string, Row[]>> = {
            contact: new Map(),
            lead: new Map(),
            company: new Map(),
          };

          const indexRows = (rows: Array<{ id: string; name: string | null; phone: string | null }> | null, type: "contact" | "lead" | "company") => {
            if (!rows) return;
            for (const r of rows) {
              if (!r.phone || !r.name) continue;
              const n = normalize(r.phone);
              if (!n) continue;
              const arr = byKey[type].get(n.key) || [];
              arr.push({ id: r.id, name: r.name, phone: r.phone });
              byKey[type].set(n.key, arr);
            }
          };
          indexRows(contactsRes.data as any, "contact");
          indexRows(leadsRes.data as any, "lead");
          indexRows(companiesRes.data as any, "company");

          const convResolution = new Map<string, NonNullable<Conversation["resolved_contact"]>>();

          for (const cn of convNorms) {
            // Walk priority tiers: contact → lead → company. Stop at first tier with matches.
            for (const type of ["contact", "lead", "company"] as const) {
              const candidates = byKey[type].get(cn.key);
              if (!candidates || candidates.length === 0) continue;

              // Deduplicate by id (same record could appear twice if phone has odd whitespace).
              const uniq = Array.from(new Map(candidates.map((c) => [c.id, c])).values());

              if (uniq.length === 1) {
                convResolution.set(cn.convId, {
                  type,
                  id: uniq[0].id,
                  name: uniq[0].name,
                  matched_phone: uniq[0].phone,
                });
              } else {
                // Ambiguous: multiple distinct records in the same tier share this phone.
                // Surface the first for display but flag it and skip auto-link.
                convResolution.set(cn.convId, {
                  type,
                  id: uniq[0].id,
                  name: uniq[0].name,
                  matched_phone: uniq[0].phone,
                  ambiguous: true,
                  candidates_count: uniq.length,
                });
              }
              break;
            }
          }

          if (convResolution.size > 0) {
            for (const c of conversationsWithOpps) {
              const r = convResolution.get(c.id);
              if (r) (c as any).resolved_contact = r;
            }

            // Persist the link only for unambiguous matches — never overwrite an existing link.
            const colMap = { lead: "lead_id", contact: "contact_id", company: "company_id" } as const;
            const groupBy = { lead: new Map<string, string[]>(), contact: new Map<string, string[]>(), company: new Map<string, string[]>() };
            for (const [convId, r] of convResolution.entries()) {
              if (r.ambiguous) continue;
              const m = groupBy[r.type];
              const arr = m.get(r.id) || [];
              arr.push(convId);
              m.set(r.id, arr);
            }

            const updates: Array<Promise<unknown>> = [];
            for (const type of ["contact", "lead", "company"] as const) {
              for (const [entityId, convIds] of groupBy[type].entries()) {
                updates.push(
                  Promise.resolve(
                    workspaceClient
                      .from("conversations")
                      .update({ [colMap[type]]: entityId } as any)
                      .in("id", convIds)
                      .is(colMap[type], null),
                  ).then((res: any) => {
                    if (res?.error) console.warn("[Inbox] auto-link conversation failed:", res.error.message);
                  }),
                );
              }
            }
            void Promise.allSettled(updates);
          }
        }
      }
      return conversationsWithOpps as Conversation[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useConversation(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      if (!id || !currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("conversations")
        .select(`
          *,
          lead:leads(id, name, email, phone, status),
          contact:contacts(id, name, email, phone, company),
          company:companies(id, name)
        `)
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as Conversation | null;
    },
    enabled: !!id && !!currentWorkspace,
  });
}

export function useAssignConversation() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ conversationId, assignTo, previousAssignedTo }: { conversationId: string; assignTo: string | null; previousAssignedTo?: string | null }) => {
      const { data, error } = await workspaceClient
        .from("conversations")
        .update({ assigned_to: assignTo })
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;
      return { conversation: data as Conversation, previousAssignedTo };
    },
    onSuccess: ({ conversation, previousAssignedTo }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] });

      // Emit CONVERSATION.ASSIGNED kernel event
      if (currentWorkspace?.id) {
        import('@/lib/kernelEmitter').then(({ emitKernelEvent }) => {
          import('@/lib/requestId').then(({ generateRequestId }) => {
            emitKernelEvent({
              workspace_id: currentWorkspace.id,
              type: 'CONVERSATION.ASSIGNED',
              entity_kind: 'conversation',
              entity_id: conversation.id,
              actor_type: 'user',
              payload: {
                assigned_to: conversation.assigned_to,
                previous_assigned_to: previousAssignedTo ?? null,
                channel: conversation.channel,
              },
              source_module: 'comm-inbox',
              correlation_id: generateRequestId(),
            });
          });
        });
      }
    },
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ conversationId, status, previousStatus }: { conversationId: string; status: ConversationStatus; previousStatus?: ConversationStatus }) => {
      const { data, error } = await workspaceClient
        .from("conversations")
        .update({ status })
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;
      return { conversation: data as Conversation, previousStatus };
    },
    onSuccess: ({ conversation, previousStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] });

      // Emit CONVERSATION.STATUS_CHANGED kernel event
      if (currentWorkspace?.id) {
        import('@/lib/kernelEmitter').then(({ emitKernelEvent }) => {
          import('@/lib/requestId').then(({ generateRequestId }) => {
            emitKernelEvent({
              workspace_id: currentWorkspace.id,
              type: 'CONVERSATION.STATUS_CHANGED',
              entity_kind: 'conversation',
              entity_id: conversation.id,
              actor_type: 'user',
              payload: {
                status: conversation.status,
                previous_status: previousStatus ?? null,
                channel: conversation.channel,
              },
              source_module: 'comm-inbox',
              correlation_id: generateRequestId(),
            });
          });
        });
      }
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await workspaceClient
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversation", data.id] });
    },
  });
}

export function useDeleteConversations() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (conversationIds: string[]) => {
      // First delete related messages
      const { error: messagesError } = await workspaceClient
        .from("messages")
        .delete()
        .in("conversation_id", conversationIds);

      if (messagesError) throw messagesError;

      // Then delete conversations
      const { error } = await workspaceClient
        .from("conversations")
        .delete()
        .in("id", conversationIds);

      if (error) throw error;
      return conversationIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
    },
  });
}

// Link conversation to contact
export function useLinkConversationToContact() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ conversationId, contactId }: { conversationId: string; contactId: string | null }) => {
      const { data, error } = await workspaceClient
        .from("conversations")
        .update({ contact_id: contactId })
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversation", data.id] });
    },
  });
}

// Link conversation to company
export function useLinkConversationToCompany() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ conversationId, companyId }: { conversationId: string; companyId: string | null }) => {
      const { data, error } = await workspaceClient
        .from("conversations")
        .update({ company_id: companyId })
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversation", data.id] });
    },
  });
}

// Update conversation priority (manual override)
export function useUpdateConversationPriority() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      priority,
      intent,
    }: { 
      conversationId: string; 
      priority?: "high" | "medium" | "low" | null;
      intent?: "support" | "sales" | "question" | "follow_up" | "complaint" | "other" | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (priority !== undefined) updates.user_priority = priority;
      if (intent !== undefined) updates.user_intent = intent;

      const { data, error } = await workspaceClient
        .from("conversations")
        .update(updates)
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversation", data.id] });
    },
  });
}
