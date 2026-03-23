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

  // Get bot info to identify our own messages
  let botId: number | null = null
  try {
    const meResp = await fetch(`${GATEWAY_URL}/getMe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    const meData = await meResp.json()
    if (meResp.ok) botId = meData.result?.id ?? null
  } catch (e) {
    console.warn('Could not fetch bot info:', e)
  }

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
        // Skip bot's own messages
        if (botId && row.from_user_id === botId) continue
        // Skip empty messages
        if (!row.text || row.text.trim().length === 0) continue

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

          // ===== AUTOPILOT AUTO-REPLY =====
          try {
            await handleAutopilotReply(
              supabase, supabaseUrl, supabaseServiceKey, LOVABLE_API_KEY, TELEGRAM_API_KEY,
              group.id, group.workspace_id, row.chat_id, row.text, row.from_username
            )
          } catch (autoErr) {
            console.warn('[AUTOPILOT-TG] Error:', autoErr)
          }
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

// =============================================================================
// AUTOPILOT AUTO-REPLY FOR TELEGRAM
// =============================================================================

async function handleAutopilotReply(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  lovableApiKey: string,
  telegramApiKey: string,
  groupId: string,
  workspaceId: string,
  chatId: number,
  userMessage: string,
  senderName: string | null,
) {
  // 1. Check autopilot config for this workspace (channel-specific or workspace-scope)
  let autopilotConfig: any = null

  // Try channel-specific config first
  const { data: channelConfig } = await supabase
    .from('autopilot_config')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('channel', 'telegram')
    .eq('is_active', true)
    .maybeSingle()

  if (channelConfig) {
    autopilotConfig = channelConfig
  } else {
    // Fallback to workspace-scope config
    const { data: wsConfig } = await supabase
      .from('autopilot_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('config_scope', 'workspace')
      .eq('is_active', true)
      .maybeSingle()
    
    autopilotConfig = wsConfig
  }

  if (!autopilotConfig) {
    // Autopilot not active for this workspace
    return
  }

  console.log('[AUTOPILOT-TG] Autopilot active for workspace', { workspaceId, configId: autopilotConfig.id })

  // 2. Check working hours
  if (autopilotConfig.respect_working_hours) {
    const now = new Date()
    const tz = autopilotConfig.timezone || 'Europe/Lisbon'
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
    const timeStr = formatter.format(now)
    const dayStr = dayFormatter.format(now)
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    const currentDay = dayMap[dayStr] ?? now.getDay()
    const workingDays = autopilotConfig.working_days || [1, 2, 3, 4, 5]

    if (!workingDays.includes(currentDay)) {
      console.log('[AUTOPILOT-TG] Outside working days')
      return
    }

    const start = autopilotConfig.working_hours_start || '09:00'
    const end = autopilotConfig.working_hours_end || '18:00'
    if (timeStr < start || timeStr > end) {
      console.log('[AUTOPILOT-TG] Outside working hours')
      // Send out-of-hours message if configured
      if (autopilotConfig.out_of_hours_message) {
        await sendTelegramMessage(lovableApiKey, telegramApiKey, chatId, autopilotConfig.out_of_hours_message)
      }
      return
    }
  }

  // 3. Check message limits (bot messages in last 24h in this group)
  const maxMessages = autopilotConfig.max_messages_per_conversation || 25
  const { count: botMsgCount } = await supabase
    .from('group_messages')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('sender_name', 'Bot AIDA')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (botMsgCount && botMsgCount >= maxMessages) {
    console.log('[AUTOPILOT-TG] Message limit reached', { count: botMsgCount, limit: maxMessages })
    return
  }

  // 4. Get AI agent for telegram channel (for persona/knowledge base)
  const { data: aiAgent } = await supabase
    .from('ai_agents')
    .select('id, persona_id, knowledge_base_ids, goal_config, autopilot_enabled')
    .eq('workspace_id', workspaceId)
    .eq('channel', 'telegram')
    .eq('is_active', true)
    .maybeSingle()

  // If there's a specific agent but autopilot isn't enabled on it, skip
  if (aiAgent && aiAgent.autopilot_enabled === false) {
    console.log('[AUTOPILOT-TG] Agent exists but autopilot_enabled=false')
    return
  }

  // 5. Get recent group messages for context
  const { data: recentMessages } = await supabase
    .from('group_messages')
    .select('content, sender_name, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(15)

  const orderedMessages = (recentMessages || []).reverse()
  const contextMessages = orderedMessages.map((m: any) => ({
    role: m.sender_name === 'Bot AIDA' ? 'assistant' : 'user',
    content: m.content || '',
    direction: m.sender_name === 'Bot AIDA' ? 'outbound' : 'inbound',
  }))

  // 6. Response delay
  const delayMin = autopilotConfig.response_delay_min ?? 0
  const delayMax = autopilotConfig.response_delay_max ?? 0
  const delaySec = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin
  if (delaySec > 0) {
    await new Promise(resolve => setTimeout(resolve, delaySec * 1000))
  }

  // 7. Generate AI response via ai-inbox-reply
  console.log('[AUTOPILOT-TG] Generating AI response')
  const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-inbox-reply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'suggest_reply',
      messages: contextMessages,
      channel: 'telegram',
      workspaceId,
      personaId: aiAgent?.persona_id || autopilotConfig.persona_id || null,
      useKnowledgeBase: true,
      knowledgeBaseIds: aiAgent?.knowledge_base_ids || undefined,
      goalConfig: aiAgent?.goal_config || undefined,
    }),
  })

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text()
    console.error('[AUTOPILOT-TG] AI response failed', { status: aiResponse.status, error: errorText })
    return
  }

  const aiResult = await aiResponse.json()
  const suggestion = aiResult.result?.suggestions?.[0]?.text || aiResult.suggestions?.[0]?.text || aiResult.flowResponse

  if (!suggestion) {
    console.log('[AUTOPILOT-TG] No response generated')
    return
  }

  console.log('[AUTOPILOT-TG] AI response ready', { preview: suggestion.substring(0, 80) })

  // 8. Typing simulation
  if (autopilotConfig.typing_indicator !== false) {
    await fetch(`${GATEWAY_URL}/sendChatAction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': telegramApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    }).catch(() => {})

    const typingDelay = Math.min(5, 1 + suggestion.length / 50)
    await new Promise(resolve => setTimeout(resolve, typingDelay * 1000))
  }

  // 9. Send reply via Telegram
  const sendResult = await sendTelegramMessage(lovableApiKey, telegramApiKey, chatId, suggestion)
  if (!sendResult) return

  // 10. Save bot reply as group_message
  await supabase.from('group_messages').insert({
    group_id: groupId,
    workspace_id: workspaceId,
    sender_name: 'Bot AIDA',
    content: suggestion,
    content_type: 'text',
    telegram_message_id: sendResult.message_id,
  })

  // 11. Log autopilot event
  await supabase.from('autopilot_events').insert({
    workspace_id: workspaceId,
    event_type: 'response_sent',
    event_data: {
      channel: 'telegram',
      group_id: groupId,
      message_preview: suggestion.substring(0, 100),
      persona_id: aiAgent?.persona_id || autopilotConfig.persona_id,
    },
  }).catch(() => {})

  console.log('[AUTOPILOT-TG] Response sent successfully')
}

async function sendTelegramMessage(
  lovableApiKey: string,
  telegramApiKey: string,
  chatId: number,
  text: string,
): Promise<any | null> {
  try {
    const resp = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': telegramApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      console.error('[AUTOPILOT-TG] Send failed', { status: resp.status, data })
      return null
    }
    return data.result
  } catch (err) {
    console.error('[AUTOPILOT-TG] Send error:', err)
    return null
  }
}
