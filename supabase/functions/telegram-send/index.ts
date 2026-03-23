import { createClient } from 'npm:@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const telegramErrorResponse = (status: number, data: any) => {
  const description = data?.description || 'Telegram API error'
  const isBotToBot = typeof description === 'string' && description.toLowerCase().includes("bots can't send messages to bots")

  return new Response(JSON.stringify({
    success: false,
    error: description,
    error_code: isBotToBot ? 'bot_to_bot_not_allowed' : 'telegram_api_error',
    hint: isBotToBot
      ? 'Use a group/user chat_id (not a bot ID). Add your bot to the group and use that group chat ID.'
      : undefined,
    telegram_status: status,
    telegram_error: data,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')
  if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const body = await req.json()
    const { action, workspace_id, ...params } = body

    // Internal actions called by SQL triggers (via pg_net with anon key) skip user auth
    if (action === 'sendAlertInternal') {
      if (!workspace_id) {
        return new Response(JSON.stringify({ error: 'workspace_id is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: config } = await supabase
        .from('telegram_config')
        .select('alert_group_chat_id')
        .eq('workspace_id', workspace_id)
        .single()

      if (!config?.alert_group_chat_id) {
        return new Response(JSON.stringify({ success: true, skipped: 'No alert group configured' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { text: alertText, alert_type } = params
      const emoji = alert_type === 'new_lead' ? '🎯' : alert_type === 'new_deal' ? '💰' : alert_type === 'proposal' ? '📄' : 'ℹ️'
      const message = `${emoji} <b>${alert_type?.toUpperCase() || 'ALERTA'}</b>\n\n${alertText}`

      const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id: config.alert_group_chat_id, text: message, parse_mode: 'HTML' }),
      })
      const data = await response.json()

      return new Response(JSON.stringify({ success: response.ok, result: data.result }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Auth guard for user-facing actions
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a workspace member' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let result: any

    switch (action) {
      case 'sendMessage': {
        const { chat_id, text, parse_mode, group_id } = params
        const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chat_id, text, parse_mode: parse_mode || 'HTML' }),
        })
        const data = await response.json()
        if (!response.ok) {
          console.warn(`Telegram sendMessage failed [${response.status}]:`, data)
          return telegramErrorResponse(response.status, data)
        }
        
        // Save to group_messages if group_id provided
        if (group_id) {
          await supabase.from('group_messages').insert({
            group_id,
            workspace_id,
            sender_user_id: user.id,
            content: text,
            content_type: 'text',
            telegram_message_id: data.result?.message_id,
          })
        }
        
        result = data.result
        break
      }

      case 'sendProduct': {
        const { chat_id, product_id, group_id } = params

        // Fetch product details
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('name, description, price, sku, product_images(url)')
          .eq('id', product_id)
          .maybeSingle()

        if (productError) {
          console.error('Product query error:', productError)
          // Fallback: try without the relation join
          const { data: productBasic } = await supabase
            .from('products')
            .select('name, description, price, sku')
            .eq('id', product_id)
            .maybeSingle()
          if (!productBasic) {
            return new Response(JSON.stringify({ success: false, error: 'Product not found', hint: 'Check if the product_id exists in the products table' }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          // Use basic product without images
          const fallbackText = `🏷️ <b>${productBasic.name}</b>\n${productBasic.description ? productBasic.description + '\n' : ''}💰 ${productBasic.price}€\n📦 SKU: ${productBasic.sku || 'N/A'}`
          const fbResp = await fetch(`${GATEWAY_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id, text: fallbackText, parse_mode: 'HTML' }),
          })
          const fbData = await fbResp.json()
          if (!fbResp.ok) return telegramErrorResponse(fbResp.status, fbData)
          result = fbData.result
          // Save telegram_message_id
          if (group_id && result?.message_id) {
            await supabase.from('group_messages').insert({ group_id, workspace_id: params.workspace_id, content: fallbackText, content_type: 'product', product_id, telegram_message_id: result.message_id })
          }
          break
        }

        if (!product) {
          return new Response(JSON.stringify({ success: false, error: 'Product not found', hint: 'Check if the product_id exists in the products table' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const imageUrl = (product as any).product_images?.[0]?.url
        const text = `🏷️ <b>${product.name}</b>\n${product.description ? product.description + '\n' : ''}💰 ${product.price}€\n📦 SKU: ${product.sku || 'N/A'}`

        // Send photo if available, otherwise text
        if (imageUrl) {
          const response = await fetch(`${GATEWAY_URL}/sendPhoto`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': TELEGRAM_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chat_id, photo: imageUrl, caption: text, parse_mode: 'HTML' }),
          })
          const data = await response.json()
          if (!response.ok) {
            console.warn(`Telegram sendPhoto failed [${response.status}]:`, data)
            return telegramErrorResponse(response.status, data)
          }
          result = data.result
        } else {
          const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': TELEGRAM_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chat_id, text, parse_mode: 'HTML' }),
          })
          const data = await response.json()
          if (!response.ok) {
            console.warn(`Telegram sendMessage failed [${response.status}]:`, data)
            return telegramErrorResponse(response.status, data)
          }
          result = data.result
        }

        // Save to group messages
        if (group_id) {
          await supabase.from('group_messages').insert({
            group_id,
            workspace_id,
            sender_user_id: user.id,
            content: text,
            content_type: 'product',
            product_id,
            telegram_message_id: result?.message_id,
          })
        }
        break
      }

      case 'getMe': {
        const response = await fetch(`${GATEWAY_URL}/getMe`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(`Telegram getMe failed [${response.status}]: ${JSON.stringify(data)}`)
        result = data.result
        break
      }

      case 'createInviteLink': {
        const { chat_id } = params
        const response = await fetch(`${GATEWAY_URL}/exportChatInviteLink`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chat_id }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(`Telegram exportChatInviteLink failed [${response.status}]: ${JSON.stringify(data)}`)
        result = data.result
        break
      }

      case 'sendAlert': {
        // Send notification to team alert group
        const { data: config } = await supabase
          .from('telegram_config')
          .select('alert_group_chat_id')
          .eq('workspace_id', workspace_id)
          .single()

        if (!config?.alert_group_chat_id) {
          throw new Error('No alert group configured for this workspace')
        }

        const { text: alertText, alert_type } = params
        const emoji = alert_type === 'new_lead' ? '🎯' : alert_type === 'new_deal' ? '💰' : alert_type === 'proposal' ? '📄' : 'ℹ️'
        const message = `${emoji} <b>${alert_type?.toUpperCase() || 'ALERTA'}</b>\n\n${alertText}`

        const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chat_id: config.alert_group_chat_id, text: message, parse_mode: 'HTML' }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(`Telegram sendAlert failed [${response.status}]: ${JSON.stringify(data)}`)
        result = data.result
        break
      }

      case 'broadcast': {
        const { chat_ids, text: bText, product_id: bProductId } = params
        const results: any[] = []
        
        for (const chatId of (chat_ids || [])) {
          try {
            if (bProductId) {
              // Reuse sendProduct logic
              const { data: prod } = await supabase
                .from('products')
                .select('name, description, price, sku, product_images(url)')
                .eq('id', bProductId)
                .single()

              if (prod) {
                const pText = `🏷️ <b>${prod.name}</b>\n${prod.description ? prod.description + '\n' : ''}💰 ${prod.price}€\n📦 SKU: ${prod.sku || 'N/A'}`
                const r = await fetch(`${GATEWAY_URL}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: chatId, text: pText, parse_mode: 'HTML' }),
                })
                results.push(await r.json())
              }
            } else {
              const r = await fetch(`${GATEWAY_URL}/sendMessage`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: bText, parse_mode: 'HTML' }),
              })
              results.push(await r.json())
            }
          } catch (err) {
            console.error(`Broadcast to ${chatId} failed:`, err)
          }
        }
        result = { sent: results.length }
        break
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: unknown) {
    console.error('telegram-send error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
