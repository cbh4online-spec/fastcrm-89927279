// whatsapp-pro-health-monitor
// Cron-driven sweep that polls Z-API status for every active connection and
// records transitions into whatsapp_health_events. Designed to be called
// every ~5 min by pg_cron, but is also safe to invoke manually.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
import { zapiCall, safeJson } from '../_shared/zapi.ts';

const POLL_TIMEOUT_MS = 8000;
const BATCH_LIMIT = 100;

type ConnRow = {
  id: string;
  workspace_id: string;
  instance_id: string | null;
  instance_token: string | null;
  client_token: string | null;
  status: string;
  consecutive_failures: number | null;
  qr_updated_at: string | null;
};

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: rows, error } = await admin
      .from('whatsapp_zapi_connections')
      .select('id, workspace_id, instance_id, instance_token, client_token, status, consecutive_failures, qr_updated_at')
      .not('instance_id', 'is', null)
      .in('status', ['connected', 'disconnected', 'qr_expired', 'error', 'reconnecting', 'waiting_for_scan'])
      .limit(BATCH_LIMIT);

    if (error) throw error;
    const connections = (rows ?? []) as ConnRow[];

    const results: Array<{ workspace_id: string; from: string; to: string; ok: boolean }> = [];

    for (const conn of connections) {
      if (!conn.instance_id || !conn.instance_token || !conn.client_token) continue;

      const fromStatus = conn.status;
      let toStatus = fromStatus;
      let connected = false;
      let lastError: string | null = null;
      let failures = conn.consecutive_failures ?? 0;

      try {
        const res = await withTimeout(
          zapiCall(
            { instanceId: conn.instance_id, instanceToken: conn.instance_token, clientToken: conn.client_token },
            '/status'
          ),
          POLL_TIMEOUT_MS
        );
        const json = await safeJson(res);
        connected = json?.connected === true;
        if (connected) {
          toStatus = 'connected';
          failures = 0;
        } else {
          failures += 1;
          // Z-API can return "smartphoneNotConnected" / "disconnected"
          toStatus = failures >= 2 ? 'disconnected' : fromStatus === 'connected' ? 'reconnecting' : fromStatus;
          lastError = typeof json?.error === 'string' ? json.error : null;
        }
      } catch (e) {
        failures += 1;
        lastError = e instanceof Error ? e.message : String(e);
        toStatus = failures >= 3 ? 'error' : fromStatus;
      }

      const updates: Record<string, unknown> = {
        status: toStatus,
        consecutive_failures: failures,
        last_health_check_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };
      if (connected) {
        updates.connected_at = updates.connected_at ?? new Date().toISOString();
        updates.last_error = null;
      }
      if (lastError) updates.last_error = lastError;
      if (toStatus === 'disconnected' && fromStatus === 'connected') {
        updates.disconnected_at = new Date().toISOString();
      }

      await admin.from('whatsapp_zapi_connections').update(updates).eq('id', conn.id);

      // Log transitions only (not steady state)
      if (toStatus !== fromStatus) {
        let evt: string | null = null;
        if (fromStatus === 'connected' && (toStatus === 'disconnected' || toStatus === 'reconnecting')) evt = 'disconnected';
        else if (toStatus === 'connected' && fromStatus !== 'connected') evt = 'recovered';
        else if (toStatus === 'qr_expired') evt = 'qr_expired';
        else if (toStatus === 'error') evt = 'error';
        else if (toStatus === 'reconnecting') evt = 'degraded';

        if (evt) {
          await admin.from('whatsapp_health_events').insert({
            workspace_id: conn.workspace_id,
            connection_id: conn.id,
            event_type: evt,
            from_status: fromStatus,
            to_status: toStatus,
            message: lastError,
          });
        }
      }

      results.push({ workspace_id: conn.workspace_id, from: fromStatus, to: toStatus, ok: connected });
    }

    return new Response(
      JSON.stringify({ success: true, swept: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[whatsapp-pro-health-monitor]', err);
    return new Response(
      JSON.stringify({ success: false, fallback: true, error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
