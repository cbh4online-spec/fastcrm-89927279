import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ApplicationData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string;
  job_title: string | null;
  sector: string;
  employees_count: number | null;
  estimated_annual_revenue: string | null;
  website_linkedin: string | null;
  strategic_objective: string | null;
  contribution: string | null;
}

function calculateScore(app: ApplicationData): { score: number; tier: string } {
  let score = 0;

  // Employees
  if (app.employees_count && app.employees_count > 5) score += 1;
  if (app.employees_count && app.employees_count > 20) score += 1;

  // Revenue
  const revenue = app.estimated_annual_revenue || "";
  if (
    revenue.includes("250K") ||
    revenue.includes("500K") ||
    revenue.includes("1M") ||
    revenue.includes("5M") ||
    revenue.includes("10M")
  ) {
    score += 1;
  }
  if (
    revenue.includes("1M") ||
    revenue.includes("5M") ||
    revenue.includes("10M")
  ) {
    score += 1;
  }

  // Website/LinkedIn filled
  if (app.website_linkedin && app.website_linkedin.trim().length > 5) {
    score += 1;
  }

  // Strategic objective quality
  if (app.strategic_objective && app.strategic_objective.length > 200) {
    score += 1;
  }

  let tier: string;
  if (score >= 5) {
    tier = "Executive Candidate";
  } else if (score >= 3) {
    tier = "Strategic Candidate";
  } else {
    tier = "Basic Candidate";
  }

  return { score, tier };
}

function generateConfirmationEmail(
  fullName: string,
  candidateTier: string
): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Candidatura Recebida</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:30px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#6366f1;width:36px;height:36px;border-radius:8px;text-align:center;vertical-align:middle;font-size:18px;color:#ffffff;font-weight:bold;">F</td>
                  <td style="padding-left:10px;color:#f8fafc;font-size:20px;font-weight:bold;letter-spacing:-0.5px;">FastClub</td>
                </tr>
              </table>
              <p style="color:#64748b;font-size:12px;margin:8px 0 0;letter-spacing:1px;text-transform:uppercase;">Private Capital Circle</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#111827;border:1px solid #1e293b;border-radius:12px;padding:40px 32px;">
              <p style="color:#f8fafc;font-size:16px;margin:0 0 24px;line-height:1.6;">
                ${fullName},
              </p>
              <p style="color:#94a3b8;font-size:15px;margin:0 0 20px;line-height:1.7;">
                A sua candidatura foi recebida com sucesso.
              </p>
              <p style="color:#94a3b8;font-size:15px;margin:0 0 20px;line-height:1.7;">
                O FastClub Private Capital Circle e um ambiente restrito, sujeito a validacao estrategica.
              </p>
              <!-- Tier Badge -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background-color:#1e1b4b;border:1px solid #312e81;border-radius:8px;padding:20px 24px;">
                    <p style="color:#a5b4fc;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;">Classificacao Preliminar</p>
                    <p style="color:#f8fafc;font-size:18px;font-weight:bold;margin:0;">${candidateTier}</p>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8;font-size:15px;margin:0 0 20px;line-height:1.7;">
                A nossa equipa ira analisar o seu pedido com confidencialidade.
              </p>
              <p style="color:#94a3b8;font-size:15px;margin:0 0 0;line-height:1.7;">
                Resposta prevista em ate 5 dias uteis.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:32px 0;">
              <p style="color:#475569;font-size:13px;margin:0 0 4px;">Com consideracao estrategica,</p>
              <p style="color:#94a3b8;font-size:14px;font-weight:600;margin:0;">FastClub</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId } = await req.json();

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "applicationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch application
    const { data: app, error: fetchError } = await supabase
      .from("fastclub_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !app) {
      throw new Error(`Application not found: ${fetchError?.message}`);
    }

    // 2. Calculate score and tier
    const { score, tier } = calculateScore(app as ApplicationData);

    // 3. Update application with score/tier
    await supabase
      .from("fastclub_applications")
      .update({
        profile_score: score,
        candidate_tier: tier,
        status: "em_analise",
        processed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    // 4. Find or use default workspace for CRM integration
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id, owner_id")
      .limit(1)
      .single();

    if (workspaces) {
      const workspaceId = workspaces.id;
      const ownerId = workspaces.owner_id;

      // Update application with workspace
      await supabase
        .from("fastclub_applications")
        .update({ workspace_id: workspaceId })
        .eq("id", applicationId);

      // 5. Create Company (if not exists)
      let companyId: string | null = null;
      const { data: existingCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("name", app.company)
        .limit(1)
        .maybeSingle();

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: newCompany } = await supabase
          .from("companies")
          .insert({
            workspace_id: workspaceId,
            created_by: ownerId,
            name: app.company,
            industry: app.sector,
            size: app.employees_count ? String(app.employees_count) : null,
            website: app.website_linkedin,
            source: "FastClub Application",
            tags: ["fastclub_application"],
          })
          .select("id")
          .single();
        companyId = newCompany?.id || null;
      }

      // 6. Create Contact
      let contactId: string | null = null;
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", app.email)
        .limit(1)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact } = await supabase
          .from("contacts")
          .insert({
            workspace_id: workspaceId,
            created_by: ownerId,
            name: app.full_name,
            email: app.email,
            phone: app.phone,
            company: app.company,
            company_id: companyId,
            job_title: app.job_title || app.role,
            source: "FastClub Application",
            tags: ["fastclub_application"],
            notes: `Candidatura FastClub - Tier: ${tier} | Score: ${score}`,
          })
          .select("id")
          .single();
        contactId = newContact?.id || null;
      }

      // 7. Find or create pipeline "FastClub - Avaliacao"
      let pipelineId: string | null = null;
      let stageId: string | null = null;

      const { data: existingPipeline } = await supabase
        .from("pipelines")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("name", "FastClub - Avaliacao")
        .limit(1)
        .maybeSingle();

      if (existingPipeline) {
        pipelineId = existingPipeline.id;
      } else {
        const { data: newPipeline } = await supabase
          .from("pipelines")
          .insert({
            workspace_id: workspaceId,
            name: "FastClub - Avaliacao",
            type: "custom",
            description: "Pipeline de avaliacao de candidaturas FastClub",
          })
          .select("id")
          .single();
        pipelineId = newPipeline?.id || null;

        // Create stages
        if (pipelineId) {
          const stages = [
            { name: "Em Analise", position: 0, color: "#f59e0b", probability: 10 },
            { name: "Entrevista", position: 1, color: "#3b82f6", probability: 30 },
            { name: "Validacao Final", position: 2, color: "#8b5cf6", probability: 60 },
            { name: "Aprovado", position: 3, color: "#22c55e", probability: 100 },
            { name: "Rejeitado", position: 4, color: "#ef4444", probability: 0 },
          ];

          for (const stage of stages) {
            await supabase.from("pipeline_stages").insert({
              workspace_id: workspaceId,
              pipeline_id: pipelineId,
              ...stage,
            });
          }
        }
      }

      // Get "Em Analise" stage
      if (pipelineId) {
        const { data: stage } = await supabase
          .from("pipeline_stages")
          .select("id")
          .eq("pipeline_id", pipelineId)
          .eq("name", "Em Analise")
          .limit(1)
          .maybeSingle();
        stageId = stage?.id || null;
      }

      // 8. Create Opportunity
      let opportunityId: string | null = null;
      if (stageId && contactId) {
        const { data: newOpp } = await supabase
          .from("opportunities")
          .insert({
            workspace_id: workspaceId,
            title: `FastClub - ${app.full_name} (${app.company})`,
            contact_id: contactId,
            company_id: companyId,
            stage_id: stageId,
            owner_id: ownerId,
            status: "open",
            source: "FastClub Application",
            notes: [
              `Tier: ${tier}`,
              `Score: ${score}`,
              `Setor: ${app.sector}`,
              `Colaboradores: ${app.employees_count || "N/D"}`,
              `Faturacao: ${app.estimated_annual_revenue || "N/D"}`,
              `Objetivo: ${app.strategic_objective || "N/D"}`,
              `Contribuicao: ${app.contribution || "N/D"}`,
            ].join("\n"),
          })
          .select("id")
          .single();
        opportunityId = newOpp?.id || null;
      }

      // Update application with CRM IDs
      await supabase
        .from("fastclub_applications")
        .update({
          company_id: companyId,
          contact_id: contactId,
          opportunity_id: opportunityId,
        })
        .eq("id", applicationId);

      // 9. Send admin notification
      const { data: admins } = await supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspaceId)
        .in("role", ["owner", "admin"]);

      const adminIds = [
        ...(admins || []).map((a: any) => a.user_id),
        ownerId,
      ].filter((id, i, arr) => arr.indexOf(id) === i);

      for (const userId of adminIds) {
        await supabase.from("admin_notifications").insert({
          workspace_id: workspaceId,
          user_id: userId,
          type: "fastclub_application",
          title: "Nova candidatura FastClub recebida",
          message: `Nome: ${app.full_name}\nEmpresa: ${app.company}\nTier estimado: ${tier}`,
          metadata: {
            applicationId,
            candidateTier: tier,
            score,
            fullName: app.full_name,
            company: app.company,
          },
          is_read: false,
        });
      }

      await supabase
        .from("fastclub_applications")
        .update({ notification_sent: true })
        .eq("id", applicationId);
    }

    // 10. Send confirmation email
    if (resendApiKey && app.email) {
      try {
        const resend = new Resend(resendApiKey);
        const html = generateConfirmationEmail(app.full_name, tier);

        await resend.emails.send({
          from: "FastClub <noreply@m.fastcrm.metodopare.ai>",
          to: [app.email],
          subject: "Recebemos a sua candidatura ao FastClub Private Capital Circle",
          html,
        });

        await supabase
          .from("fastclub_applications")
          .update({ email_sent: true })
          .eq("id", applicationId);
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        applicationId,
        score,
        tier,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Processing error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
