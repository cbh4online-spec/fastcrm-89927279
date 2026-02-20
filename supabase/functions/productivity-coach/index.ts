
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

        // Get client info
        const clientId = meeting.lead_id || meeting.contact_id || meeting.company_id;
        const clientType = meeting.lead_id ? 'lead' : meeting.contact_id ? 'contact' : 'company';
        const client = meeting.leads || meeting.contacts || meeting.companies;

        // Get recent activities with this client
        const { data: activities } = await supabaseClient
          .from('crm_activities')
          .select('*')
          .eq('entity_id', clientId)
          .eq('entity_type', clientType)
          .order('created_at', { ascending: false })
          .limit(15);

        // Get recent conversations/messages
        const { data: conversations } = await supabaseClient
          .from('conversations')
          .select('*, messages(*)')
          .eq(clientType === 'lead' ? 'lead_id' : clientType === 'contact' ? 'contact_id' : 'company_id', clientId)
          .order('last_message_at', { ascending: false })
          .limit(1);

        // Get purchases/products if contact or company
        let purchases: any[] = [];
        if (meeting.contact_id || meeting.company_id) {
          const { data: contactProducts } = await supabaseClient
            .from('contact_products')
            .select('*, product:products(name, category)')
            .eq(meeting.contact_id ? 'contact_id' : 'company_id', meeting.contact_id || meeting.company_id)
            .order('acquisition_date', { ascending: false })
            .limit(10);
          purchases = contactProducts || [];
        }

        // Get opportunities
        const { data: opportunities } = await supabaseClient
          .from('opportunities')
          .select('*')
          .eq(clientType === 'lead' ? 'lead_id' : clientType === 'contact' ? 'contact_id' : 'company_id', clientId)
          .order('updated_at', { ascending: false })
          .limit(5);

        // Get support tickets if any (from crm_activities with type 'ticket')
        const { data: tickets } = await supabaseClient
          .from('crm_activities')
          .select('*')
          .eq('entity_id', clientId)
          .in('activity_type', ['ticket', 'support', 'complaint', 'issue'])
          .order('created_at', { ascending: false })
          .limit(5);

        // Calculate risk factors
        const lastContactDate = client?.last_contact_at ? new Date(client.last_contact_at) : null;
        const daysSinceContact = lastContactDate 
          ? Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const hasRecentTickets = tickets && tickets.length > 0;
        const hasOpenOpportunities = opportunities?.some((o: any) => !['won', 'lost'].includes(o.stage));
        
        const prepPrompt = `
Prepara uma briefing completa para uma reunião com cliente:

DETALHES DA REUNIÃO:
- Título: ${meeting.title}
- Data/Hora: ${new Date(meeting.start_time).toLocaleString('pt-PT')}
- Tipo: ${meeting.category || 'cliente'}
- Notas existentes: ${meeting.notes || 'Sem notas'}

PERFIL DO CLIENTE:
- Nome: ${client?.name || meeting.attendee_name || 'Desconhecido'}
- Email: ${client?.email || meeting.attendee_email || 'N/A'}
- Empresa: ${client?.company || client?.name || 'N/A'}
- Telefone: ${client?.phone || 'N/A'}
- Fonte/Origem: ${client?.source || 'N/A'}
- Cliente desde: ${client?.client_since || client?.created_at || 'N/A'}
- Último contacto: ${client?.last_contact_at ? new Date(client.last_contact_at).toLocaleDateString('pt-PT') : 'N/A'}
- Dias sem contacto: ${daysSinceContact !== null ? daysSinceContact : 'N/A'}
- Score/Temperatura: ${client?.ai_temperature || client?.contact_score || 'N/A'}
- Tags: ${client?.tags?.join(', ') || 'Nenhuma'}

HISTÓRICO DE COMPRAS (${purchases.length}):
${purchases.length > 0 
  ? purchases.slice(0, 5).map((p: any) => `- ${p.product?.name || 'Produto'}: ${p.quantity || 1} unid. (${p.acquisition_date ? new Date(p.acquisition_date).toLocaleDateString('pt-PT') : 'N/A'}) - €${p.total_value || 0}`).join('\n')
  : 'Sem histórico de compras'}
Total gasto estimado: €${purchases.reduce((acc: number, p: any) => acc + (p.total_value || 0), 0)}

OPORTUNIDADES (${opportunities?.length || 0}):
${opportunities?.slice(0, 3).map((o: any) => `- ${o.name}: €${o.value} (${o.stage})`).join('\n') || 'Nenhuma oportunidade registada'}

ÚLTIMAS INTERAÇÕES (${activities?.length || 0}):
${activities?.slice(0, 7).map((a: any) => `- [${a.activity_type}] ${a.title} (${new Date(a.created_at).toLocaleDateString('pt-PT')}): ${a.description?.substring(0, 80) || ''}`).join('\n') || 'Nenhuma interação registada'}

TICKETS/SUPORTE (${tickets?.length || 0}):
${tickets?.map((t: any) => `- ${t.title} (${new Date(t.created_at).toLocaleDateString('pt-PT')}): ${t.description?.substring(0, 60) || ''}`).join('\n') || 'Sem tickets registados'}

ÚLTIMAS MENSAGENS:
${conversations?.[0]?.messages?.slice(0, 5).map((m: any) => `- [${m.direction}] ${m.content?.substring(0, 100)}...`).join('\n') || 'Sem mensagens recentes'}

INDICADORES DE RISCO:
- Cliente inativo há mais de 30 dias: ${daysSinceContact && daysSinceContact > 30 ? 'SIM ⚠️' : 'NÃO'}
- Tickets recentes: ${hasRecentTickets ? 'SIM ⚠️' : 'NÃO'}
- Oportunidades abertas: ${hasOpenOpportunities ? 'SIM' : 'NÃO'}

Com base nesta informação, gera uma preparação COMPLETA para a reunião. Responde APENAS com JSON válido:
{
  "client_summary": "Resumo executivo do cliente (quem é, há quanto tempo é cliente, padrão de compra, situação atual)",
  "last_interactions_summary": "Resumo das últimas interações relevantes e contexto das comunicações recentes",
  "purchase_summary": "Resumo do histórico de compras e valor total do cliente",
  "tickets_summary": "Resumo de tickets/problemas recentes (se existirem) e como foram resolvidos",
  "suggested_objective": "Objetivo principal sugerido para esta reunião",
  "suggested_questions": [
    "Pergunta estratégica 1 baseada no contexto",
    "Pergunta estratégica 2",
    "Pergunta estratégica 3",
    "Pergunta estratégica 4",
    "Pergunta estratégica 5"
  ],
  "risk_alerts": [
    "Alerta de risco 1 (se aplicável - ex: cliente inativo, ticket não resolvido, etc.)",
    "Alerta de risco 2"
  ],
  "suggested_agenda": [
    "1. Abertura e rapport (sugestão concreta)",
    "2. Ponto de agenda 2",
    "3. Ponto de agenda 3",
    "4. Próximos passos e fecho"
  ],
  "talking_points": [
    "Ponto a abordar 1 baseado no histórico",
    "Ponto a abordar 2",
    "Ponto a abordar 3"
  ],
  "opportunities_to_explore": [
    "Oportunidade de upsell/cross-sell 1",
    "Oportunidade 2"
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
                content: "És um assistente de preparação de reuniões de vendas especializado em B2B. O teu trabalho é analisar toda a informação disponível sobre um cliente e gerar um briefing completo e acionável que permita ao comercial entrar na reunião totalmente preparado. Identificas riscos, oportunidades e sugeres perguntas estratégicas baseadas no contexto. Responde em português de Portugal e apenas com JSON válido.",
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
          if (aiResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required. Add credits." }), {
              status: 402,
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
              client_summary: preparation.client_summary,
              recent_interactions: preparation.last_interactions_summary,
              key_points: preparation.talking_points,
              suggested_agenda: preparation.suggested_agenda,
              warnings: preparation.risk_alerts,
            }, { onConflict: 'meeting_id' })
            .select()
            .single();

          result = {
            ...preparation,
            id: savedPrep?.id,
            meeting_id: meetingId,
            saved: !saveError,
          };
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

      case "close-meeting": {
        const { meetingId, bullets, outcome } = data;

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

        const client = meeting.leads || meeting.contacts || meeting.companies;
        const clientName = client?.name || meeting.attendee_name || 'Cliente';

        const closePrompt = `
Estás a ajudar a fechar uma reunião de forma eficiente. Com base nos 3 pontos-chave fornecidos pelo utilizador, gera:

REUNIÃO:
- Título: ${meeting.title}
- Data: ${new Date(meeting.start_time).toLocaleString('pt-PT')}
- Cliente: ${clientName}
- Empresa: ${client?.company || client?.name || 'N/A'}
- Resultado: ${outcome || 'successful'}

3 PONTOS-CHAVE DO UTILIZADOR:
${bullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}

Gera um fecho completo da reunião. Responde APENAS com JSON válido:
{
  "official_summary": "Resumo oficial da reunião em 2-3 parágrafos profissionais, pronto para ser partilhado ou arquivado",
  "key_decisions": ["Decisão tomada 1", "Decisão tomada 2"],
  "tasks": [
    {
      "title": "Título da tarefa",
      "description": "Descrição breve",
      "priority": "high|medium|low",
      "suggested_due_days": 3
    }
  ],
  "next_steps": ["Próximo passo 1", "Próximo passo 2", "Próximo passo 3"],
  "followup_email": {
    "subject": "Assunto do email de follow-up",
    "body": "Corpo do email profissional de follow-up, personalizado para ${clientName}"
  },
  "followup_whatsapp": "Mensagem curta e profissional para WhatsApp (máx 200 caracteres)",
  "internal_notes": "Notas internas para o CRM (insights, alertas, observações)",
  "suggested_followup_date": "YYYY-MM-DD (data sugerida para próximo contacto)"
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
                content: "És um assistente de vendas especializado em fechar reuniões de forma eficiente. Geras resumos profissionais, tarefas acionáveis e mensagens de follow-up personalizadas. Responde em português de Portugal e apenas com JSON válido.",
              },
              { role: "user", content: closePrompt },
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
          if (aiResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Payment required" }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error("AI gateway error");
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
          result.meeting_id = meetingId;
          result.client_name = clientName;
        } else {
          result = { error: "Could not parse AI response" };
        }
        break;
      }

      case "generate-noshow-message": {
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

        const client = meeting.leads || meeting.contacts || meeting.companies;
        const clientName = client?.name || meeting.attendee_name || 'Cliente';

        // Get available slots for rescheduling
        const today = new Date();
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);

        const { data: existingMeetings } = await supabaseClient
          .from('meetings')
          .select('start_time, end_time')
          .eq('workspace_id', workspaceId)
          .gte('start_time', today.toISOString())
          .lte('start_time', endOfWeek.toISOString());

        const noShowPrompt = `
Gera uma mensagem de follow-up para um cliente que não compareceu a uma reunião:

REUNIÃO:
- Título: ${meeting.title}
- Data/Hora original: ${new Date(meeting.start_time).toLocaleString('pt-PT')}
- Cliente: ${clientName}

CONTEXTO:
- O cliente não compareceu e não deu justificação
- Queremos facilitar a remarcação
- O tom deve ser compreensivo e profissional

Sugere também 3-4 slots para remarcação, considerando reuniões existentes:
${existingMeetings?.map(m => `- ${new Date(m.start_time).toLocaleString('pt-PT')}`).join('\n') || 'Sem reuniões esta semana'}

Responde APENAS com JSON válido:
{
  "message": "Mensagem completa para WhatsApp/SMS, empática e profissional (máx 300 chars)",
  "email_subject": "Assunto para email",
  "email_body": "Corpo do email mais formal",
  "suggested_slots": [
    { "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM", "reason": "Bom horário porque..." }
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
                content: "És um assistente de comunicação comercial. Geras mensagens empáticas para situações de no-show, facilitando a remarcação. Responde em português de Portugal e apenas com JSON válido.",
              },
              { role: "user", content: noShowPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          // Fallback to default message
          result = {
            message: `Olá ${clientName}, notámos que não foi possível contar consigo na reunião agendada. Esperamos que esteja tudo bem! Se desejar, podemos remarcar para um horário mais conveniente.`,
            email_subject: `Reunião não realizada - ${meeting.title}`,
            email_body: `Caro(a) ${clientName},\n\nNotámos que não foi possível contar com a sua presença na reunião agendada para ${new Date(meeting.start_time).toLocaleString('pt-PT')}.\n\nEsperamos que esteja tudo bem consigo. Se desejar, podemos facilmente remarcar a reunião para um horário mais conveniente.\n\nAguardamos o seu contacto.\n\nCumprimentos`,
            suggested_slots: [],
          };
          break;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          message: `Olá ${clientName}, notámos que não foi possível contar consigo na reunião. Podemos remarcar?`,
          suggested_slots: [],
        };
        break;
      }

      case "check-inactivity": {
        // Check for contacts without follow-up
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: inactiveContacts } = await supabaseClient
          .from('contacts')
          .select('id, name, last_contact_at')
          .eq('workspace_id', workspaceId)
          .lt('last_contact_at', sevenDaysAgo.toISOString())
          .limit(50);

        const { data: inactiveLeads } = await supabaseClient
          .from('leads')
          .select('id, name, last_contact_at')
          .eq('workspace_id', workspaceId)
          .lt('last_contact_at', sevenDaysAgo.toISOString())
          .limit(50);

        const contactCount = inactiveContacts?.length || 0;
        const leadCount = inactiveLeads?.length || 0;

        if (contactCount > 0 || leadCount > 0) {
          // Create inactivity alert
          await supabaseClient
            .from('inactivity_alerts')
            .insert({
              workspace_id: workspaceId,
              user_id: user.id,
              alert_type: 'no_followup',
              entity_type: contactCount > 0 ? 'contact' : 'lead',
              entity_ids: contactCount > 0 
                ? inactiveContacts?.map(c => c.id) || []
                : inactiveLeads?.map(l => l.id) || [],
              entity_count: contactCount > 0 ? contactCount : leadCount,
              days_inactive: 7,
              message: contactCount > 0 
                ? `${contactCount} contactos sem follow-up há 7 dias`
                : `${leadCount} leads sem follow-up há 7 dias`,
            });
        }

        result = {
          inactive_contacts: contactCount,
          inactive_leads: leadCount,
          alert_created: contactCount > 0 || leadCount > 0,
        };
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
