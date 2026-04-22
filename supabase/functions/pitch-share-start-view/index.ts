import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function detectDevice(ua: string): string {
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, email, name } = body || {};

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return new Response(JSON.stringify({ error: 'invalid_email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: share, error: shareErr } = await supabase
      .from('pitch_shares')
      .select('id, expires_at, revoked_at, view_count, unique_viewers_count')
      .eq('token', token)
      .maybeSingle();

    if (shareErr) throw shareErr;
    if (!share) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (share.revoked_at) {
      return new Response(JSON.stringify({ error: 'revoked' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ua = req.headers.get('user-agent') || '';
    const fwd = req.headers.get('x-forwarded-for') || '';
    const ip = fwd.split(',')[0].trim() || null;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string') ? name.trim().slice(0, 120) : null;

    const { count: existingCount } = await supabase
      .from('pitch_share_views')
      .select('id', { count: 'exact', head: true })
      .eq('share_id', share.id)
      .eq('viewer_email', cleanEmail);

    const isNewViewer = (existingCount ?? 0) === 0;

    const { data: view, error: viewErr } = await supabase
      .from('pitch_share_views')
      .insert({
        share_id: share.id,
        viewer_email: cleanEmail,
        viewer_name: cleanName,
        ip_address: ip,
        user_agent: ua.slice(0, 500),
        device_type: detectDevice(ua),
      })
      .select('id')
      .single();

    if (viewErr) throw viewErr;

    await supabase
      .from('pitch_shares')
      .update({
        view_count: (share.view_count ?? 0) + 1,
        unique_viewers_count: (share.unique_viewers_count ?? 0) + (isNewViewer ? 1 : 0),
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', share.id);

    return new Response(JSON.stringify({ viewId: view.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('pitch-share-start-view error', e);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
