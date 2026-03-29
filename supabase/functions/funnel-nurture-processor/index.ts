import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STEP_TEMPLATES = [
  'funnel-nurture-value',
  'funnel-nurture-social-proof',
  'funnel-nurture-last-chance',
]

// Delays after each step: step 0 sent → next in 2d, step 1 → next in 3d
const STEP_DELAYS_DAYS = [2, 3]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Fetch pending items ready to send
    const { data: items, error: fetchError } = await supabase
      .from('funnel_nurture_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_send_at', new Date().toISOString())
      .limit(50)

    if (fetchError) {
      console.error('Error fetching nurture queue:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let processed = 0
    let errors = 0

    for (const item of items) {
      try {
        const templateName = STEP_TEMPLATES[item.current_step]
        if (!templateName) {
          // All steps done
          await supabase
            .from('funnel_nurture_queue')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', item.id)
          processed++
          continue
        }

        // Send the email via direct fetch with service role key
        const sendBody = {
          templateName,
          recipientEmail: item.recipient_email,
          idempotencyKey: `nurture-${item.id}-step-${item.current_step}`,
          templateData: {
            name: item.recipient_name,
            funnelName: item.funnel_name,
          },
        }
        const sendRes = await fetch(
          `${supabaseUrl}/functions/v1/send-transactional-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`,
            },
            body: JSON.stringify(sendBody),
          }
        )
        const sendError = !sendRes.ok ? await sendRes.text() : null

        if (sendError) {
          console.error(`Error sending nurture email for ${item.id}:`, sendError)
          errors++
          continue
        }

        // Advance to next step
        const nextStep = item.current_step + 1
        const isLastStep = nextStep >= STEP_TEMPLATES.length

        if (isLastStep) {
          await supabase
            .from('funnel_nurture_queue')
            .update({
              current_step: nextStep,
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
        } else {
          const delayDays = STEP_DELAYS_DAYS[item.current_step] || 2
          const nextSendAt = new Date()
          nextSendAt.setDate(nextSendAt.getDate() + delayDays)

          await supabase
            .from('funnel_nurture_queue')
            .update({
              current_step: nextStep,
              next_send_at: nextSendAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
        }

        processed++
      } catch (itemError) {
        console.error(`Error processing nurture item ${item.id}:`, itemError)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ processed, errors, total: items.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Nurture processor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
