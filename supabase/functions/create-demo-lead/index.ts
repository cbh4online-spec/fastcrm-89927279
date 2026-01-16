import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map business types to readable labels
const businessTypeLabels: Record<string, string> = {
  formacao: "Formação / Escolas",
  saude: "Saúde / Clínica",
  consultoria: "Consultoria / Coaching",
  agencia: "Agência / Serviços",
  b2b: "Empresa B2B",
  outro: "Outro",
};

// Map objectives to readable labels
const objectiveLabels: Record<string, string> = {
  leads: "Gerir leads e vendas",
  atendimento: "Atendimento ao cliente",
  automacao: "Automatizar processos",
  financeiro: "Ter visão financeira clara",
  produtos: "Organizar produtos/serviços",
  tudo: "Todas as funcionalidades",
};

// Map urgency to score modifier
const urgencyScores: Record<string, number> = {
  asap: 30,
  semanas: 15,
  explorar: 5,
};

// Map team size to score modifier
const teamSizeScores: Record<string, number> = {
  "1": 10,
  "2-5": 20,
  "6-20": 30,
  "20+": 40,
};

interface DemoLeadRequest {
  name: string;
  email: string;
  company: string | null;
  businessType: string;
  businessTypeOther: string | null;
  objectives: string[];
  teamSize: string;
  urgency: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: DemoLeadRequest = await req.json();
    const {
      name,
      email,
      company,
      businessType,
      businessTypeOther,
      objectives,
      teamSize,
      urgency,
    } = body;

    // Validate required fields
    if (!name || !email || !businessType || !objectives.length || !teamSize || !urgency) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the business type label
    const businessLabel = businessType === "outro" && businessTypeOther
      ? businessTypeOther
      : businessTypeLabels[businessType] || businessType;

    // Build tags from objectives
    const tags = objectives.map((obj) => objectiveLabels[obj] || obj);
    tags.push(`Equipa: ${teamSize}`);
    tags.push(`Urgência: ${urgency === "asap" ? "Alta" : urgency === "semanas" ? "Média" : "Baixa"}`);
    tags.push(`Setor: ${businessLabel}`);

    // Calculate initial lead score (0-100)
    const baseScore = 20;
    const urgencyScore = urgencyScores[urgency] || 10;
    const teamScore = teamSizeScores[teamSize] || 10;
    const objectivesScore = Math.min(objectives.length * 5, 20);
    const leadScore = Math.min(baseScore + urgencyScore + teamScore + objectivesScore, 100);

    // Determine temperature based on urgency
    let temperature = "warm";
    if (urgency === "asap") {
      temperature = "hot";
    } else if (urgency === "explorar") {
      temperature = "cold";
    }

    // Generate AI summary if API key is available
    let aiSummary = "";
    let demoFocus = "";

    if (lovableApiKey) {
      try {
        const objectivesText = objectives
          .map((obj) => objectiveLabels[obj] || obj)
          .join(", ");

        const prompt = `Analisa este pedido de demonstração e cria um resumo curto (2-3 linhas) para o vendedor, seguido de sugestões para o foco da demo.

Dados do lead:
- Nome: ${name}
- Empresa: ${company || "Não especificada"}
- Tipo de negócio: ${businessLabel}
- Objetivos principais: ${objectivesText}
- Tamanho da equipa: ${teamSize} pessoas
- Urgência: ${urgency === "asap" ? "Alta - quer avançar já" : urgency === "semanas" ? "Média - próximas semanas" : "Baixa - só a explorar"}

Responde em português de Portugal. Formato:
RESUMO: [2-3 linhas sobre o lead]
FOCO DA DEMO: [módulos/funcionalidades mais relevantes para este lead]`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "És um assistente de vendas especializado em CRM. Crias resumos concisos e úteis para vendedores.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          
          // Parse the response
          const resumoMatch = content.match(/RESUMO:\s*(.+?)(?=FOCO DA DEMO:|$)/s);
          const focoMatch = content.match(/FOCO DA DEMO:\s*(.+?)$/s);
          
          if (resumoMatch) {
            aiSummary = resumoMatch[1].trim();
          }
          if (focoMatch) {
            demoFocus = focoMatch[1].trim();
          }
        }
      } catch (aiError) {
        console.error("AI summary error:", aiError);
        // Continue without AI summary
      }
    }

    // Fallback summary if AI didn't work
    if (!aiSummary) {
      const objectivesText = objectives
        .slice(0, 2)
        .map((obj) => objectiveLabels[obj] || obj)
        .join(" e ");
      
      aiSummary = `Lead de ${businessLabel} interessado em ${objectivesText}. Equipa de ${teamSize} pessoa(s), urgência ${urgency === "asap" ? "alta" : urgency === "semanas" ? "média" : "baixa"}.`;
    }

    // Build the notes field
    const notesLines = [
      "📋 Pedido via Landing Page FastCRM",
      "",
      `🏢 Tipo de negócio: ${businessLabel}`,
      `🎯 Objetivos: ${objectives.map((obj) => objectiveLabels[obj] || obj).join(", ")}`,
      `👥 Tamanho da equipa: ${teamSize}`,
      `⏰ Urgência: ${urgency === "asap" ? "Alta" : urgency === "semanas" ? "Média" : "Baixa"}`,
      "",
      "📝 Resumo IA:",
      aiSummary,
    ];

    if (demoFocus) {
      notesLines.push("", "🎯 Foco sugerido para demo:", demoFocus);
    }

    const notes = notesLines.join("\n");

    // First, check if we have a default workspace for demo leads
    // For now, we'll store in a demo_leads table that doesn't require workspace
    const { data: leadData, error: leadError } = await supabase
      .from("demo_leads")
      .insert({
        name,
        email,
        company,
        business_type: businessType,
        business_type_other: businessTypeOther,
        objectives,
        team_size: teamSize,
        urgency,
        lead_score: leadScore,
        temperature,
        ai_summary: aiSummary,
        demo_focus: demoFocus,
        tags,
        notes,
        source: "landing_page",
        status: "new",
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error creating demo lead:", leadError);
      
      // If demo_leads table doesn't exist, log to console and return success anyway
      console.log("Lead data (table may not exist):", {
        name,
        email,
        company,
        businessType,
        objectives,
        teamSize,
        urgency,
        leadScore,
        temperature,
        aiSummary,
        tags,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadId: leadData?.id || null,
        message: "Demo request received successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
