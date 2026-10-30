import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { phoneOptOutVariants } from "@/lib/whatsapp/phoneVariants";

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
  entityId: string | undefined
) {
  return useQuery({
    queryKey: ['entity-messages', entityType, entityId],
    queryFn: async (): Promise<EntityConversation[]> => {
      if (!entityId) return [];

      const column = entityType === 'lead' ? 'lead_id'
        : entityType === 'contact' ? 'contact_id'
        : 'company_id';

      // 1. Fetch conversations for this entity
      const select = 'id, channel, status, last_message_at, last_message_preview, last_message_direction, unread_count';
      const { data: direct, error: convError } = await supabase
        .from('conversations')
        .select(select)
        .eq(column, entityId)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      // 1b. WhatsApp guardado pela extensão: também pelo número do contacto/lead.
      let byPhone: typeof direct = [];
      if (entityType !== 'company') {
        const table = entityType === 'lead' ? 'leads' : 'contacts';
        const cols = entityType === 'lead' ? 'workspace_id, phone' : 'workspace_id, phone, whatsapp_number';
        const { data: ent } = await supabase.from(table).select(cols).eq('id', entityId).maybeSingle();
        const e = ent as { workspace_id?: string; phone?: string | null; whatsapp_number?: string | null } | null;
        const variants = [...new Set([...phoneOptOutVariants(e?.phone), ...phoneOptOutVariants(e?.whatsapp_number)])];
        if (e?.workspace_id && variants.length) {
          const { data } = await supabase.from('conversations').select(select)
            .eq('workspace_id', e.workspace_id).eq('channel', 'whatsapp').in('external_thread_id', variants);
          byPhone = data ?? [];
        }
      }
      const seen = new Set<string>();
      const conversations = [...(direct ?? []), ...(byPhone ?? [])]
        .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
        .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''));
      if (!conversations.length) return [];

      // 2. Fetch last 20 messages per conversation
      const conversationIds = conversations.map(c => c.id);
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('id, content, direction, sent_at, attachments, email_subject, conversation_id')
        .in('conversation_id', conversationIds)
        .order('sent_at', { ascending: false })
        .limit(200); // global limit, we'll slice per conversation

      if (msgError) throw msgError;

      // Group messages by conversation (max 20 each)
      const msgMap = new Map<string, EntityMessage[]>();
      for (const msg of (messages || [])) {
        const cid = (msg as any).conversation_id as string;
        if (!msgMap.has(cid)) msgMap.set(cid, []);
        const arr = msgMap.get(cid)!;
        if (arr.length < 20) {
          arr.push({
            id: msg.id,
            content: msg.content,
            direction: msg.direction,
            sent_at: msg.sent_at,
            attachments: msg.attachments,
            email_subject: msg.email_subject,
          });
        }
      }

      return conversations.map(conv => ({
        ...conv,
        messages: (msgMap.get(conv.id) || []).reverse(), // chronological order
      }));
    },
    enabled: !!entityId,
  });
}
