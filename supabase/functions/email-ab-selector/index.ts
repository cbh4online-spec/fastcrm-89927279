import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { ab_test_id } = await req.json();
    if (!ab_test_id) {
      return new Response(JSON.stringify({ error: "ab_test_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: test, error: testErr } = await supabase
      .from("campaign_ab_tests")
      .select("*")
      .eq("id", ab_test_id)
      .single();

    if (testErr || !test) {
      return new Response(JSON.stringify({ error: "A/B test not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (test.status === "completed") {
      return new Response(JSON.stringify({ winner: test.winner_variant, status: "already_completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine winner
    let winner: "a" | "b";
    if (test.winner_metric === "click_rate") {
      const aRate = test.variant_a_sent > 0 ? (test.variant_a_clicks || 0) / test.variant_a_sent : 0;
      const bRate = test.variant_b_sent > 0 ? (test.variant_b_clicks || 0) / test.variant_b_sent : 0;
      winner = aRate >= bRate ? "a" : "b";
    } else {
      const aRate = test.variant_a_sent > 0 ? test.variant_a_opens / test.variant_a_sent : 0;
      const bRate = test.variant_b_sent > 0 ? test.variant_b_opens / test.variant_b_sent : 0;
      winner = aRate >= bRate ? "a" : "b";
    }

    // Update test
    await supabase.from("campaign_ab_tests").update({
      winner_variant: winner,
      status: "completed",
    }).eq("id", ab_test_id);

    // Update campaign subject with winner
    const winnerSubject = winner === "a" ? test.variant_a_subject : test.variant_b_subject;
    await supabase.from("marketing_campaigns").update({
      subject: winnerSubject,
    }).eq("id", test.campaign_id);

    return new Response(JSON.stringify({
      winner,
      winner_subject: winnerSubject,
      variant_a_rate: test.variant_a_sent > 0 ? test.variant_a_opens / test.variant_a_sent : 0,
      variant_b_rate: test.variant_b_sent > 0 ? test.variant_b_opens / test.variant_b_sent : 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("AB selector error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
