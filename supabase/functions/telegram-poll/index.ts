import { createClient } from 'npm:@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'
const MAX_RUNTIME_MS = 55_000
const MIN_REMAINING_MS = 5_000

Deno.serve(async () => {
  const startTime = Date.now()

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')
  if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let totalProcessed = 0
  let currentOffset: number

  // Read initial offset
  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single()

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 })
  }

  currentOffset = state.update_offset

  // Poll continuously until time runs out
  while (true) {
    const elapsed = Date.now() - startTime
    const remainingMs = MAX_RUNTIME_MS - elapsed

    if (remainingMs < MIN_REMAINING_MS) break

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5)
    if (timeout < 1) break

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ['message', 'my_chat_member'],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 })
    }

    const updates = data.result ?? []
    if (updates.length === 0) continue

    // Store messages
    const rows = updates
      .filter((u: any) => u.message)
      .map((u: any) => ({
        update_id: u.update_id,
        chat_id: u.message.chat.id,
        from_user_id: u.message.from?.id ?? null,
        from_username: u.message.from?.username ?? null,
        text: u.message.text ?? null,
        raw_update: u,
        processed: false,
      }))

    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from('telegram_messages')
        .upsert(rows, { onConflict: 'update_id' })

      if (insertErr) {
        console.error('Insert error:', insertErr)
      } else {
        totalProcessed += rows.length
      }

      // Route messages to group_messages for known groups
      for (const row of rows) {
        const { data: group } = await supabase
          .from('groups')
          .select('id, workspace_id')
          .eq('telegram_chat_id', row.chat_id)
          .single()

        if (group) {
          // Find member by telegram_user_id
          let member: any = null
          if (row.from_user_id) {
            const { data: existingMember } = await supabase
              .from('group_members')
              .select('id, user_id, contact_id')
              .eq('group_id', group.id)
              .eq('telegram_user_id', row.from_user_id)
              .maybeSingle()

            if (existingMember) {
              member = existingMember
            } else {
              // Auto-register new Telegram member
              const firstName = row.raw_update?.message?.from?.first_name ?? ''
              const lastName = row.raw_update?.message?.from?.last_name ?? ''
              const displayName = `${firstName} ${lastName}`.trim() || row.from_username || `User ${row.from_user_id}`

              const { data: newMember } = await supabase
                .from('group_members')
                .insert({
                  group_id: group.id,
                  workspace_id: group.workspace_id,
                  telegram_user_id: row.from_user_id,
                  telegram_username: row.from_username,
                  role: 'member',
                })
                .select('id, user_id, contact_id')
                .single()

              member = newMember
              console.log(`Auto-registered Telegram member: ${displayName} (${row.from_user_id}) in group ${group.id}`)
            }
          }

          await supabase.from('group_messages').insert({
            group_id: group.id,
            workspace_id: group.workspace_id,
            sender_user_id: member?.user_id ?? null,
            sender_contact_id: member?.contact_id ?? null,
            sender_name: row.from_username ?? `User ${row.from_user_id}`,
            content: row.text,
            content_type: 'text',
            telegram_message_id: row.update_id,
          })

          // Mark as processed
          await supabase
            .from('telegram_messages')
            .update({ processed: true, workspace_id: group.workspace_id })
            .eq('update_id', row.update_id)
        }
      }
    }

    // Advance offset
    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1

    const { error: offsetErr } = await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1)

    if (offsetErr) {
      console.error('Offset update error:', offsetErr)
    }

    currentOffset = newOffset
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }))
})
