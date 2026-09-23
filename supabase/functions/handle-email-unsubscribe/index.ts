import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  // Extract token from query params (GET) or body (POST)
  const url = new URL(req.url)
  let token: string | null = url.searchParams.get('token')

  if (req.method === 'POST') {
    // Detect RFC 8058 one-click unsubscribe: POST with form-encoded body
    // containing "List-Unsubscribe=One-Click". Email clients (Gmail, Apple Mail,
    // etc.) send this when the user clicks "Unsubscribe" in the mail UI.
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formText = await req.text()
      const params = new URLSearchParams(formText)
      // For one-click, token comes from query param (already set above).
      // Otherwise, token may be in the form body.
      if (!params.get('List-Unsubscribe')) {
        const formToken = params.get('token')
        if (formToken) {
          token = formToken
        }
      }
    } else {
      // JSON body (from the app's unsubscribe page)
      try {
        const body = await req.json()
        if (body.token) {
          token = body.token
        }
      } catch {
        // Fall through — token stays from query param
      }
    }
  }

  if (!token) {
    return jsonResponse({ error: 'Token is required' }, 400)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Look up the token
  const { data: tokenRecord, error: lookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (lookupError || !tokenRecord) {
    return jsonResponse({ error: 'Invalid or expired token' }, 404)
  }

  if (tokenRecord.used_at) {
    return jsonResponse({ valid: false, reason: 'already_unsubscribed' })
  }

  // GET: Validate token (the app's unsubscribe page calls this on load)
  if (req.method === 'GET') {
    return jsonResponse({ valid: true })
  }

  // POST: Process the unsubscribe
  // Atomic check-and-update to avoid TOCTOU race
  const { data: updated, error: updateError } = await supabase
    .from('email_unsubscribe_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
    .is('used_at', null)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error('Failed to mark token as used', { error: updateError })
    return jsonResponse({ error: 'Failed to process unsubscribe' }, 500)
  }

  if (!updated) {
    return jsonResponse({ success: false, reason: 'already_unsubscribed' })
  }

  // Add email to suppressed list (upsert to handle duplicates)
  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      { email: tokenRecord.email.toLowerCase(), reason: 'unsubscribe' },
      { onConflict: 'email' },
    )

  if (suppressError) {
    console.error('Failed to suppress email', { error: suppressError })
    return jsonResponse({ error: 'Failed to process unsubscribe' }, 500)
  }

  // Propagar para o SDR: parar inscrições activas com este email e registar
  // exclusão por workspace. Só em POST (confirmado); GET nunca é destrutivo.
  const email = tokenRecord.email.toLowerCase()
  const { data: stopped, error: sdrErr } = await supabase
    .from('sdr_enrollments')
    .update({ status: 'opted_out', opted_out_at: new Date().toISOString(), next_send_at: null })
    .ilike('prospect_email', email)
    .in('status', ['enrolled', 'sequenced', 'paused'])
    .select('id, workspace_id')
  if (sdrErr) {
    // Exclusão global já registada (suppressed_emails), que o executor verifica antes de cada envio.
    console.error('Failed to propagate SDR opt-out', { code: sdrErr.code })
  }
  const byWorkspace = new Map<string, string>()
  for (const r of stopped ?? []) if (!byWorkspace.has(r.workspace_id)) byWorkspace.set(r.workspace_id, r.id)
  for (const [workspace_id, enrollmentId] of byWorkspace) {
    const { error } = await supabase.from('sdr_suppressions').insert({
      workspace_id, email, reason: 'unsubscribe_link', source_enrollment_id: enrollmentId,
    })
    if (error && error.code !== '23505') console.error('Failed to insert SDR suppression', { code: error.code })
  }
  if (stopped?.length) {
    // Tabela da Fase 1 pode ainda não existir: erro ignorado de forma explícita.
    await supabase.from('sdr_step_attempts')
      .update({ status: 'cancelled', last_error: 'opted_out' })
      .in('enrollment_id', stopped.map((r) => r.id))
      .in('status', ['reserved', 'failed_retryable'])
  }

  console.log('Email unsubscribed', { sdr_enrollments_stopped: stopped?.length ?? 0 })

  return jsonResponse({ success: true })
})
