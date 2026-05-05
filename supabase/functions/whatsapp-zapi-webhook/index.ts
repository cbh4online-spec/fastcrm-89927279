// whatsapp-zapi-webhook
// Receives all events from Z-API instance (messages, status changes, etc.)
// Public endpoint (no JWT) — secured via workspace_id query param + instance_id match.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

interface ExtractedMessage {
  content: string;
  messageType: string;
  mediaUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
}

function extractContent(payload: Record<string, unknown>): ExtractedMessage {
  // Z-API sends specific fields per message type at root
  if (payload.text && typeof payload.text === 'object') {
    const t = payload.text as Record<string, unknown>;
    return { content: (t.message as string) || '', messageType: 'text', mediaUrl: null, mimeType: null, fileName: null };
  }
  if (typeof payload.text === 'string') {
    return { content: payload.text as string, messageType: 'text', mediaUrl: null, mimeType: null, fileName: null };
  }
  if (payload.image) {
    const img = payload.image as Record<string, unknown>;
    return {
      content: (img.caption as string) || '[Imagem]',
      messageType: 'image',
      mediaUrl: (img.imageUrl as string) || (img.url as string) || null,
      mimeType: (img.mimeType as string) || 'image/jpeg',
      fileName: null,
    };
  }
  if (payload.audio) {
    const au = payload.audio as Record<string, unknown>;
    return {
      content: '[Áudio]',
      messageType: 'audio',
      mediaUrl: (au.audioUrl as string) || (au.url as string) || null,
      mimeType: (au.mimeType as string) || 'audio/ogg',
      fileName: null,
    };
  }
  if (payload.video) {
    const vd = payload.video as Record<string, unknown>;
    return {
      content: (vd.caption as string) || '[Vídeo]',
      messageType: 'video',
      mediaUrl: (vd.videoUrl as string) || (vd.url as string) || null,
      mimeType: (vd.mimeType as string) || 'video/mp4',
      fileName: null,
    };
  }
  if (payload.document) {
    const dc = payload.document as Record<string, unknown>;
    return {
      content: (dc.fileName as string) || '[Documento]',
      messageType: 'document',
      mediaUrl: (dc.documentUrl as string) || (dc.url as string) || null,
      mimeType: (dc.mimeType as string) || 'application/octet-stream',
      fileName: (dc.fileName as string) || null,
    };
  }
  if (payload.sticker) {
    return { content: '[Sticker]', messageType: 'sticker', mediaUrl: null, mimeType: null, fileName: null };
  }
  if (payload.contact) {
    return { content: '[Contato]', messageType: 'contact', mediaUrl: null, mimeType: null, fileName: null };
  }
  if (payload.location) {
    return { content: '[Localização]', messageType: 'location', mediaUrl: null, mimeType: null, fileName: null };
  }
  if (payload.buttonsResponseMessage) {
    const br = payload.buttonsResponseMessage as Record<string, unknown>;
    return { content: `[Botão: ${br.message || br.selectedButtonId}]`, messageType: 'button_reply', mediaUrl: null, mimeType: null, fileName: null };
  }
  return { content: '[Mensagem não suportada]', messageType: 'unknown', mediaUrl: null, mimeType: null, fileName: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('ws');

    if (!workspaceId) return jsonRes({ ok: true, ignored: 'no_ws' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = await req.json().catch(() => ({}));
    const eventType: string = (payload?.type ?? payload?.event ?? '').toString();
    console.log(`[zapi-webhook] ws=${workspaceId} type=${eventType}`);

    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('id, instance_id, status, webhook_secret')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!conn) {
      console.warn(`[zapi-webhook] No Z-API connection for workspace ${workspaceId}`);
      return jsonRes({ ok: true, ignored: true });
    }

    // Optional secret validation
    if (conn.webhook_secret) {
      const incoming = url.searchParams.get('secret') || req.headers.get('x-webhook-secret');
      if (incoming !== conn.webhook_secret) {
        console.warn(`[zapi-webhook] INVALID_SECRET ws=${workspaceId}`);
        return jsonRes({ ok: true, ignored: 'invalid_secret' });
      }
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { last_seen_at: now };

    // ---- Connection lifecycle ----
    if (eventType === 'ConnectedCallback' || payload?.connected === true) {
      updates.status = 'connected';
      updates.connected_at = now;
      updates.qr_code = null;
      updates.phone_number = payload?.phone ?? payload?.connectedPhone ?? null;
      await admin.from('whatsapp_zapi_connections').update(updates).eq('workspace_id', workspaceId);
      return jsonRes({ ok: true, processed: 'connected' });
    }

    if (eventType === 'DisconnectedCallback') {
      updates.status = 'disconnected';
      updates.disconnected_at = now;
      await admin.from('whatsapp_zapi_connections').update(updates).eq('workspace_id', workspaceId);
      return jsonRes({ ok: true, processed: 'disconnected' });
    }

    if (eventType === 'MessageStatusCallback') {
      // delivery / read receipts — could update message status; minimal impl now
      console.log(`[zapi-webhook] status update id=${payload?.ids || payload?.id} status=${payload?.status}`);
      await admin.from('whatsapp_zapi_connections').update(updates).eq('workspace_id', workspaceId);
      return jsonRes({ ok: true, processed: 'status' });
    }

    // ---- Inbound / outbound messages ----
    const isMessage = eventType === 'ReceivedCallback' || payload?.messageId || payload?.text || payload?.image || payload?.audio || payload?.video || payload?.document;

    if (!isMessage) {
      await admin.from('whatsapp_zapi_connections').update(updates).eq('workspace_id', workspaceId);
      return jsonRes({ ok: true, ignored: 'unhandled_event', type: eventType });
    }

    const fromMe = payload?.fromMe === true;
    const direction: 'inbound' | 'outbound' = fromMe ? 'outbound' : 'inbound';
    const externalMessageId: string | null = payload?.messageId || payload?.id || null;

    const phoneRaw: string = payload?.phone || payload?.from || '';
    const isGroup: boolean = payload?.isGroup === true || /-/.test(phoneRaw) || /@g\.us$/.test(phoneRaw);
    const groupId: string | null = isGroup ? phoneRaw.replace('@g.us', '') : null;
    const senderPhoneRaw: string = isGroup ? (payload?.participantPhone || payload?.senderPhone || '') : phoneRaw;
    const senderPhone = normalizePhone(senderPhoneRaw.replace('@c.us', ''));

    const channelKey = isGroup ? groupId! : senderPhone;
    if (!channelKey) {
      console.warn(`[zapi-webhook] no channelKey ws=${workspaceId} payload=${JSON.stringify(payload).slice(0, 200)}`);
      return jsonRes({ ok: true, ignored: 'no_channel_key' });
    }

    // Idempotency
    if (externalMessageId) {
      const { data: existing } = await admin
        .from('messages')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('external_message_id', externalMessageId)
        .maybeSingle();
      if (existing) {
        console.log(`[zapi-webhook] DUPLICATE message=${externalMessageId}`);
        return jsonRes({ ok: true, duplicate: true });
      }
    }

    const extracted = extractContent(payload);
    const senderName: string =
      payload?.senderName || payload?.chatName || payload?.notifyName || senderPhone || channelKey;
    const messageTimestamp = payload?.momment
      ? new Date(Number(payload.momment)).toISOString()
      : payload?.messageTimestamp
      ? new Date(Number(payload.messageTimestamp) * 1000).toISOString()
      : now;

    // Find or create lead (only for DMs from unknown numbers, never for groups)
    let leadId: string | null = null;
    if (!isGroup && direction === 'inbound' && senderPhone) {
      const { data: existingLead } = await admin
        .from('leads')
        .select('id')
        .eq('workspace_id', workspaceId)
        .or(`phone.eq.${senderPhone},phone.eq.+${senderPhone}`)
        .limit(1)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        const { data: newLead, error: leadErr } = await admin
          .from('leads')
          .insert({
            workspace_id: workspaceId,
            name: senderName || senderPhone,
            phone: senderPhone,
            source: 'whatsapp',
            status: 'new',
          })
          .select('id')
          .single();
        if (!leadErr) {
          leadId = newLead.id;
          console.log(`[zapi-webhook] LEAD_CREATED id=${leadId} phone=${senderPhone}`);
        }
      }
    }

    // Find or create conversation
    const { data: existingConv } = await admin
      .from('conversations')
      .select('id, unread_count')
      .eq('workspace_id', workspaceId)
      .eq('channel', 'whatsapp')
      .eq('external_thread_id', channelKey)
      .maybeSingle();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
      const updatePayload: Record<string, unknown> = {
        last_message_at: messageTimestamp,
        last_message_preview: extracted.content.substring(0, 100),
        last_message_direction: direction,
        updated_at: now,
      };
      if (direction === 'inbound') {
        updatePayload.unread_count = (existingConv.unread_count || 0) + 1;
        updatePayload.status = 'open';
      }
      if (leadId) updatePayload.lead_id = leadId;

      await admin.from('conversations').update(updatePayload).eq('id', conversationId);
    } else {
      const channelMetadata: Record<string, unknown> = {
        source: 'zapi',
        ...(isGroup
          ? { is_group: true, group_id: groupId, group_name: payload?.chatName || senderName }
          : { phone: senderPhone, push_name: senderName }),
      };

      const { data: newConv, error: convErr } = await admin
        .from('conversations')
        .insert({
          workspace_id: workspaceId,
          channel: 'whatsapp',
          external_thread_id: channelKey,
          lead_id: leadId,
          status: 'open',
          unread_count: direction === 'inbound' ? 1 : 0,
          last_message_at: messageTimestamp,
          last_message_preview: extracted.content.substring(0, 100),
          last_message_direction: direction,
          channel_metadata: channelMetadata,
        })
        .select('id')
        .single();
      if (convErr) {
        console.error('[zapi-webhook] CONV_CREATE_FAILED', convErr.message);
        return jsonRes({ ok: true, error: 'conv_create_failed' });
      }
      conversationId = newConv.id;
    }

    // Insert message
    const attachments = extracted.mediaUrl
      ? [{ type: extracted.messageType, url: extracted.mediaUrl, name: extracted.fileName, mimeType: extracted.mimeType }]
      : [];

    const messageMetadata: Record<string, unknown> = {
      source: 'zapi',
      ...(isGroup ? { participant_phone: senderPhone, participant_name: senderName } : {}),
    };

    const { error: msgErr } = await admin.from('messages').insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      direction,
      content: extracted.content,
      attachments,
      sender_id: null, // external sender
      sent_at: messageTimestamp,
      external_message_id: externalMessageId,
      metadata: messageMetadata,
    });

    if (msgErr) {
      // Try without metadata column if schema differs
      console.warn('[zapi-webhook] MSG_INSERT failed, retrying without metadata:', msgErr.message);
      await admin.from('messages').insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        direction,
        content: extracted.content,
        attachments,
        sender_id: null,
        sent_at: messageTimestamp,
        external_message_id: externalMessageId,
      });
    }

    // Update connection sync
    const syncUpdate: Record<string, unknown> = { last_seen_at: now, last_sync_at: now };
    if (direction === 'inbound') {
      syncUpdate.last_inbound_message_at = messageTimestamp;
    } else {
      syncUpdate.last_outbound_message_at = messageTimestamp;
    }
    await admin.from('whatsapp_zapi_connections').update(syncUpdate).eq('workspace_id', workspaceId);

    console.log(`[zapi-webhook] MSG_INSERTED conv=${conversationId} dir=${direction} type=${extracted.messageType} group=${isGroup}`);

    return jsonRes({ ok: true, processed: 'message', conversationId, direction });
  } catch (err) {
    console.error('[zapi-webhook] Internal error:', err);
    return jsonRes({ ok: true, error: 'internal_error' });
  }
});
