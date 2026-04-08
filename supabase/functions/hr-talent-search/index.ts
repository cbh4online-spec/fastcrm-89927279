import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { search_type, query, location, workspace_id } = await req.json();

    if (!query || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "query and workspace_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search query based on type
    const type = search_type || "candidate";
    const loc = location ? ` ${location}` : "";
    let searchQuery: string;

    if (type === "candidate") {
      searchQuery = `${query}${loc} CV perfil profissional site:linkedin.com/in OR site:indeed.pt OR site:net-empregos.com`;
    } else {
      searchQuery = `${query}${loc} emprego vaga site:indeed.pt OR site:net-empregos.com OR site:linkedin.com/jobs`;
    }

    // Call Firecrawl search
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching:", searchQuery);

    const fcResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        lang: "pt",
        country: "pt",
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const fcData = await fcResponse.json();

    if (!fcResponse.ok) {
      console.error("Firecrawl error:", fcData);
      if (fcResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Firecrawl credits insufficient", code: "CREDITS_EXHAUSTED" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: fcData.error || "Search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = fcData.data || [];
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results: [], message: "No results found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to extract structured data from each result
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const extractedResults: any[] = [];

    for (const result of results) {
      const markdown = result.markdown || result.description || "";
      const sourceUrl = result.url || "";
      const title = result.title || "";

      let extractedData: any = {};
      let skills: string[] = [];
      let extractedLocation = "";
      let description = result.description || "";

      // Try AI extraction if we have the key and content
      if (lovableKey && markdown && markdown.length > 50) {
        try {
          const extractionPrompt = type === "candidate"
            ? `Extract from this web page about a professional/candidate:
- name: full name
- role: current or desired role/title
- location: city/country
- skills: array of technical and soft skills
- experience_years: estimated years of experience
- bio: short professional summary (max 200 chars)
- email: if visible
- linkedin_url: if visible

Page title: ${title}
Content:
${markdown.slice(0, 3000)}`
            : `Extract from this job posting:
- job_title: position title
- company: company name
- location: city/country
- salary_range: if mentioned
- skills_required: array of required skills
- employment_type: full-time/part-time/contract
- description: short summary (max 200 chars)

Page title: ${title}
Content:
${markdown.slice(0, 3000)}`;

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "You extract structured data from web pages. Return ONLY the requested fields." },
                { role: "user", content: extractionPrompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "extract_data",
                    description: "Extract structured data from the web page content",
                    parameters: type === "candidate"
                      ? {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            role: { type: "string" },
                            location: { type: "string" },
                            skills: { type: "array", items: { type: "string" } },
                            experience_years: { type: "number" },
                            bio: { type: "string" },
                            email: { type: "string" },
                            linkedin_url: { type: "string" },
                          },
                          required: ["name"],
                        }
                      : {
                          type: "object",
                          properties: {
                            job_title: { type: "string" },
                            company: { type: "string" },
                            location: { type: "string" },
                            salary_range: { type: "string" },
                            skills_required: { type: "array", items: { type: "string" } },
                            employment_type: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["job_title"],
                        },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "extract_data" } },
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall?.function?.arguments) {
              const parsed = typeof toolCall.function.arguments === "string"
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments;
              extractedData = parsed;
              skills = parsed.skills || parsed.skills_required || [];
              extractedLocation = parsed.location || "";
              description = parsed.bio || parsed.description || description;
            }
          } else {
            const errText = await aiResp.text();
            console.error("AI extraction failed:", aiResp.status, errText);
          }
        } catch (aiErr) {
          console.error("AI extraction error:", aiErr);
        }
      }

      // Detect platform
      let platform = "web";
      if (sourceUrl.includes("linkedin.com")) platform = "LinkedIn";
      else if (sourceUrl.includes("indeed.")) platform = "Indeed";
      else if (sourceUrl.includes("net-empregos")) platform = "Net-Empregos";
      else if (sourceUrl.includes("sapo.pt")) platform = "Sapo Emprego";

      extractedResults.push({
        workspace_id,
        search_type: type,
        search_query: query,
        source_url: sourceUrl,
        source_platform: platform,
        title: extractedData.name || extractedData.job_title || title,
        description: description?.slice(0, 500),
        location: extractedLocation,
        skills,
        raw_content: markdown?.slice(0, 5000),
        extracted_data: extractedData,
        status: "new",
      });
    }

    // Persist results
    if (extractedResults.length > 0) {
      const { error: insertErr } = await supabase
        .from("hr_talent_results")
        .insert(extractedResults);

      if (insertErr) {
        console.error("Insert error:", insertErr);
        // Still return results even if persist fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, results: extractedResults, count: extractedResults.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("hr-talent-search error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
