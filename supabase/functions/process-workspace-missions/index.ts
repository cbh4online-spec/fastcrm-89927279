import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { workspace_id, mission_id } = await req.json()
    if (!workspace_id || !mission_id) {
      return new Response(JSON.stringify({ error: 'workspace_id and mission_id required' }), { status: 400, headers: corsHeaders })
    }

    // Load mission
    const { data: mission, error: mErr } = await supabase
      .from('workspace_missions')
      .select('*')
      .eq('id', mission_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (mErr || !mission) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), { status: 404, headers: corsHeaders })
    }

    const linksCreated: string[] = []

    // Process based on mission_type
    switch (mission.mission_type) {
      case 'reduce_execution_backlog': {
        // Find failed actions and retry them
        const { data: failedActions } = await supabase
          .from('action_executions')
          .select('id')
          .eq('workspace_id', workspace_id)
          .eq('status', 'failed')
          .limit(20)

        for (const action of (failedActions || [])) {
          await supabase.from('action_executions')
            .update({ status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', action.id)

          const { data: link } = await supabase.from('mission_links').insert({
            workspace_id, mission_id, linked_type: 'action_execution', linked_id: action.id,
          }).select('id').single()
          if (link) linksCreated.push(link.id)
        }
        break
      }

      case 'recover_revenue': {
        // Find at-risk objectives and link them
        const { data: objectives } = await supabase
          .from('business_objectives')
          .select('id')
          .eq('workspace_id', workspace_id)
          .eq('status', 'at_risk')
          .limit(10)

        for (const obj of (objectives || [])) {
          const { data: link } = await supabase.from('mission_links').insert({
            workspace_id, mission_id, linked_type: 'objective', linked_id: obj.id,
          }).select('id').single()
          if (link) linksCreated.push(link.id)
        }
        break
      }

      case 'stabilize_automation': {
        // Find failed work items and link
        const { data: failedItems } = await supabase
          .from('agent_work_items')
          .select('id')
          .eq('workspace_id', workspace_id)
          .eq('status', 'failed')
          .limit(20)

        for (const item of (failedItems || [])) {
          const { data: link } = await supabase.from('mission_links').insert({
            workspace_id, mission_id, linked_type: 'action_execution', linked_id: item.id,
          }).select('id').single()
          if (link) linksCreated.push(link.id)
        }
        break
      }

      case 'improve_response_time': {
        // Link overdue tasks
        const { data: overdueTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('workspace_id', workspace_id)
          .eq('status', 'overdue')
          .limit(20)

        for (const task of (overdueTasks || [])) {
          const { data: link } = await supabase.from('mission_links').insert({
            workspace_id, mission_id, linked_type: 'task', linked_id: task.id,
          }).select('id').single()
          if (link) linksCreated.push(link.id)
        }
        break
      }

      default:
        break
    }

    // Update mission status to active
    await supabase.from('workspace_missions')
      .update({ status: 'active', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', mission_id)

    // Emit kernel event
    await supabase.from('kernel_events').insert({
      workspace_id,
      type: 'WORKSPACE.MISSION_CREATED',
      entity_kind: 'workspace_mission',
      entity_id: mission_id,
      actor_type: 'system',
      source_module: 'workspace-missions',
      payload: { mission_type: mission.mission_type, links_created: linksCreated.length },
      status: 'pending',
    })

    return new Response(JSON.stringify({
      success: true, mission_id, links_created: linksCreated.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('process-workspace-missions error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
