import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoringRule {
  id: string;
  fieldId: string;
  condition: string;
  value?: string | number;
  scoreChange: number;
  temperatureEffect?: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  enrichmentSource?: string;
}

function isCorporateEmail(email: string): boolean {
  if (!email) return false;
  const genericDomains = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 
    'live.com', 'icloud.com', 'mail.com', 'protonmail.com',
    'sapo.pt', 'iol.pt', 'clix.pt'
  ];
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? !genericDomains.includes(domain) : false;
}

function calculateScore(data: Record<string, unknown>, rules: ScoringRule[], baseScore: number): { score: number; temperature: string } {
  let score = baseScore;
  let temperatureBoosts = 0;

  for (const rule of rules) {
    const fieldValue = data[rule.fieldId];
    let matches = false;

    switch (rule.condition) {
      case 'equals':
        matches = String(fieldValue).toLowerCase() === String(rule.value).toLowerCase();
        break;
      case 'contains':
        matches = String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
        break;
      case 'greater_than':
        matches = Number(fieldValue) > Number(rule.value);
        break;
      case 'less_than':
        matches = Number(fieldValue) < Number(rule.value);
        break;
      case 'is_corporate_email':
        matches = isCorporateEmail(String(fieldValue));
        break;
    }

    if (matches) {
      score += rule.scoreChange;
      if (rule.temperatureEffect === 'increase') temperatureBoosts++;
      if (rule.temperatureEffect === 'decrease') temperatureBoosts--;
    }
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine temperature
  let temperature = 'cold';
  if (score >= 70 || temperatureBoosts >= 2) {
    temperature = 'hot';
  } else if (score >= 40 || temperatureBoosts >= 1) {
    temperature = 'warm';
  }

  return { score, temperature };
}

async function enrichFromEmail(email: string): Promise<Record<string, unknown>> {
  if (!email) return {};
  
  const domain = email.split('@')[1];
  if (!domain) return {};

  const isCorporate = isCorporateEmail(email);
  
  return {
    contact: {
      type: isCorporate ? 'corporate' : 'generic',
    },
    company: isCorporate ? {
      domain,
      name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
    } : undefined,
  };
}

async function generateAISummary(data: Record<string, unknown>, score: number, temperature: string): Promise<{ summary: string; nextAction: string }> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { 
            role: 'system', 
            content: `Analisa esta submissão de formulário e gera um resumo conciso em português.
Responde APENAS com JSON: {"summary": "1-2 frases sobre o lead", "nextAction": "ação recomendada"}` 
          },
          { 
            role: 'user', 
            content: `Dados: ${JSON.stringify(data)}\nScore: ${score}\nTemperatura: ${temperature}` 
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('AI request failed');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error('AI summary error:', error);
  }

  // Fallback
  const tempText = temperature === 'hot' ? 'alta intenção' : temperature === 'warm' ? 'interesse moderado' : 'interesse inicial';
  return {
    summary: `Lead com ${tempText} (score: ${score}).`,
    nextAction: temperature === 'hot' ? 'Contactar em menos de 15 minutos.' : 'Agendar follow-up.',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formId, data, workspaceId } = await req.json();

    if (!formId || !data || !workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch form configuration
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      throw new Error('Form not found');
    }

    const schema = form.schema as { fields?: FormField[] };
    const scoringRules = (form.scoring_rules || []) as ScoringRule[];
    const automationConfig = form.automation_config as Record<string, unknown> || {};

    // Enrich data
    let enrichedData: Record<string, unknown> = {};
    const fields = schema.fields || [];
    
    for (const field of fields) {
      if (field.enrichmentSource === 'email' && data[field.id]) {
        const emailEnrichment = await enrichFromEmail(String(data[field.id]));
        enrichedData = { ...enrichedData, ...emailEnrichment };
      }
    }

    // Calculate score
    const baseScore = 20; // Default base score
    const { score, temperature } = calculateScore(data, scoringRules, baseScore);

    // Generate AI summary
    const { summary, nextAction } = await generateAISummary(data, score, temperature);

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        workspace_id: workspaceId,
        raw_data: data,
        enriched_data: enrichedData,
        score,
        temperature,
        ai_summary: summary,
        ai_next_action: nextAction,
        processing_status: 'processing',
      })
      .select()
      .single();

    if (submissionError) {
      throw submissionError;
    }

    // Execute automations
    let leadId = null;
    let contactId = null;
    let companyId = null;
    let opportunityId = null;

    // Create lead if configured
    if (automationConfig.createLead) {
      const enrichedCompany = enrichedData.company as { name?: string } | undefined;
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          workspace_id: workspaceId,
          name: data.name || data.nome || 'Novo Lead',
          email: data.email,
          phone: data.phone || data.telefone,
          company: data.company || data.empresa || enrichedCompany?.name,
          source: 'form',
          ai_temperature: temperature,
          lead_score: score,
          ai_insight: summary,
          ai_next_action: nextAction,
          created_by: form.created_by,
        })
        .select()
        .single();

      if (lead) {
        leadId = lead.id;
      }
    }

    // Create contact if configured
    if (automationConfig.createContact) {
      const { data: contact } = await supabase
        .from('contacts')
        .insert({
          workspace_id: workspaceId,
          name: data.name || data.nome || 'Novo Contacto',
          email: data.email,
          phone: data.phone || data.telefone,
          company: data.company || data.empresa,
          source: 'form',
          ai_temperature: temperature,
          contact_score: score,
          ai_insight: summary,
          created_by: form.created_by,
        })
        .select()
        .single();

      if (contact) {
        contactId = contact.id;
      }
    }

    // Create opportunity if configured and score is high enough
    if (automationConfig.createOpportunity && score >= 50) {
      const { data: opportunity } = await supabase
        .from('opportunities')
        .insert({
          workspace_id: workspaceId,
          title: `Oportunidade - ${data.name || data.nome || 'Formulário'}`,
          lead_id: leadId,
          contact_id: contactId,
          value: data.budget || data.orcamento || 0,
          stage: 'new',
          source: 'form',
          created_by: form.created_by,
        })
        .select()
        .single();

      if (opportunity) {
        opportunityId = opportunity.id;
      }
    }

    // Update submission with created entities
    await supabase
      .from('form_submissions')
      .update({
        lead_id: leadId,
        contact_id: contactId,
        company_id: companyId,
        opportunity_id: opportunityId,
        processing_status: 'completed',
      })
      .eq('id', submission.id);

    // Update form submission count
    await supabase
      .from('forms')
      .update({ submission_count: (form.submission_count || 0) + 1 })
      .eq('id', formId);

    return new Response(
      JSON.stringify({
        success: true,
        submission: {
          id: submission.id,
          score,
          temperature,
          summary,
          nextAction,
          leadId,
          contactId,
          opportunityId,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing form submission:', error);
    const message = error instanceof Error ? error.message : 'Failed to process submission';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
