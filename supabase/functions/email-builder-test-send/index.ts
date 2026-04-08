import { createClient } from 'npm:@supabase/supabase-js@2'

const SENDER_DOMAIN = "notify.fastcrm.metodopare.ai"
const FROM_DOMAIN = "fastcrm.metodopare.ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { recipients, subject, html } = await req.json()

    if (!recipients?.length || !html || !subject) {
      return new Response(
        JSON.stringify({ error: 'recipients, subject e html são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (recipients.length > 5) {
      return new Response(
        JSON.stringify({ error: 'Máximo de 5 destinatários para teste' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/email-send-callback`
    const results: { email: string; success: boolean; error?: string }[] = []

    for (const email of recipients) {
      try {
        const res = await fetch(callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: email,
            from: `FastCRM <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: `[TESTE] ${subject}`,
            html,
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error(`Failed to send to ${email}:`, errText)
          results.push({ email, success: false, error: errText })
        } else {
          results.push({ email, success: true })
        }
      } catch (err) {
        console.error(`Error sending to ${email}:`, err)
        results.push({ email, success: false, error: String(err) })
      }
    }

    const successCount = results.filter(r => r.success).length
    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: recipients.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('email-builder-test-send error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
