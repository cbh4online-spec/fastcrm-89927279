import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Lead } from "./useLeads";

export type ConversationChannel = "whatsapp" | "email" | "sms" | "webchat" | "instagram" | "facebook";
export type ConversationStatus = "open" | "closed" | "archived";

export interface Conversation {
  id: string;
  workspace_id: string;
  channel: ConversationChannel;
  external_thread_id: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  status: ConversationStatus;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: Pick<Lead, "id" | "name" | "email" | "phone"> | null;
}

export interface ConversationFilters {
  status?: ConversationStatus;
  channel?: ConversationChannel;
  assigned_to?: string;
  unread_only?: boolean;
}

export function useConversations(filters?: ConversationFilters) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["conversations", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = supabase
        .from("conversations")
        .select(`
          *,
          lead:leads(id, name, email, phone)
        `)
        .eq("workspace_id", currentWorkspace.id)
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

      const { data, error } = await query;

      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useConversation(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      if (!id || !currentWorkspace) return null;

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          lead:leads(id, name, email, phone)
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

  return useMutation({
    mutationFn: async ({ conversationId, assignTo }: { conversationId: string; assignTo: string | null }) => {
      const { data, error } = await supabase
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

  return useMutation({
    mutationFn: async ({ conversationId, status }: { conversationId: string; status: ConversationStatus }) => {
      const { data, error } = await supabase
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

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase
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
