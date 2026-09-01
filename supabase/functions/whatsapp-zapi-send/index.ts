// whatsapp-zapi-send
// Send messages (text, media, buttons) via Z-API and persist outbound to inbox.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';
import { zapiCall, safeJson, type ZapiCredentials } from '../_shared/zapi.ts';

interface ButtonOption {
  id?: string;
  label: string;
  type?: 'CALL' | 'URL' | 'REPLY';
  phone?: string;
  url?: string;
}

interface SendBody {
  workspaceId: string;
  // Destination: one of phone | groupId | conversationId
  phone?: string;
  groupId?: string;
  conversationId?: string;
  // Content
  message?: string;
  // Optional media
  media?: {
    type: 'image' | 'audio' | 'video' | 'document';
    url: string;
    caption?: string;
    fileName?: string;
    ptt?: boolean; // Push-to-talk (audio only)
  };
  // Optional buttons (interactive)
  buttons?: ButtonOption[];
  buttonHeader?: string;
  buttonFooter?: string;
  /** Atraso de digitação (segundos, 1-15) suportado pelo Z-API. */
  delayMessage?: number;
}

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      console.error('[zapi-send] auth failed', userErr?.message);
      return jsonRes({ error: 'Unauthorized', details: userErr?.message }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json()) as SendBody;
    const { workspaceId, phone, groupId, conversationId, message, media, buttons, buttonHeader, buttonFooter } = body;

    if (!workspaceId) return jsonRes({ error: 'workspaceId required' }, 400);
    if (!phone && !groupId && !conversationId) {
      return jsonRes({ error: 'phone, groupId, or conversationId required' }, 400);
    }
    if (!message && !media) return jsonRes({ error: 'message or media required' }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Verify workspace membership (with super_admin bypass)
    const { data: membership } = await admin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!membership) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      let isSuperAdmin = false;
      if (profile?.id) {
        const { data: roles } = await admin
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id);
        isSuperAdmin = (roles ?? []).some((r: { role: string }) => r.role === 'super_admin');
      }
      if (!isSuperAdmin) return jsonRes({ error: 'Not a member of this workspace' }, 403);
    }


    // Fetch active connection
    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('instance_id, instance_token, client_token, status')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!conn || conn.status !== 'connected') {
      return jsonRes({ error: 'WhatsApp Z-API não está conectado' }, 400);
    }

    const creds: ZapiCredentials = {
      instanceId: conn.instance_id,
      instanceToken: conn.instance_token,
      clientToken: conn.client_token,
    };

    // Resolve destination
    let targetPhone = phone ? normalizePhone(phone) : '';
    let targetGroupId = groupId || '';
    let convData: any = null;

    if (conversationId && !targetPhone && !targetGroupId) {
      const { data: conv } = await admin
        .from('conversations')
        .select('external_thread_id, channel_metadata')
        .eq('id', conversationId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      convData = conv;
      if (conv) {
        const meta = (conv.channel_metadata as any) || {};
        if (meta.is_group && meta.group_id) {
          targetGroupId = meta.group_id;
        } else {
          targetPhone = normalizePhone(meta.phone || conv.external_thread_id || '');
        }
      }
    }

    if (!targetPhone && !targetGroupId) {
      return jsonRes({ error: 'Destino não pôde ser resolvido' }, 400);
    }

    // Build Z-API request
    const isGroup = !!targetGroupId;
    const destPayload: Record<string, unknown> = isGroup
      ? { phone: targetGroupId } // Z-API treats group id same field
      : { phone: targetPhone };

    let zapiPath = '';
    let zapiBody: Record<string, unknown> = { ...destPayload };
    let messagePreview = message || '';

    if (buttons && buttons.length > 0 && !media) {
      const actionButtons = buttons.filter((b) => b.type === 'URL' || b.type === 'CALL');
      zapiPath = actionButtons.length > 0 ? '/send-button-actions' : '/send-button-list';
      zapiBody = actionButtons.length > 0
        ? {
            ...destPayload,
            message: message || buttonHeader || '',
            title: buttonHeader || '',
            footer: buttonFooter || '',
            buttonActions: actionButtons.slice(0, 2).map((b, i) => ({
              id: b.id || `btn_${i}`,
              type: b.type,
              label: b.label,
              ...(b.type === 'URL' ? { url: b.url } : { phone: b.phone }),
            })),
          }
        : {
            ...destPayload,
            message: message || '',
            title: buttonHeader || '',
            footer: buttonFooter || '',
            buttonList: {
              buttons: buttons.slice(0, 3).map((b, i) => ({ id: b.id || `btn_${i}`, label: b.label })),
            },
          };
      messagePreview = `${message || ''} [${buttons.map((b) => b.label).join(' | ')}]`;
    } else if (media) {
      switch (media.type) {
        case 'image':
          zapiPath = '/send-image';
          zapiBody = { ...destPayload, image: media.url, caption: media.caption || '' };
          messagePreview = media.caption || '[Imagem]';
          break;
        case 'audio':
          zapiPath = '/send-audio';
          zapiBody = {
            ...destPayload,
            audio: media.url,
            // PTT: viewOnce=false, waveform=true, async=true → Z-API entrega como nota de voz
            ...(media.ptt
              ? { viewOnce: false, waveform: true, async: true }
              : {}),
          };
          messagePreview = media.ptt ? '[Nota de voz]' : '[Áudio]';
          break;
        case 'video':
          zapiPath = '/send-video';
          zapiBody = { ...destPayload, video: media.url, caption: media.caption || '' };
          messagePreview = media.caption || '[Vídeo]';
          break;
        case 'document':
          zapiPath = '/send-document/' + (media.fileName?.split('.').pop() || 'pdf');
          zapiBody = { ...destPayload, document: media.url, fileName: media.fileName || 'file' };
          messagePreview = `[Documento: ${media.fileName || 'file'}]`;
          break;
        default:
          return jsonRes({ error: 'Tipo de mídia não suportado' }, 400);
      }
    } else {
      // Text
      zapiPath = '/send-text';
      zapiBody = { ...destPayload, message };
    }

    // Atraso de digitação opcional (aplicável a texto e media)
    const delaySeconds = Number((body as SendBody).delayMessage);
    if (Number.isFinite(delaySeconds) && delaySeconds >= 1 && delaySeconds <= 15) {
      zapiBody.delayMessage = Math.round(delaySeconds);
    }

    console.log(`[zapi-send] ws=${workspaceId} to=${targetPhone || targetGroupId} type=${buttons ? 'buttons' : media?.type || 'text'}`);

    const res = await zapiCall(creds, zapiPath, {
      method: 'POST',
      body: JSON.stringify(zapiBody),
    });
    const zapiResp = await safeJson(res);

    if (!res.ok) {
      console.error('[zapi-send] Z-API error', res.status, zapiResp);
      return jsonRes({
        error: 'Falha ao enviar via Z-API',
        details: zapiResp?.error || zapiResp?.message || `HTTP ${res.status}`,
      }, 200); // 200 to avoid client crash, surface error in body
    }

    const externalMessageId =
      zapiResp?.id || zapiResp?.messageId || zapiResp?.zaapId || null;

    // Persist outbound to inbox
    const now = new Date().toISOString();
    const channelKey = targetGroupId || targetPhone;

    // Find or create conversation
    let convId = conversationId || null;
    if (!convId) {
      const { data: existingConv } = await admin
        .from('conversations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('channel', 'whatsapp')
        .eq('external_thread_id', channelKey)
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: newConv, error: convErr } = await admin
          .from('conversations')
          .insert({
            workspace_id: workspaceId,
            channel: 'whatsapp',
            external_thread_id: channelKey,
            status: 'open',
            unread_count: 0,
            last_message_at: now,
            last_message_preview: messagePreview.substring(0, 100),
            last_message_direction: 'outbound',
            channel_metadata: {
              source: 'zapi',
              ...(isGroup
                ? { is_group: true, group_id: targetGroupId }
                : { phone: targetPhone }),
            },
          })
          .select('id')
          .single();
        if (convErr) {
          console.error('[zapi-send] CONV_CREATE_FAILED', convErr.message);
        } else {
          convId = newConv.id;
        }
      }
    }

    if (convId) {
      const attachments = media
        ? [{ type: media.type, url: media.url, name: media.fileName, caption: media.caption, ptt: media.ptt || false }]
        : [];

      await admin.from('messages').insert({
        workspace_id: workspaceId,
        conversation_id: convId,
        direction: 'outbound',
        content: messagePreview,
        attachments,
        sender_id: userId,
        sent_at: now,
        external_message_id: externalMessageId,
      });

      await admin
        .from('conversations')
        .update({
          last_message_at: now,
          last_message_preview: messagePreview.substring(0, 100),
          last_message_direction: 'outbound',
          updated_at: now,
        })
        .eq('id', convId);
    }

    await admin
      .from('whatsapp_zapi_connections')
      .update({ last_sync_at: now, last_seen_at: now })
      .eq('workspace_id', workspaceId);

    return jsonRes({
      success: true,
      conversationId: convId,
      externalMessageId,
    });
  } catch (err) {
    console.error('[zapi-send] internal error', err);
    return jsonRes({ error: 'internal_error', details: String(err) }, 200);
  }
});
