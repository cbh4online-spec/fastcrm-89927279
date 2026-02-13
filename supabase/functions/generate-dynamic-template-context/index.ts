import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { leadId, contactId, workspaceId } = await req.json();

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "workspaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gather lead/contact data
    let entityData: Record<string, unknown> = {};
    let leadScore = 0;
    let pipelineStage = '';
    let industry = '';
    let lastContactDate: string | null = null;

    if (leadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("*, opportunities(*)")
        .eq("id", leadId)
        .single();

      if (lead) {
        entityData = lead;
        leadScore = (lead as any).lead_score || 0;
        pipelineStage = (lead as any).status || '';
        industry = (lead as any).industry || '';
        lastContactDate = (lead as any).last_interaction_at || (lead as any).updated_at;
      }
    }

    if (contactId) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();

      if (contact) {
        entityData = { ...entityData, ...contact };
        industry = (contact as any).industry || industry;
        lastContactDate = lastContactDate || (contact as any).updated_at;
      }
    }

    // Calculate days since last contact
    let daysSinceLastContact = 0;
    if (lastContactDate) {
      const diff = Date.now() - new Date(lastContactDate).getTime();
      daysSinceLastContact = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    // Calculate urgency_level
    let urgencyLevel: 'low' | 'medium' | 'high' = 'low';
    if (daysSinceLastContact > 14 || leadScore > 80) {
      urgencyLevel = 'high';
    } else if (daysSinceLastContact > 7 || leadScore > 50) {
      urgencyLevel = 'medium';
    }

    // Calculate conversion_probability from lead_score and pipeline
    let conversionProbability = leadScore;
    if (!conversionProbability) {
      const stageScores: Record<string, number> = {
        'novo': 10, 'new': 10,
        'contactado': 25, 'contacted': 25,
        'qualificado': 50, 'qualified': 50,
        'proposta': 70, 'proposal': 70,
        'negociacao': 80, 'negotiation': 80,
        'won': 95, 'ganho': 95,
      };
      conversionProbability = stageScores[pipelineStage.toLowerCase()] || 20;
    }

    // Determine recommended_tone
    let recommendedTone: 'direct' | 'consultative' | 'strategic' = 'consultative';
    if (conversionProbability > 70) recommendedTone = 'direct';
    else if (conversionProbability < 30) recommendedTone = 'strategic';

    // Use AI to infer business_maturity and digital_readiness
    let businessMaturity: 'early' | 'growth' | 'scale' = 'early';
    let digitalReadiness: 'low' | 'medium' | 'high' = 'low';

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "You analyze business data and return JSON only. No markdown."
              },
              {
                role: "user",
                content: `Given this entity data, classify:
- business_maturity: "early" (startup/small), "growth" (expanding), or "scale" (established/large)
- digital_readiness: "low" (basic/no digital), "medium" (some digital), or "high" (advanced digital)

Data: industry="${industry}", lead_score=${leadScore}, pipeline_stage="${pipelineStage}", days_inactive=${daysSinceLastContact}
Extra: ${JSON.stringify(entityData).substring(0, 500)}

Return JSON only: {"business_maturity": "...", "digital_readiness": "..."}`
              }
            ],
            temperature: 0.3,
            max_tokens: 100,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          const clean = content.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(clean);
          if (parsed.business_maturity) businessMaturity = parsed.business_maturity;
          if (parsed.digital_readiness) digitalReadiness = parsed.digital_readiness;
        }
      } catch (aiErr) {
        console.error("AI inference error (non-fatal):", aiErr);
        // Fallback heuristics
        if (leadScore > 60) { businessMaturity = 'growth'; digitalReadiness = 'medium'; }
        if (leadScore > 80) { businessMaturity = 'scale'; digitalReadiness = 'high'; }
      }
    } else {
      // Simple heuristic fallback
      if (leadScore > 60) { businessMaturity = 'growth'; digitalReadiness = 'medium'; }
      if (leadScore > 80) { businessMaturity = 'scale'; digitalReadiness = 'high'; }
    }

    // Build CRM base variables
    const crmVariables: Record<string, string> = {
      first_name: (entityData as any).name?.split(' ')[0] || '',
      company_name: (entityData as any).company || (entityData as any).company_name || '',
      industry: industry || '',
      pipeline_stage: pipelineStage || '',
      lead_score: String(leadScore),
      potential_value: String((entityData as any).potential_value || (entityData as any).value || ''),
      assigned_user: (entityData as any).assigned_to || '',
      city: (entityData as any).city || '',
      days_since_last_contact: String(daysSinceLastContact),
      nome_cliente: (entityData as any).name || '',
      primeiro_nome: (entityData as any).name?.split(' ')[0] || '',
    };

    const smartVariables = {
      urgency_level: urgencyLevel,
      business_maturity: businessMaturity,
      digital_readiness: digitalReadiness,
      conversion_probability: conversionProbability,
      recommended_tone: recommendedTone,
      days_since_last_contact: daysSinceLastContact,
    };

    return new Response(
      JSON.stringify({
        success: true,
        crmVariables,
        smartVariables,
        allVariables: {
          ...crmVariables,
          ...Object.fromEntries(
            Object.entries(smartVariables).map(([k, v]) => [k, String(v)])
          ),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Dynamic template context error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
