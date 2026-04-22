import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideTime {
  index: number;
  id?: string;
  seconds: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { viewId, slidesSeen, totalSeconds, maxSlideIndex, completed } = body || {};

    if (!viewId || typeof viewId !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid_view' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Array.isArray(slidesSeen)) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitized: SlideTime[] = slidesSeen
      .slice(0, 100)
      .filter((s: any) => typeof s?.index === 'number' && typeof s?.seconds === 'number')
      .map((s: any) => ({
        index: Math.max(0, Math.min(500, Math.floor(s.index))),
        id: typeof s.id === 'string' ? s.id.slice(0, 60) : undefined,
        seconds: Math.max(0, Math.min(86400, Math.floor(s.seconds))),
      }));

    const total = Math.max(0, Math.min(86400, Math.floor(Number(totalSeconds) || 0)));
    const maxIdx = Math.max(0, Math.min(500, Math.floor(Number(maxSlideIndex) || 0)));
    const isCompleted = !!completed;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const update: Record<string, unknown> = {
      slides_seen: sanitized,
      total_seconds: total,
      max_slide_index: maxIdx,
      last_activity_at: new Date().toISOString(),
    };
    if (isCompleted) {
      update.completed = true;
      update.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('pitch_share_views')
      .update(update)
      .eq('id', viewId);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('pitch-share-track error', e);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
