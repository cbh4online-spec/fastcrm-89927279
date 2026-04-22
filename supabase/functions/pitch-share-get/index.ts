import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token || token.length < 8 || token.length > 64) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('pitch_shares')
      .select('id, token, contact_name, company_name, tokens_snapshot, slide_titles, total_slides, expires_at, revoked_at, created_by')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (data.revoked_at) {
      return new Response(JSON.stringify({ error: 'revoked' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch creator profile (best-effort)
    let agent: { name: string | null; email: string | null; avatarUrl: string | null } | null = null;
    if (data.created_by) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('user_id', data.created_by)
        .maybeSingle();
      if (prof) {
        agent = {
          name: (prof as any).full_name ?? null,
          email: (prof as any).email ?? null,
          avatarUrl: (prof as any).avatar_url ?? null,
        };
      }
    }

    return new Response(
      JSON.stringify({
        id: data.id,
        token: data.token,
        contactName: data.contact_name,
        companyName: data.company_name,
        tokens: data.tokens_snapshot,
        slideTitles: data.slide_titles,
        totalSlides: data.total_slides,
        agent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('pitch-share-get error', e);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
