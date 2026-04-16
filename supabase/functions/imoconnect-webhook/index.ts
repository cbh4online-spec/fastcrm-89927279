import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

const VALID_SOURCE_TABLES = ["profiles", "meta_leads_raw", "prospect_contacts"] as const;
type SourceTable = typeof VALID_SOURCE_TABLES[number];

interface WebhookPayload {
  source_table: SourceTable;
  event: "INSERT" | "UPDATE";
  record: Record<string, unknown>;
  workspace_id: string; // FastCRM workspace_id to map to
}

function verifyWebhookSecret(req: Request): boolean {
  const secret = Deno.env.get("IMO_CONNECT_WEBHOOK_SECRET");
  if (!secret) {
    console.error("IMO_CONNECT_WEBHOOK_SECRET not configured");
    return false;
  }
  const provided = req.headers.get("x-webhook-secret");
  return provided === secret;
}

function mapProfileToContact(record: Record<string, unknown>) {
  return {
    name: record.full_name as string || "Sem nome",
    email: record.email as string || null,
    phone: record.phone as string || null,
    company: null as string | null,
    job_title: record.license_ami ? `Agente AMI: ${record.license_ami}` : null,
    notes: [
      `[ImoAI Connect] Perfil sincronizado`,
      record.specialization ? `Especialização: ${(record.specialization as string[]).join(", ")}` : null,
      record.address ? `Morada: ${record.address}` : null,
    ].filter(Boolean).join("\n"),
    tags: ["imoai-connect", "agente-imobiliario"],
  };
}

function mapMetaLeadToContact(record: Record<string, unknown>) {
  return {
    name: record.full_name as string || "Lead Meta",
    email: record.email as string || null,
    phone: record.phone as string || null,
    company: record.company as string || null,
    job_title: record.job_title as string || null,
    notes: [
      `[ImoAI Connect] Lead Meta Ads`,
      record.campaign_name ? `Campanha: ${record.campaign_name}` : null,
      record.ad_name ? `Anúncio: ${record.ad_name}` : null,
      record.form_name ? `Formulário: ${record.form_name}` : null,
    ].filter(Boolean).join("\n"),
    tags: ["imoai-connect", "meta-lead", record.campaign_name ? `campanha:${record.campaign_name}` : null].filter(Boolean),
  };
}

function mapProspectToContact(record: Record<string, unknown>) {
  return {
    name: record.full_name as string || "Prospect",
    email: record.email as string || null,
    phone: record.phone as string || record.mobile as string || null,
    company: null as string | null,
    job_title: record.job_title as string || record.role_title as string || null,
    notes: [
      `[ImoAI Connect] Contacto Prospect`,
      record.department ? `Departamento: ${record.department}` : null,
      record.linkedin_url ? `LinkedIn: ${record.linkedin_url}` : null,
      record.preferred_channel ? `Canal preferido: ${record.preferred_channel}` : null,
      record.is_decision_maker ? `Decision maker: Sim` : null,
    ].filter(Boolean).join("\n"),
    tags: ["imoai-connect", "prospect", record.persona_type ? `persona:${record.persona_type}` : null].filter(Boolean),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    if (!verifyWebhookSecret(req)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: WebhookPayload = await req.json();

    // Validate payload
    if (!body.source_table || !VALID_SOURCE_TABLES.includes(body.source_table)) {
      return new Response(JSON.stringify({ error: "Invalid source_table" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.record || !body.workspace_id) {
      return new Response(JSON.stringify({ error: "Missing record or workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const sourceId = body.record.id as string;

    // Check if already synced (idempotency)
    const { data: existingSync } = await supabase
      .from("imo_sync_records")
      .select("id, target_id, sync_status")
      .eq("workspace_id", body.workspace_id)
      .eq("source_table", body.source_table)
      .eq("source_id", sourceId)
      .maybeSingle();

    // Map source data to contact format
    let contactData: ReturnType<typeof mapProfileToContact>;
    switch (body.source_table) {
      case "profiles":
        contactData = mapProfileToContact(body.record);
        break;
      case "meta_leads_raw":
        contactData = mapMetaLeadToContact(body.record);
        break;
      case "prospect_contacts":
        contactData = mapProspectToContact(body.record);
        break;
    }

    let targetId: string | null = null;
    let syncStatus = "synced";

    try {
      if (existingSync?.target_id && body.event === "UPDATE") {
        // Update existing contact
        const { error } = await supabase
          .from("contacts")
          .update({
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone,
            company: contactData.company,
            job_title: contactData.job_title,
            notes: contactData.notes,
            tags: contactData.tags,
          })
          .eq("id", existingSync.target_id);

        if (error) throw error;
        targetId = existingSync.target_id;
      } else if (!existingSync) {
        // Insert new contact
        // Get first workspace member as created_by (service role bypass)
        const { data: member } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", body.workspace_id)
          .limit(1)
          .single();

        if (!member) throw new Error("No workspace member found");

        const { data: newContact, error } = await supabase
          .from("contacts")
          .insert({
            workspace_id: body.workspace_id,
            created_by: member.user_id,
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone,
            company: contactData.company,
            job_title: contactData.job_title,
            notes: contactData.notes,
            tags: contactData.tags,
          })
          .select("id")
          .single();

        if (error) throw error;
        targetId = newContact.id;
      } else {
        // Already synced, skip
        targetId = existingSync.target_id;
      }
    } catch (err) {
      syncStatus = "error";
      console.error("Sync error:", err);
    }

    // Upsert sync record
    await supabase
      .from("imo_sync_records")
      .upsert(
        {
          workspace_id: body.workspace_id,
          source_table: body.source_table,
          source_id: sourceId,
          target_table: "contacts",
          target_id: targetId,
          sync_status: syncStatus,
          raw_payload: body.record as unknown as Record<string, unknown>,
          synced_at: syncStatus === "synced" ? new Date().toISOString() : null,
          error_message: syncStatus === "error" ? "Failed to sync contact" : null,
        },
        { onConflict: "workspace_id,source_table,source_id" },
      );

    return new Response(
      JSON.stringify({
        success: true,
        source_table: body.source_table,
        source_id: sourceId,
        target_id: targetId,
        sync_status: syncStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
