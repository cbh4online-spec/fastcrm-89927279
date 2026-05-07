import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, onboarding_project_id, template_slug, title } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let template: any = null;
    if (template_slug) {
      const { data } = await supabase.from("implementation_project_templates")
        .select("*").eq("slug", template_slug).maybeSingle();
      template = data;
    }

    const { data: onb } = onboarding_project_id
      ? await supabase.from("customer_onboarding_projects").select("*").eq("id", onboarding_project_id).maybeSingle()
      : { data: null };

    const projectNumber = `IMPL-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    const { data: project, error: pErr } = await supabase.from("implementation_projects").insert({
      workspace_id,
      onboarding_project_id: onboarding_project_id ?? null,
      proposal_id: onb?.proposal_id ?? null,
      contact_id: onb?.contact_id ?? null,
      project_number: projectNumber,
      title: title ?? template?.name ?? "Novo projeto de implementação",
      project_type: template?.project_type ?? "implementation",
      estimated_hours: template?.estimated_hours ?? null,
      status: "planning",
    }).select().single();
    if (pErr) throw pErr;

    if (template) {
      const phases = (template.default_phases ?? []) as any[];
      const phaseInserts = phases.map(p => ({ ...p, project_id: project.id, workspace_id }));
      const { data: createdPhases } = phaseInserts.length
        ? await supabase.from("implementation_project_phases").insert(phaseInserts).select()
        : { data: [] };

      const tasks = (template.default_tasks ?? []) as any[];
      if (tasks.length) {
        await supabase.from("implementation_project_tasks").insert(
          tasks.map(t => ({ ...t, project_id: project.id, workspace_id }))
        );
      }

      const goItems = (template.default_golive_items ?? []) as any[];
      if (goItems.length) {
        const { data: cl } = await supabase.from("implementation_golive_checklists")
          .insert({ project_id: project.id, workspace_id, status: "draft" }).select().single();
        if (cl) {
          await supabase.from("implementation_golive_items").insert(
            goItems.map((g, i) => ({ ...g, checklist_id: cl.id, project_id: project.id, sort_order: i * 10 }))
          );
        }
      }

      const hoItems = (template.default_handover_items ?? []) as any[];
      if (hoItems.length) {
        const { data: ho } = await supabase.from("implementation_handovers")
          .insert({ project_id: project.id, workspace_id, status: "draft" }).select().single();
        if (ho) {
          await supabase.from("implementation_handover_items").insert(
            hoItems.map(h => ({ ...h, handover_id: ho.id, project_id: project.id }))
          );
        }
      }
    }

    await supabase.from("implementation_project_events").insert({
      project_id: project.id, workspace_id, event_type: "project_created",
      description: `Projeto criado${template ? ` a partir do template ${template.name}` : ""}`,
    });

    return new Response(JSON.stringify({ ok: true, project }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e.message ?? "internal_error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
