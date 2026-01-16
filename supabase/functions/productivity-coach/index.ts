import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, workspaceId, data } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (action) {
      case "generate-daily-priorities": {
        // Fetch context data
        const today = new Date().toISOString().split('T')[0];
        
        // Get overdue followups
        const { data: followups } = await supabaseClient
          .from('conversation_followups')
          .select('*, conversations(lead_id, leads(name))')
          .eq('workspace_id', workspaceId)
          .eq('status', 'pending')
          .lt('suggested_at', today);

        // Get today's meetings
        const { data: meetings } = await supabaseClient
          .from('meetings')
          .select('*')
          .eq('workspace_id', workspaceId)
          .gte('start_time', `${today}T00:00:00`)
          .lte('start_time', `${today}T23:59:59`);

        // Get open opportunities
        const { data: opportunities } = await supabaseClient
          .from('opportunities')
          .select('*')
          .eq('workspace_id', workspaceId)
          .in('stage', ['proposal', 'negotiation'])
          .order('value', { ascending: false })
          .limit(10);

        // Get current goals
        const { data: goals } = await supabaseClient
          .from('productivity_goals')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .eq('period', 'daily')
          .eq('period_start', today);

        const contextPrompt = `
Contexto atual do utilizador:

FOLLOW-UPS EM ATRASO (${followups?.length || 0}):
${followups?.slice(0, 5).map(f => `- ${f.conversations?.leads?.name || 'Lead'}: há ${f.hours_since_last_reply}h sem resposta`).join('\n') || 'Nenhum'}

REUNIÕES HOJE (${meetings?.length || 0}):
${meetings?.map(m => `- ${m.title} às ${new Date(m.start_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} com ${m.attendee_name || 'participante'}`).join('\n') || 'Nenhuma'}

OPORTUNIDADES ABERTAS PRIORITÁRIAS:
${opportunities?.slice(0, 5).map(o => `- ${o.name}: €${o.value} (${o.stage})`).join('\n') || 'Nenhuma'}

METAS DO DIA:
${goals?.map(g => `- ${g.title}: ${g.current_value || 0}/${g.target_value} ${g.unit || ''}`).join('\n') || 'Sem metas definidas'}

Com base neste contexto, gera exatamente 3 prioridades para hoje. Cada prioridade deve ser:
1. Acionável e específica
2. Ter impacto direto nos resultados
3. Ser realista para completar hoje

Responde APENAS com um JSON válido no formato:
{
  "priorities": [
    {
      "title": "Título curto da prioridade",
      "description": "Descrição detalhada do que fazer",
      "reasoning": "Porque esta prioridade é importante",
      "linked_entity_type": "followup|meeting|opportunity|goal|null",
      "linked_entity_id": "uuid ou null"
    }
  ]
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "És um coach de produtividade especializado em vendas B2B. Ajudas utilizadores a priorizar o que é mais importante para atingir metas. Responde sempre em português de Portugal e apenas com JSON válido.",
              },
              { role: "user", content: contextPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (aiResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required. Add credits to your workspace." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error("AI gateway error");
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { priorities: [] };
        }
        break;
      }

      case "prepare-meeting": {
        const { meetingId } = data;

        // Get meeting details
        const { data: meeting } = await supabaseClient
          .from('meetings')
          .select('*, leads(*), contacts(*), companies(*)')
          .eq('id', meetingId)
          .single();

        if (!meeting) {
          return new Response(JSON.stringify({ error: "Meeting not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get recent activities with this client
        const clientId = meeting.lead_id || meeting.contact_id || meeting.company_id;
        const clientType = meeting.lead_id ? 'lead' : meeting.contact_id ? 'contact' : 'company';

        const { data: activities } = await supabaseClient
          .from('crm_activities')
          .select('*')
          .eq('entity_id', clientId)
          .eq('entity_type', clientType)
          .order('created_at', { ascending: false })
          .limit(10);

        // Get recent messages if any
        const { data: conversations } = await supabaseClient
          .from('conversations')
          .select('*, messages(*)')
          .eq(clientType === 'lead' ? 'lead_id' : clientType === 'contact' ? 'contact_id' : 'company_id', clientId)
          .limit(1);

        const client = meeting.leads || meeting.contacts || meeting.companies;
        
        const prepPrompt = `
Prepara uma briefing para uma reunião:

DETALHES DA REUNIÃO:
- Título: ${meeting.title}
- Data/Hora: ${new Date(meeting.start_time).toLocaleString('pt-PT')}
- Tipo: ${meeting.meeting_type}
- Notas: ${meeting.notes || 'Sem notas'}

CLIENTE:
- Nome: ${client?.name || meeting.attendee_name || 'Desconhecido'}
- Email: ${client?.email || meeting.attendee_email || 'N/A'}
- Empresa: ${client?.company || client?.name || 'N/A'}
- Fonte: ${client?.source || 'N/A'}

ÚLTIMAS INTERAÇÕES (${activities?.length || 0}):
${activities?.slice(0, 5).map(a => `- ${a.title} (${new Date(a.created_at).toLocaleDateString('pt-PT')})`).join('\n') || 'Nenhuma registada'}

ÚLTIMAS MENSAGENS:
${conversations?.[0]?.messages?.slice(0, 3).map((m: any) => `- ${m.direction}: ${m.content?.substring(0, 100)}...`).join('\n') || 'Nenhuma'}

Gera uma preparação completa para esta reunião. Responde APENAS com JSON válido:
{
  "client_summary": "Resumo do cliente e contexto",
  "recent_interactions": "Resumo das interações recentes relevantes",
  "key_points": ["Ponto chave 1", "Ponto chave 2", "Ponto chave 3"],
  "suggested_agenda": ["Item de agenda 1", "Item de agenda 2"],
  "warnings": ["Alerta ou cuidado a ter, se aplicável"]
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "És um assistente de preparação de reuniões de vendas. Ajudas a preparar briefings concisos e acionáveis. Responde em português de Portugal e apenas com JSON válido.",
              },
              { role: "user", content: prepPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error("AI gateway error");
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const preparation = JSON.parse(jsonMatch[0]);
          
          // Save to database
          const { data: savedPrep, error: saveError } = await supabaseClient
            .from('meeting_preparations')
            .upsert({
              workspace_id: workspaceId,
              user_id: user.id,
              meeting_id: meetingId,
              preparation_date: new Date().toISOString().split('T')[0],
              ...preparation,
            })
            .select()
            .single();

          result = savedPrep || preparation;
        } else {
          result = { error: "Could not parse AI response" };
        }
        break;
      }

      case "suggest-free-slots": {
        const today = new Date();
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);

        // Get user's meetings for the week
        const { data: meetings } = await supabaseClient
          .from('meetings')
          .select('start_time, end_time')
          .eq('workspace_id', workspaceId)
          .gte('start_time', today.toISOString())
          .lte('start_time', endOfWeek.toISOString())
          .order('start_time');

        // Get user's availability
        const { data: availability } = await supabaseClient
          .from('user_availability')
          .select('*, availability_slots(*)')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        const slotsPrompt = `
Analisa a agenda e sugere slots livres para marcações:

REUNIÕES AGENDADAS ESTA SEMANA:
${meetings?.map(m => `- ${new Date(m.start_time).toLocaleString('pt-PT')} - ${new Date(m.end_time).toLocaleString('pt-PT')}`).join('\n') || 'Nenhuma'}

DISPONIBILIDADE CONFIGURADA:
${availability?.[0]?.availability_slots?.map((s: any) => `- Dia ${s.day_of_week}: ${s.start_time} - ${s.end_time}`).join('\n') || 'Não configurada (assumir 9h-18h dias úteis)'}

Hoje é ${today.toLocaleDateString('pt-PT')} (${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][today.getDay()]}).

Sugere os melhores 5 slots livres para novas marcações. Responde APENAS com JSON:
{
  "slots": [
    {
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "reason": "Porque este slot é bom"
    }
  ]
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "És um assistente de agenda. Sugeres slots de tempo óptimos considerando disponibilidade e reuniões existentes. Responde em português de Portugal e apenas com JSON válido.",
              },
              { role: "user", content: slotsPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          throw new Error("AI gateway error");
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { slots: [] };
        break;
      }

      case "analyze-goals-progress": {
        const { period } = data;
        const today = new Date();
        
        let periodStart: string;
        let periodEnd: string;
        
        switch (period) {
          case 'weekly':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1);
            periodStart = weekStart.toISOString().split('T')[0];
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            periodEnd = weekEnd.toISOString().split('T')[0];
            break;
          case 'monthly':
            periodStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            periodEnd = lastDay.toISOString().split('T')[0];
            break;
          case 'annual':
            periodStart = `${today.getFullYear()}-01-01`;
            periodEnd = `${today.getFullYear()}-12-31`;
            break;
          default:
            periodStart = today.toISOString().split('T')[0];
            periodEnd = periodStart;
        }

        const { data: goals } = await supabaseClient
          .from('productivity_goals')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .eq('period', period)
          .gte('period_start', periodStart)
          .lte('period_end', periodEnd);

        const progressPrompt = `
Analisa o progresso das metas e dá feedback:

PERÍODO: ${period} (${periodStart} a ${periodEnd})

METAS:
${goals?.map(g => `- ${g.title}: ${g.current_value || 0}/${g.target_value} ${g.unit || ''} (${g.status})`).join('\n') || 'Sem metas definidas'}

Dias restantes no período: ${Math.ceil((new Date(periodEnd).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))}

Analisa o progresso e dá feedback acionável. Responde APENAS com JSON:
{
  "overall_status": "on_track|at_risk|behind|ahead",
  "summary": "Resumo geral do progresso",
  "insights": [
    {
      "goal_id": "uuid",
      "status": "on_track|at_risk|behind|ahead",
      "message": "Feedback específico para esta meta",
      "suggestion": "Sugestão de ação"
    }
  ],
  "motivation": "Mensagem motivacional personalizada"
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "És um coach de produtividade. Analisas progresso de metas e dás feedback construtivo e motivador. Responde em português de Portugal e apenas com JSON válido.",
              },
              { role: "user", content: progressPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          throw new Error("AI gateway error");
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { overall_status: 'unknown' };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Productivity coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
