import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { phoneOptOutVariants } from "@/lib/whatsapp/phoneVariants";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

export interface EntityMessage {
  id: string;
  content: string;
  direction: string;
  sent_at: string;
  attachments: any;
  email_subject: string | null;
}

export interface EntityConversation {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  channel: string;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: string | null;
  unread_count: number;
  messages: EntityMessage[];
}

export function useEntityMessages(
  entityType: 'lead' | 'contact' | 'company',
  entityId: string | undefined,
  messageLimit = 100
) {
  const { user } = useAuth();
  const { workspaces, currentWorkspace } = useWorkspace();
  const workspaceIds = workspaces.map(w => w.id).sort();
  return useQuery({
    queryKey: ['entity-messages', user?.id, currentWorkspace?.id, workspaceIds, entityType, entityId, messageLimit],
    queryFn: async (): Promise<EntityConversation[]> => {
      if (!entityId || !user || !workspaceIds.length) return [];

      const column = entityType === 'lead' ? 'lead_id'
        : entityType === 'contact' ? 'contact_id'
        : 'company_id';

      // 1. Fetch conversations for this entity
      const select = 'id, workspace_id, channel, status, last_message_at, last_message_preview, last_message_direction, unread_count';
      const { data: direct, error: convError } = await supabase
        .from('conversations')
        .select(select)
        .in('workspace_id', workspaceIds)
        .eq(column, entityId)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      // 1b. WhatsApp guardado pela extensão: também pelo número do contacto/lead.
      let byPhone: typeof direct = [];
      if (entityType !== 'company') {
        const table = entityType === 'lead' ? 'leads' : 'contacts';
        const cols = entityType === 'lead' ? 'workspace_id, phone' : 'workspace_id, phone, whatsapp_number';
        const { data: ent, error: entityError } = await supabase.from(table).select(cols).eq('id', entityId).maybeSingle();
        if (entityError) throw entityError;
        const e = ent as { workspace_id?: string; phone?: string | null; whatsapp_number?: string | null } | null;
        const variants = [...new Set([...phoneOptOutVariants(e?.phone), ...phoneOptOutVariants(e?.whatsapp_number)])];
        if (e?.workspace_id && variants.length) {
          // Only exact recipient variants in accessible workspaces; RLS also enforces
          // private/assigned/shared conversation access. Never copy or relink rows.
          const { data, error } = await supabase.from('conversations').select(select)
            .in('workspace_id', workspaceIds).eq('channel', 'whatsapp').in('external_thread_id', variants);
          if (error) throw error;
          byPhone = data ?? [];
        }
      }
      const seen = new Set<string>();
      const conversations = [...(direct ?? []), ...(byPhone ?? [])]
        .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
        .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''));
      if (!conversations.length) return [];

      // Bound concurrency and paginate each thread independently: a busy thread
      // must not consume the global limit and hide every other conversation.
      const results: EntityConversation[] = [];
      for (let i = 0; i < conversations.length; i += 4) {
        const batch = await Promise.all(conversations.slice(i, i + 4).map(async conv => {
          const { data, error } = await supabase.from('messages')
            .select('id, content, direction, sent_at, attachments, email_subject')
            .eq('conversation_id', conv.id)
            .order('sent_at', { ascending: false }).order('id', { ascending: false })
            .range(0, messageLimit - 1);
          if (error) throw error;
          return { ...conv, workspace_name: workspaces.find(w => w.id === conv.workspace_id)?.name,
            messages: (data ?? []).reverse() };
        }));
        results.push(...batch);
      }
      return results;
    },
    enabled: !!entityId && !!user && workspaceIds.length > 0,
    refetchInterval: 30_000,
  });
}
