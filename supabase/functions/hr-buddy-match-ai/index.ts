import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { new_employee_id, workspace_id } = await req.json();
    if (!new_employee_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "new_employee_id and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get new employee info
    const { data: newEmployee } = await supabase
      .from("hr_employees")
      .select("id, full_name, department, job_title, department_id")
      .eq("id", new_employee_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (!newEmployee) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get potential buddies (active employees, excluding the new one)
    const { data: candidates } = await supabase
      .from("hr_employees")
      .select("id, full_name, department, job_title, hire_date, department_id")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .neq("id", new_employee_id)
      .limit(50);

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ matches: [], message: "No active employees available for buddy matching" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are an HR buddy matching assistant. Given a new employee and a list of potential buddies, select the top 3 best matches.

New Employee:
- Name: ${newEmployee.full_name}
- Department: ${newEmployee.department || "N/A"}
- Job Title: ${newEmployee.job_title || "N/A"}

Potential Buddies:
${candidates.map((c, i) => `${i + 1}. ID: ${c.id} | Name: ${c.full_name} | Dept: ${c.department || "N/A"} | Title: ${c.job_title || "N/A"} | Hire Date: ${c.hire_date || "N/A"}`).join("\n")}

Consider: same/similar department, complementary skills, seniority (experienced employees are better buddies), and diversity of perspective.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an HR buddy matching AI. Return structured results." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_buddies",
            description: "Return top 3 buddy matches with scores and reasoning",
            parameters: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      employee_id: { type: "string", description: "UUID of the matched employee" },
                      score: { type: "number", description: "Match score 0-100" },
                      reasoning: { type: "string", description: "Why this person is a good buddy match" },
                    },
                    required: ["employee_id", "score", "reasoning"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["matches"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_buddies" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429 || status === 402) {
        // Fallback: return department-based matches
        const deptMatches = candidates
          .filter(c => c.department === newEmployee.department)
          .slice(0, 3)
          .map(c => ({ employee_id: c.id, employee_name: c.full_name, score: 70, reasoning: "Mesmo departamento (fallback sem IA)" }));
        return new Response(JSON.stringify({ matches: deptMatches, fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    // Enrich matches with employee names
    const enrichedMatches = (parsed.matches || []).map((m: any) => {
      const emp = candidates.find(c => c.id === m.employee_id);
      return {
        ...m,
        employee_name: emp?.full_name || "Desconhecido",
        department: emp?.department,
        job_title: emp?.job_title,
      };
    });

    return new Response(JSON.stringify({ matches: enrichedMatches }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hr-buddy-match-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
