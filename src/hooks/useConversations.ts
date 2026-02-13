import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "./useLeads";

export type ConversationChannel = "whatsapp" | "email" | "sms" | "webchat" | "instagram" | "facebook" | "messenger" | "live_chat" | "web_widget" | "phone" | "ghl" | "other";
export type ConversationStatus = "open" | "closed" | "archived";

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

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
          company:companies(id, name)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("conversation_priority_score", { ascending: false, nullsFirst: true })
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (filters?.status) {
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
    mutationFn: async ({ conversationId, assignTo }: { conversationId: string; assignTo: string | null }) => {
      const { data, error } = await workspaceClient
        .from("conversations")
        .update({ assigned_to: assignTo })
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

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ conversationId, status }: { conversationId: string; status: ConversationStatus }) => {
      const { data, error } = await workspaceClient
        .from("conversations")
        .update({ status })
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
