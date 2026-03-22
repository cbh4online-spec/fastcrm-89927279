import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    const { recommendation_id, feedback, workspace_id, context_module, notes } =
      await req.json();

    if (!recommendation_id || !feedback || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios em falta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership
    if (user) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) {
        return new Response(
          JSON.stringify({ error: "Sem acesso" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const statusMap: Record<string, string> = {
      relevant: "pending",
      not_relevant: "dismissed",
      already_has: "dismissed",
      too_expensive: "dismissed",
      wrong_timing: "dismissed",
      added_to_proposal: "added_to_proposal",
      added_to_order: "added_to_order",
      converted: "converted",
    };

    await Promise.all([
      supabase.from("recommendation_feedback").insert({
        recommendation_id,
        feedback,
        workspace_id,
        context_module,
        notes,
        created_by: user?.id,
      }),
      supabase
        .from("product_recommendations")
        .update({
          status: statusMap[feedback] ?? "dismissed",
          dismissed_reason: [
            "not_relevant",
            "already_has",
            "too_expensive",
            "wrong_timing",
          ].includes(feedback)
            ? feedback
            : null,
          acted_on_at: new Date().toISOString(),
        })
        .eq("id", recommendation_id)
        .eq("workspace_id", workspace_id),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in recommendation-feedback:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
