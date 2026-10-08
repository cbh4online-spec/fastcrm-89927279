// prospecting-bio-contact
// Lê a página do "link na bio" dos perfis indicados e preenche telefone/email
// apenas quando estão vazios. Leitura HTTP direta (sem créditos externos),
// limite de 25 perfis por pedido, isolado por workspace.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';
import { extractBioContacts, isSafePublicUrl } from '../_shared/bioContactExtract.ts';

const MAX_PROFILES = 25;
const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 1_500_000;
const UUID = /^[0-9a-f-]{36}$/i;

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FastCRM/1.0)', Accept: 'text/html' },
    });
    if (!res.ok || !isSafePublicUrl(res.url || url)) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('html')) return null;
    const text = await res.text();
    return text.slice(0, MAX_BYTES);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonRes({ error: 'Unauthorized' }, 401);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const workspaceId = String(body.workspaceId ?? '');
    const ids = Array.isArray(body.profileIds) ? body.profileIds.map(String).filter((i) => UUID.test(i)) : [];
    if (!UUID.test(workspaceId)) return jsonRes({ error: 'workspaceId inválido' }, 400);
    if (!ids.length || ids.length > MAX_PROFILES) {
      return jsonRes({ error: `Indique entre 1 e ${MAX_PROFILES} perfis` }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    const { data: membership } = await admin
      .from('workspace_members').select('id')
      .eq('workspace_id', workspaceId).eq('user_id', userData.user.id).maybeSingle();
    if (!membership) return jsonRes({ error: 'Not a workspace member' }, 403);

    const { data: profiles, error } = await admin
      .from('professional_prospecting_profiles')
      .select('id, instagram_external_url, extracted_phone, extracted_email')
      .eq('workspace_id', workspaceId).in('id', ids);
    if (error) return jsonRes({ error: 'Falha a ler perfis' }, 500);

    const summary = { checked: 0, no_link: 0, unreachable: 0, phones_found: 0, emails_found: 0 };
    const results: Array<{ id: string; phone: string | null; email: string | null }> = [];

    for (const p of profiles ?? []) {
      const url = p.instagram_external_url as string | null;
      if (!url || !isSafePublicUrl(url)) { summary.no_link++; continue; }
      if (p.extracted_phone && p.extracted_email) continue;
      summary.checked++;
      const html = await fetchHtml(url);
      if (!html) { summary.unreachable++; continue; }
      const found = extractBioContacts(html);
      const patch: Record<string, string> = {};
      if (!p.extracted_phone && found.phone) { patch.extracted_phone = `+${found.phone}`; summary.phones_found++; }
      if (!p.extracted_email && found.email) { patch.extracted_email = found.email; summary.emails_found++; }
      if (Object.keys(patch).length) {
        await admin.from('professional_prospecting_profiles').update(patch)
          .eq('workspace_id', workspaceId).eq('id', p.id);
        results.push({ id: p.id, phone: patch.extracted_phone ?? null, email: patch.extracted_email ?? null });
      }
    }
    console.log(`[bio-contact] ws=${workspaceId} ${JSON.stringify(summary)}`);
    return jsonRes({ ok: true, summary, results });
  } catch (e) {
    console.error(`[bio-contact] internal_error ${(e as Error).message}`);
    return jsonRes({ ok: false, error: 'internal_error' });
  }
});
