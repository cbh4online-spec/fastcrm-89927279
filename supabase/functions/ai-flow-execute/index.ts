import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, workspace_id, user_message } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch session + agent + persona
    const { data: session, error: sessionErr } = await supabase
      .from('ai_agent_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('workspace_id', workspace_id)
      .single();
    if (sessionErr || !session) throw new Error('Session not found');
    if (session.status !== 'active') throw new Error(`Session is ${session.status}`);

    // Fetch agent with persona
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('*, persona:ai_personas(*, vibe_profile:vibe_profiles(*))')
      .eq('id', session.agent_id)
      .single();
    if (!agent) throw new Error('Agent not found');

    const flow = (agent.flow_definition || { nodes: [], edges: [], entry_node_id: null }) as any;

    // Determine current node
    let currentNodeId = session.current_node_id;
    if (!currentNodeId) {
      currentNodeId = flow.entry_node_id;
      if (!currentNodeId) throw new Error('Flow has no entry node');
    }

    const currentNode = flow.nodes?.find((n: any) => n.id === currentNodeId);
    if (!currentNode) throw new Error(`Node ${currentNodeId} not found`);

    // Process user message
    const context = { ...(session.context as Record<string, unknown> || {}) };
    const history = [...((session.history as any[]) || [])];

    if (user_message) {
      history.push({
        node_id: currentNodeId,
        role: 'user',
        content: user_message,
        timestamp: new Date().toISOString(),
      });

      if (currentNode.type === 'collect_input') {
        const cfg = currentNode.config;
        context[cfg.variable_name] = user_message;
        currentNodeId = cfg.next_node_id;
      }
    }

    // Execute current node
    let responseMessage: string | null = null;
    let nextNodeId: string | null = null;
    let sessionComplete = false;

    const nodeToExecute = flow.nodes?.find((n: any) => n.id === currentNodeId);
    if (!nodeToExecute) throw new Error(`Node ${currentNodeId} not found`);

    switch (nodeToExecute.type) {
      case 'message': {
        const cfg = nodeToExecute.config;
        if (cfg.use_ai && agent.persona) {
          const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
          const systemPrompt = agent.persona.compiled_system_prompt ??
            `Responde como ${agent.persona.name}. Contexto: ${JSON.stringify(context)}`;
          const aiPrompt = cfg.ai_prompt
            ? `${cfg.ai_prompt}\n\nContexto: ${JSON.stringify(context)}`
            : `Gera a próxima mensagem. Contexto: ${JSON.stringify(context)}`;

          const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: aiPrompt },
              ],
              max_tokens: agent.persona.max_response_tokens ?? 256,
              temperature: agent.persona.temperature ?? 0.7,
            }),
          });
          if (aiResp.ok) {
            const aiData = await aiResp.json();
            responseMessage = aiData.choices?.[0]?.message?.content ?? cfg.content;
          } else {
            responseMessage = interpolate(cfg.content, context);
          }
        } else {
          responseMessage = interpolate(cfg.content, context);
        }
        const edge = flow.edges?.find((e: any) => e.from_node_id === currentNodeId);
        nextNodeId = edge?.to_node_id ?? null;
        break;
      }

      case 'collect_input': {
        responseMessage = interpolate(nodeToExecute.config.prompt, context);
        nextNodeId = currentNodeId; // stay until user replies
        break;
      }

      case 'condition': {
        const cfg = nodeToExecute.config;
        const fieldValue = getNestedValue(context, cfg.field);
        const conditionMet = evaluateCondition(fieldValue, cfg.operator, cfg.value);
        nextNodeId = conditionMet ? cfg.true_node_id : cfg.false_node_id;

        await supabase
          .from('ai_agent_sessions')
          .update({ current_node_id: nextNodeId, context, history })
          .eq('id', session_id);

        return new Response(JSON.stringify({
          success: true, message: null, next_node_id: nextNodeId,
          session_complete: false, context,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'action': {
        const cfg = nodeToExecute.config;
        await executeAction(supabase, cfg.action, cfg.params || {}, context, session);
        const edge = flow.edges?.find((e: any) => e.from_node_id === currentNodeId);
        nextNodeId = edge?.to_node_id ?? null;
        break;
      }

      case 'end': {
        const cfg = nodeToExecute.config;
        responseMessage = cfg.closing_message ? interpolate(cfg.closing_message, context) : null;
        sessionComplete = true;
        nextNodeId = null;
        break;
      }
    }

    // Add to history
    if (responseMessage) {
      history.push({
        node_id: currentNodeId,
        role: 'assistant',
        content: responseMessage,
        timestamp: new Date().toISOString(),
      });
    }

    // Update session
    await supabase
      .from('ai_agent_sessions')
      .update({
        current_node_id: nextNodeId,
        context,
        history,
        status: sessionComplete ? 'completed' : 'active',
        completed_at: sessionComplete ? new Date().toISOString() : null,
      })
      .eq('id', session_id);

    if (sessionComplete) {
      await supabase.rpc('increment_agent_completion', { p_agent_id: agent.id });
    }

    return new Response(JSON.stringify({
      success: true, message: responseMessage, next_node_id: nextNodeId,
      session_complete: sessionComplete, context,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[FLOW-EXECUTE] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] ?? `{{${key}}}`));
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((curr: unknown, key) => {
    if (curr && typeof curr === 'object') return (curr as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function evaluateCondition(value: unknown, operator: string, expected: string): boolean {
  const v = String(value ?? '');
  switch (operator) {
    case 'equals': return v === expected;
    case 'not_equals': return v !== expected;
    case 'contains': return v.toLowerCase().includes(expected.toLowerCase());
    case 'is_empty': return !v || v.trim() === '';
    case 'is_not_empty': return !!v && v.trim() !== '';
    default: return false;
  }
}

async function executeAction(
  supabase: any, action: string, params: Record<string, unknown>,
  context: Record<string, unknown>, session: any
): Promise<void> {
  const ws = session.workspace_id;
  switch (action) {
    case 'create_lead':
      await supabase.from('leads').insert({
        workspace_id: ws,
        name: context.name ?? params.name ?? 'Lead via fluxo',
        email: context.email ?? params.email,
        phone: context.phone ?? params.phone,
        source: 'ai_flow',
        status: 'new',
      });
      break;
    case 'add_tag':
      if (session.contact_id) {
        const { data: contact } = await supabase
          .from('contacts').select('tags').eq('id', session.contact_id).single();
        const tags = [...(contact?.tags ?? []), params.tag as string].filter(Boolean);
        await supabase.from('contacts').update({ tags }).eq('id', session.contact_id);
      }
      break;
    case 'create_task':
      await supabase.from('tasks').insert({
        workspace_id: ws,
        title: interpolate(String(params.title ?? 'Tarefa do fluxo'), context),
        contact_id: session.contact_id,
        lead_id: session.lead_id,
        due_date: params.due_date,
        priority: params.priority ?? 'medium',
      });
      break;
  }
}
