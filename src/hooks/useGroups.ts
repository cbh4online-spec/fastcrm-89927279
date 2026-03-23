import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const sb = supabase as any;

export interface Group {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  group_type: "internal" | "telegram" | "hybrid";
  purpose: "support" | "sales" | "community" | "team" | "general";
  telegram_chat_id: number | null;
  telegram_invite_link: string | null;
  settings: Record<string, any>;
  is_active: boolean;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  workspace_id: string;
  sender_user_id: string | null;
  sender_contact_id: string | null;
  sender_name: string | null;
  content: string | null;
  content_type: string;
  product_id: string | null;
  attachments: any[];
  telegram_message_id: number | null;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  telegram_user_id: number | null;
  telegram_username: string | null;
  role: string;
  is_muted: boolean;
  joined_at: string;
  profile?: { full_name: string | null; avatar_url: string | null; email: string | null } | null;
  contact?: { name: string | null; email: string | null } | null;
}

export function useGroups(purpose?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["groups", currentWorkspace?.id, purpose],
    queryFn: async () => {
      let query = sb
        .from("groups")
        .select("*, group_members(count)")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });

      if (purpose) {
        query = query.eq("purpose", purpose);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((g: any) => ({
        ...g,
        member_count: g.group_members?.[0]?.count ?? 0,
      })) as Group[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useGroupMessages(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Enrich with profiles
      const userIds = [...new Set((data || []).filter((m: any) => m.sender_user_id).map((m: any) => m.sender_user_id))];
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await sb
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      return (data || []).map((m: any) => ({
        ...m,
        profile: profileMap.get(m.sender_user_id) ?? null,
      })) as GroupMessage[];
    },
    enabled: !!groupId,
    refetchInterval: 5000, // Poll every 5s for new messages
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      // Enrich users with profiles
      const userIds = [...new Set((data || []).filter((m: any) => m.user_id).map((m: any) => m.user_id))];
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await sb
          .from("profiles")
          .select("user_id, full_name, avatar_url, email")
          .in("user_id", userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      // Enrich contacts
      const contactIds = [...new Set((data || []).filter((m: any) => m.contact_id).map((m: any) => m.contact_id))];
      let contactMap = new Map();
      if (contactIds.length > 0) {
        const { data: contacts } = await sb
          .from("contacts")
          .select("id, name, email")
          .in("id", contactIds);
        contactMap = new Map((contacts || []).map((c: any) => [c.id, c]));
      }

      return (data || []).map((m: any) => ({
        ...m,
        profile: profileMap.get(m.user_id) ?? null,
        contact: contactMap.get(m.contact_id) ?? null,
      })) as GroupMember[];
    },
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (group: Partial<Group>) => {
      const { data, error } = await sb
        .from("groups")
        .insert({
          ...group,
          workspace_id: currentWorkspace!.id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Auto-add creator as admin member
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        await sb.from("group_members").insert({
          group_id: data.id,
          workspace_id: currentWorkspace!.id,
          user_id: userId,
          role: "admin",
        });
      }

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Group> & { id: string }) => {
      const { data, error } = await sb
        .from("groups")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await sb.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useSendGroupMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      content,
      contentType = "text",
      productId,
    }: {
      groupId: string;
      content: string;
      contentType?: string;
      productId?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Get group to check if it has Telegram linked
      const { data: group } = await sb
        .from("groups")
        .select("telegram_chat_id, workspace_id, group_type")
        .eq("id", groupId)
        .single();

      // Save message locally
      const { data: msg, error } = await sb
        .from("group_messages")
        .insert({
          group_id: groupId,
          workspace_id: group.workspace_id,
          sender_user_id: userId,
          content,
          content_type: contentType,
          product_id: productId ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // If linked to Telegram, also send there
      if (group?.telegram_chat_id && (group.group_type === "telegram" || group.group_type === "hybrid")) {
        const { data: { session } } = await supabase.auth.getSession();
        const action = productId ? "sendProduct" : "sendMessage";

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              action,
              workspace_id: group.workspace_id,
              chat_id: group.telegram_chat_id,
              text: content,
              group_id: groupId,
              ...(productId ? { product_id: productId } : {}),
            }),
          }
        );

        let payload: any = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.hint || payload?.error || `Falha ao enviar para Telegram (${response.status})`);
        }
      }

      return msg;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["group-messages", vars.groupId] }),
  });
}

export function useTelegramConfig() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["telegram-config", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("telegram_config")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });
}

export function useSaveTelegramConfig() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (config: Record<string, any>) => {
      const { data, error } = await sb
        .from("telegram_config")
        .upsert(
          { ...config, workspace_id: currentWorkspace!.id, updated_at: new Date().toISOString() },
          { onConflict: "workspace_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["telegram-config"] }),
  });
}
