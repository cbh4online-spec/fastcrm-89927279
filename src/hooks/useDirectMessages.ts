import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type DMConversationType = "dm" | "group" | "broadcast";

export interface DMConversation {
  id: string;
  workspace_id: string | null;
  conv_type: DMConversationType;
  title: string | null;
  created_by: string;
  last_message_at: string;
  created_at: string;
}

export interface DMMember {
  id: string;
  conversation_id: string;
  user_id: string;
  member_role: "member" | "admin";
  last_read_at: string;
  joined_at: string;
}

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface ConversationListItem extends DMConversation {
  members: { user_id: string; full_name: string | null; avatar_url: string | null; member_role: string }[];
  last_message: DMMessage | null;
  unread_count: number;
  display_title: string;
}

/* List my conversations with members + last message + unread count */
export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dm", "conversations", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ConversationListItem[]> => {
      const { data: myMembers, error: memErr } = await supabase
        .from("dm_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user!.id);
      if (memErr) throw memErr;
      const convIds = (myMembers ?? []).map((m) => m.conversation_id);
      if (convIds.length === 0) return [];

      const { data: convs, error: cErr } = await supabase
        .from("dm_conversations")
        .select("*")
        .in("id", convIds)
        .order("last_message_at", { ascending: false });
      if (cErr) throw cErr;

      const { data: allMembers } = await supabase
        .from("dm_members")
        .select("conversation_id, user_id, member_role")
        .in("conversation_id", convIds);

      const userIds = Array.from(new Set((allMembers ?? []).map((m) => m.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      // Last message per conversation
      const { data: lastMsgs } = await supabase
        .from("dm_messages")
        .select("*")
        .in("conversation_id", convIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const lastByConv = new Map<string, DMMessage>();
      (lastMsgs ?? []).forEach((m: any) => {
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m as DMMessage);
      });

      const lastReadByConv = new Map((myMembers ?? []).map((m) => [m.conversation_id, m.last_read_at]));

      return (convs ?? []).map((c: any) => {
        const members = (allMembers ?? [])
          .filter((m) => m.conversation_id === c.id)
          .map((m) => {
            const p = profileMap.get(m.user_id);
            return {
              user_id: m.user_id,
              full_name: p?.full_name ?? null,
              avatar_url: p?.avatar_url ?? null,
              member_role: m.member_role,
            };
          });

        const last = lastByConv.get(c.id) ?? null;
        const lastRead = lastReadByConv.get(c.id);
        const unread = (lastMsgs ?? []).filter(
          (m: any) =>
            m.conversation_id === c.id &&
            m.sender_id !== user!.id &&
            (!lastRead || new Date(m.created_at) > new Date(lastRead)),
        ).length;

        let display_title = c.title ?? "";
        if (c.conv_type === "dm") {
          const other = members.find((m) => m.user_id !== user!.id);
          display_title = other?.full_name || "Utilizador";
        } else if (c.conv_type === "broadcast") {
          display_title = c.title || "📢 Anúncio";
        } else if (!display_title) {
          display_title = "Grupo sem nome";
        }

        return { ...c, members, last_message: last, unread_count: unread, display_title };
      });
    },
  });
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dm", "messages", conversationId],
    enabled: !!conversationId && !!user?.id,
    queryFn: async (): Promise<DMMessage[]> => {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DMMessage[];
    },
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dm", "unread", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dm_unread_count");
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Mensagem vazia");
      if (trimmed.length > 5000) throw new Error("Mensagem demasiado longa (máx. 5000)");
      const { error } = await supabase
        .from("dm_messages")
        .insert({ conversation_id: conversationId, sender_id: user!.id, body: trimmed });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["dm", "messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["dm", "conversations"] });
    },
  });
}

export function useStartDM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      const { data, error } = await supabase.rpc("dm_start", { _other_user: otherUserId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dm", "conversations"] }),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { workspaceId: string; title: string; memberIds: string[] }) => {
      const { data, error } = await supabase.rpc("dm_create_group", {
        _workspace_id: params.workspaceId,
        _title: params.title,
        _member_ids: params.memberIds,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dm", "conversations"] }),
  });
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { title: string; body: string }) => {
      const { data, error } = await supabase.rpc("dm_create_broadcast", {
        _title: params.title,
        _body: params.body,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dm", "conversations"] }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc("dm_mark_read", { _conv_id: conversationId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dm", "conversations"] });
      qc.invalidateQueries({ queryKey: ["dm", "unread"] });
    },
  });
}

/** Workspace teammates. Super admin recebe TODOS os utilizadores da plataforma. */
export function useWorkspaceTeammates(
  workspaceId: string | null | undefined,
  isSuperAdmin: boolean = false,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dm", "teammates", workspaceId, user?.id, isSuperAdmin],
    enabled: !!user?.id && (isSuperAdmin || !!workspaceId),
    queryFn: async () => {
      // Super admin: lista global via RPC
      if (isSuperAdmin) {
        const { data, error } = await (supabase.rpc as any)("dm_list_all_users");
        if (error) throw error;
        return (data ?? []) as Array<{
          user_id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          workspaces: string | null;
        }>;
      }
      // Utilizador normal: apenas membros do workspace atual
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      const ids = (members ?? []).map((m) => m.user_id).filter((id) => id !== user!.id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", ids);
      return (profiles ?? []).map((p) => ({ ...p, workspaces: null }));
    },
  });
}
