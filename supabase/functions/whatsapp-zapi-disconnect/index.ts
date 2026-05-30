// whatsapp-zapi-disconnect
// Disconnects WhatsApp from instance and (in master mode) deletes the instance.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
import { zapiCall, zapiMasterCall, getMasterCredentials } from '../_shared/zapi.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const { workspaceId } = await req.json();
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'workspaceId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: membership } = await admin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    let isSuperAdmin = false;
    if (!membership) {
      const { data: superAdminCheck } = await admin.rpc('is_super_admin', { _user_id: userId });
      isSuperAdmin = superAdminCheck === true;
    }

    if (!membership && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (conn?.instance_id && conn?.instance_token && conn?.client_token) {
      // Disconnect WhatsApp from instance
      try {
        await zapiCall(
          { instanceId: conn.instance_id, instanceToken: conn.instance_token, clientToken: conn.client_token },
          '/disconnect',
          { method: 'GET' }
        );
      } catch (e) {
        console.warn('[zapi-disconnect] Z-API disconnect call failed:', e);
      }

      // In master mode, delete the instance to free up the slot
      if (conn.account_mode === 'master') {
        try {
          const master = getMasterCredentials();
          await zapiMasterCall(master, `/instances/${conn.instance_id}`, { method: 'DELETE' });
        } catch (e) {
          console.warn('[zapi-disconnect] Master instance delete failed:', e);
        }
      }
    }

    await admin
      .from('whatsapp_zapi_connections')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        qr_code: null,
        // Clear sensitive tokens in master mode (instance deleted)
        ...(conn?.account_mode === 'master' && {
          instance_id: null,
          instance_token: null,
          client_token: null,
        }),
      })
      .eq('workspace_id', workspaceId);

    console.log(`[zapi-disconnect] DONE workspace=${workspaceId} mode=${conn?.account_mode}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[zapi-disconnect] Internal error:', err);
    return new Response(
      JSON.stringify({ error: 'internal_error', fallback: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
