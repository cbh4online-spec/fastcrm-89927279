// whatsapp-zapi-webhook
// Receives all events from Z-API instance (messages, status changes, etc.)
// Public endpoint (no JWT) — secured via workspace_id query param + instance_id match.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';
import { validateWebhook, logSecurityEvent, getRemoteIp } from '../_shared/hmac.ts';

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

  const t0 = Date.now();
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('ws');

    if (!workspaceId) return jsonRes({ ok: true, ignored: 'no_ws' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Read raw body once for HMAC validation + JSON parsing
    const rawBody = await req.text();
    const payload = (() => { try { return JSON.parse(rawBody); } catch { return {}; } })() as Record<string, unknown>;
    const eventType: string = (payload?.type ?? payload?.event ?? '').toString();
    console.log(`[zapi-webhook] ws=${workspaceId} type=${eventType}`);

    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('id, instance_id, status, webhook_secret')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!conn) {
      console.warn(`[zapi-webhook] No Z-API connection for workspace ${workspaceId}`);
      await logSecurityEvent(admin, {
        workspace_id: workspaceId, provider: 'zapi', function_name: 'whatsapp-zapi-webhook',
        validation_mode: 'shared_secret', outcome: 'skipped', reason: 'no_connection',
        remote_ip: getRemoteIp(req), duration_ms: Date.now() - t0, payload_size: rawBody.length,
      });
      return jsonRes({ ok: true, ignored: true });
    }

    // Centralized secret validation (fail-closed if secret configured)
    const incomingSecret = url.searchParams.get('secret') || req.headers.get('x-webhook-secret');
    const v = await validateWebhook({
      mode: 'shared_secret', rawBody, secret: conn.webhook_secret,
      signatureHeader: incomingSecret, provider: 'zapi',
      functionName: 'whatsapp-zapi-webhook', workspaceId, instanceId: conn.id,
      remoteIp: getRemoteIp(req), optional: true, // se webhook_secret null → skipped
    });
    await logSecurityEvent(admin, {
      workspace_id: workspaceId, provider: 'zapi', instance_id: conn.id,
      function_name: 'whatsapp-zapi-webhook', validation_mode: 'shared_secret',
      outcome: v.outcome, reason: v.reason, remote_ip: getRemoteIp(req),
      signature_header: incomingSecret, duration_ms: Date.now() - t0, payload_size: rawBody.length,
    });
    if (!v.ok) {
      console.warn(`[zapi-webhook] secret_check_failed ws=${workspaceId} reason=${v.reason}`);
      return jsonRes({ ok: true, ignored: 'invalid_secret' });
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

    if (eventType === 'MessageStatusCallback' || eventType === 'MessageStatus') {
      // Z-API status: SENT | RECEIVED | READ | PLAYED | DELIVERED
      const rawStatus = String(payload?.status ?? '').toUpperCase();
      const ids: string[] = Array.isArray(payload?.ids)
        ? payload.ids.map((x: unknown) => String(x))
        : payload?.id || payload?.messageId
          ? [String(payload.id ?? payload.messageId)]
          : [];

      console.log(`[zapi-webhook] status=${rawStatus} ids=${ids.join(',')}`);

      if (ids.length > 0) {
        const msgUpdate: Record<string, unknown> = {};
        if (rawStatus === 'DELIVERED' || rawStatus === 'RECEIVED') {
          msgUpdate.delivered_at = now;
        } else if (rawStatus === 'READ' || rawStatus === 'PLAYED') {
          msgUpdate.read_at = now;
          msgUpdate.delivered_at = now; // read implies delivered
        }
        if (Object.keys(msgUpdate).length > 0) {
          const { error: upErr } = await admin
            .from('messages')
            .update(msgUpdate)
            .eq('workspace_id', workspaceId)
            .in('external_message_id', ids);
          if (upErr) {
            console.warn(`[zapi-webhook] status update failed: ${upErr.message}`);
          }
        }
      }

      await admin.from('whatsapp_zapi_connections').update(updates).eq('workspace_id', workspaceId);
      return jsonRes({ ok: true, processed: 'status', applied: ids.length });
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
    // Identificação canónica: só é grupo quando há um JID de grupo (`@g.us`
    // ou `<criador>-<timestamp>`). Nunca inferir grupo a partir de um telefone.
    const groupId: string | null = extractGroupIdFromPayload(payload);
    const isGroup: boolean = !!groupId;
    const participantIdent = isGroup
      ? normalizeParticipantId(
          payload?.participantPhone || payload?.participantLid || payload?.senderPhone || payload?.participant || '',
        )
      : null;
    const senderPhoneRaw: string = isGroup ? (participantIdent?.normalizedPhone ?? '') : phoneRaw;
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

    // Log estruturado do webhook
    try {
      await admin.rpc('log_whatsapp_webhook', {
        p_workspace_id: workspaceId,
        p_connection_id: conn.id,
        p_instance_id: conn.instance_id,
        p_event_type: eventType || 'ReceivedCallback',
        p_payload: { direction, message_type: extracted.messageType, conversation_id: conversationId, is_group: isGroup },
        p_processed: true,
        p_error: null,
        p_processing_ms: null,
      });
    } catch (logErr) {
      console.warn('[zapi-webhook] log failed', (logErr as Error).message);
    }

    // Disparar análise IA (fire-and-forget) apenas para inbound em DM, se a connection tiver auto-analyze ativo
    if (direction === 'inbound' && !isGroup) {
      try {
        const { data: connFlags } = await admin
          .from('whatsapp_zapi_connections')
          .select('ai_auto_analyze')
          .eq('id', conn.id)
          .maybeSingle();
        if (connFlags?.ai_auto_analyze !== false) {
          const baseFnUrl = Deno.env.get('SUPABASE_URL')!.replace('.supabase.co', '.functions.supabase.co');
          // Não esperamos pela resposta — fire & forget
          fetch(`${baseFnUrl}/whatsapp-conversation-ai-analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-call': '1',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
            },
            body: JSON.stringify({ conversationId, trigger_type: 'new_message' }),
          }).catch((e) => console.warn('[zapi-webhook] ai-analyze fire-and-forget failed', e?.message));
        }
      } catch (aiErr) {
        console.warn('[zapi-webhook] ai-analyze trigger failed', (aiErr as Error).message);
      }
    }

    return jsonRes({ ok: true, processed: 'message', conversationId, direction });
  } catch (err) {
    console.error('[zapi-webhook] Internal error:', err);
    return jsonRes({ ok: true, error: 'internal_error' });
  }
});
