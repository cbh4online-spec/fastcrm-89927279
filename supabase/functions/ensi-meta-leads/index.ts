import { createClient } from "npm:@supabase/supabase-js@2";
import { createEnsiMetaLeadsHandler } from "./handler.ts";

Deno.serve((request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "configuration_unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const store = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createEnsiMetaLeadsHandler({
    store,
    notifyNewLead: async ({ metaLeadId, fullName }) => {
      const { data } = await store
        .from("meta_leads")
        .select("workspace_id, lead_id")
        .eq("id", metaLeadId)
        .maybeSingle();
      if (!data?.workspace_id) return;
      await store.from("admin_notifications").insert({
        workspace_id: data.workspace_id,
        type: "lead",
        title: "Nova lead dos anúncios Meta",
        message: fullName ? `${fullName} preencheu o formulário ENSI.` : "Chegou um novo pedido do formulário ENSI.",
        metadata: { lead_id: data.lead_id ?? null, source: "meta_lead_ads", meta_lead_id: metaLeadId },
      });
    },
    config: {
      appSecret: Deno.env.get("ENSI_META_APP_SECRET"),
      verifyToken: Deno.env.get("ENSI_META_VERIFY_TOKEN"),
      pageAccessToken: Deno.env.get("ENSI_META_PAGE_ACCESS_TOKEN"),
    },
  })(request);
});
