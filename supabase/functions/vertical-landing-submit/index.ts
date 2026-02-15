import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "@supabase/supabase-js";

const verticalNames: Record<string, string> = {
  clinicas: "Clínicas",
  imobiliarias: "Imobiliárias",
  formacao: "Centros de Formação",
  condominios: "Gestão de Condomínios",
  agencias: "Agências",
  empresas: "Empresas",
};

const pipelineStages = [
  { name: "Lead Captado", color: "#3B82F6", position: 0, probability: 10 },
  { name: "Contactado", color: "#8B5CF6", position: 1, probability: 25 },
  { name: "Diagnóstico Agendado", color: "#F59E0B", position: 2, probability: 50 },
  { name: "Proposta Enviada", color: "#10B981", position: 3, probability: 75 },
  { name: "Fechado", color: "#22C55E", position: 4, probability: 100 },
  { name: "Implementação", color: "#06B6D4", position: 5, probability: 100 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vertical, name, company, email, phone, team_size, main_challenge, monthly_revenue } = await req.json();

    if (!vertical || !name || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verticalNome = verticalNames[vertical] || vertical;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find workspace "metodopare"
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id, owner_id")
      .eq("slug", "metodopare")
      .single();

    if (!workspace) {
      // Fallback: get first workspace
      const { data: fallback } = await supabaseAdmin
        .from("workspaces")
        .select("id, owner_id")
        .limit(1)
        .single();
      if (!fallback) throw new Error("No workspace found");
      Object.assign(workspace || {}, fallback);
    }

    const workspaceId = workspace!.id;
    const ownerId = workspace!.owner_id;

    // 2. Create contact
    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .insert({
        name,
        company,
        email,
        phone,
        tags: [`vertical_${vertical}`, "landing_page"],
        source: `Landing Vertical: ${verticalNome}`,
        lead_source: `landing_${vertical}`,
        created_by: ownerId,
        workspace_id: workspaceId,
      })
      .select("id")
      .single();

    // 3. Create lead
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .insert({
        name: `${name} - ${company}`,
        email,
        phone,
        company_name: company,
        source: `Landing Vertical: ${verticalNome}`,
        status: "new",
        tags: [`vertical_${vertical}`],
        notes: `Equipa: ${team_size}\nDesafio: ${main_challenge}\nFaturação: ${monthly_revenue}`,
        created_by: ownerId,
        workspace_id: workspaceId,
      })
      .select("id")
      .single();

    // 4. Find or create pipeline
    const pipelineName = `${verticalNome} - Sales Flow`;
    let { data: pipeline } = await supabaseAdmin
      .from("pipelines")
      .select("id")
      .eq("name", pipelineName)
      .eq("workspace_id", workspaceId)
      .single();

    if (!pipeline) {
      const { data: newPipeline } = await supabaseAdmin
        .from("pipelines")
        .insert({
          name: pipelineName,
          description: `Pipeline de vendas para vertical ${verticalNome}`,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();
      pipeline = newPipeline;

      if (pipeline) {
        await supabaseAdmin.from("pipeline_stages").insert(
          pipelineStages.map((s) => ({
            ...s,
            pipeline_id: pipeline!.id,
            workspace_id: workspaceId,
          }))
        );
      }
    }

    // 5. Get first stage
    const { data: firstStage } = await supabaseAdmin
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", pipeline!.id)
      .order("position", { ascending: true })
      .limit(1)
      .single();

    // 6. Create opportunity
    const { data: opportunity } = await supabaseAdmin
      .from("opportunities")
      .insert({
        title: `${company} — ${verticalNome}`,
        stage_id: firstStage!.id,
        owner_id: ownerId,
        lead_id: lead?.id || null,
        contact_id: contact?.id || null,
        source: `Landing Vertical: ${verticalNome}`,
        status: "open",
        workspace_id: workspaceId,
      })
      .select("id")
      .single();

    // 7. Create activity
    if (lead) {
      await supabaseAdmin.from("crm_activities").insert({
        activity_type: "form_submission",
        title: `Formulário Landing ${verticalNome}`,
        description: `Submissão via landing page vertical: ${verticalNome}\nEmpresa: ${company}\nEquipa: ${team_size}\nDesafio: ${main_challenge}\nFaturação: ${monthly_revenue}`,
        entity_id: lead.id,
        entity_type: "lead",
        lead_id: lead.id,
        contact_id: contact?.id || null,
        opportunity_id: opportunity?.id || null,
        performed_by: ownerId,
        metadata: { vertical, team_size, monthly_revenue, main_challenge },
        workspace_id: workspaceId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead?.id,
        opportunity_id: opportunity?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
