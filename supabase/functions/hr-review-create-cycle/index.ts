import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) throw new Error("Unauthorized");

    const { workspace_id, year, cycle_type, name } = await req.json();
    if (!workspace_id || !year) throw new Error("workspace_id and year are required");

    // Verify membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw new Error("Not a workspace member");

    const type = cycle_type || "annual";
    const cycleName = name || `Avaliação ${type === "annual" ? "Anual" : type === "semi_annual" ? "Semestral" : type === "quarterly" ? "Trimestral" : "Probatória"} ${year}`;

    // Calculate deadlines based on cycle type
    let selfDeadline: string, managerDeadline: string, calibrationDeadline: string, finalDeadline: string;

    if (type === "annual") {
      selfDeadline = `${year}-11-15T23:59:59Z`;
      managerDeadline = `${year}-11-30T23:59:59Z`;
      calibrationDeadline = `${year}-12-10T23:59:59Z`;
      finalDeadline = `${year}-12-20T23:59:59Z`;
    } else if (type === "semi_annual") {
      selfDeadline = `${year}-06-15T23:59:59Z`;
      managerDeadline = `${year}-06-25T23:59:59Z`;
      calibrationDeadline = `${year}-06-28T23:59:59Z`;
      finalDeadline = `${year}-06-30T23:59:59Z`;
    } else {
      selfDeadline = `${year}-03-20T23:59:59Z`;
      managerDeadline = `${year}-03-25T23:59:59Z`;
      calibrationDeadline = `${year}-03-28T23:59:59Z`;
      finalDeadline = `${year}-03-31T23:59:59Z`;
    }

    // Create cycle
    const { data: cycle, error: cycleErr } = await supabase
      .from("hr_review_cycles")
      .insert({
        workspace_id,
        name: cycleName,
        year,
        cycle_type: type,
        status: "active",
        self_review_deadline: selfDeadline,
        manager_review_deadline: managerDeadline,
        calibration_deadline: calibrationDeadline,
        final_deadline: finalDeadline,
      })
      .select()
      .single();

    if (cycleErr) throw new Error(`Failed to create cycle: ${cycleErr.message}`);

    // Fetch all active employees
    const { data: employees, error: empErr } = await supabase
      .from("hr_employees")
      .select("id, manager_id")
      .eq("workspace_id", workspace_id)
      .in("status", ["active", "Ativo"]);

    if (empErr) throw new Error(`Failed to fetch employees: ${empErr.message}`);

    // Create reviews for each employee
    const reviews = (employees || []).map((emp: any) => ({
      workspace_id,
      review_cycle_id: cycle.id,
      employee_id: emp.id,
      manager_id: emp.manager_id || null,
      status: "pending_self",
    }));

    if (reviews.length > 0) {
      const { error: reviewsErr } = await supabase
        .from("hr_performance_reviews")
        .insert(reviews);
      if (reviewsErr) throw new Error(`Failed to create reviews: ${reviewsErr.message}`);
    }

    // Create competency ratings for each review if competencies exist
    const { data: competencies } = await supabase
      .from("hr_competencies")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    if (competencies && competencies.length > 0) {
      const { data: createdReviews } = await supabase
        .from("hr_performance_reviews")
        .select("id")
        .eq("review_cycle_id", cycle.id);

      if (createdReviews && createdReviews.length > 0) {
        const compRatings = createdReviews.flatMap((rev: any) =>
          competencies.map((comp: any) => ({
            workspace_id,
            review_id: rev.id,
            competency_id: comp.id,
          }))
        );

        // Insert in batches of 500
        for (let i = 0; i < compRatings.length; i += 500) {
          const batch = compRatings.slice(i, i + 500);
          await supabase.from("hr_review_competency_ratings").insert(batch);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      cycle,
      reviews_created: reviews.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("hr-review-create-cycle error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
