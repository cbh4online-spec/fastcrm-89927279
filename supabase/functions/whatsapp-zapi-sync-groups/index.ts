// whatsapp-zapi-sync-groups
// Fetch groups list from Z-API and cache in whatsapp_zapi_groups.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';
import { zapiCall, safeJson, type ZapiCredentials } from '../_shared/zapi.ts';

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims?.sub) return jsonRes({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const { workspaceId } = await req.json();
    if (!workspaceId) return jsonRes({ error: 'workspaceId required' }, 400);

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();
    let isSuperAdmin = false;
    if (!membership) {
      const admin0 = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: superAdminCheck } = await admin0.rpc('is_super_admin', { _user_id: userId });
      isSuperAdmin = superAdminCheck === true;
    }
    if (!membership && !isSuperAdmin) return jsonRes({ error: 'Not a member of this workspace' }, 403);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

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

    // Z-API: GET /chats?type=group works; alternatively /groups
    const res = await zapiCall(creds, '/chats?type=group', { method: 'GET' });
    const data = await safeJson(res);

    if (!res.ok) {
      console.error('[zapi-sync-groups] Z-API error', res.status, data);
      return jsonRes({ error: 'Falha ao listar grupos', details: data }, 200);
    }

    const groups = Array.isArray(data) ? data : data?.chats || [];
    const now = new Date().toISOString();
    let upserted = 0;

    for (const g of groups) {
      const groupId = g.phone || g.id || g.groupId;
      if (!groupId) continue;
      const name = g.name || g.subject || groupId;

      const { error: upErr } = await admin
        .from('whatsapp_zapi_groups')
        .upsert({
          workspace_id: workspaceId,
          group_id: groupId,
          name,
          description: g.description || null,
          picture_url: g.image || g.imageUrl || null,
          participants_count: Array.isArray(g.participants) ? g.participants.length : (g.participantsCount || 0),
          is_admin: !!g.isAdmin,
          metadata_json: g,
          last_synced_at: now,
        }, { onConflict: 'workspace_id,group_id' });

      if (!upErr) upserted++;
    }

    console.log(`[zapi-sync-groups] ws=${workspaceId} synced=${upserted}/${groups.length}`);

    return jsonRes({ success: true, synced: upserted, total: groups.length });
  } catch (err) {
    console.error('[zapi-sync-groups] internal error', err);
    return jsonRes({ error: 'internal_error', details: String(err) }, 200);
  }
});
