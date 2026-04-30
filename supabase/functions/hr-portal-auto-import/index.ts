import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { logAIUsage } from "../_shared/ai-instrumentation.ts";

// ── AI usage logging helper (auto-injected) ───────────────────────────────────
async function __loggedAIFetch(
  workspaceId: string | null,
  feature: string,
  init: RequestInit
): Promise<Response> {
  const start = Date.now();
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const body = init.body ? JSON.parse(init.body as string) : {};
  const model = body.model || "google/gemini-3-flash-preview";
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (workspaceId) {
      logAIUsage({
        workspace_id: workspaceId,
        feature,
        model,
        tokens_input: 0,
        tokens_output: 0,
        latency_ms: Date.now() - start,
        was_error: true,
        error_type: "network",
      });
    }
    throw e;
  }

  if (!workspaceId) return response;

  const clone = response.clone();
  clone.json().then((data: any) => {
    const tokens_input = data?.usage?.prompt_tokens ?? 0;
    const tokens_output = data?.usage?.completion_tokens ?? 0;
    logAIUsage({
      workspace_id: workspaceId,
      feature,
      model,
      tokens_input,
      tokens_output,
      latency_ms: Date.now() - start,
      was_error: !response.ok,
      error_type: response.ok ? undefined : `http_${response.status}`,
    });
  }).catch(() => {});

  return response;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── PORTAL CATALOG (duplicated from hr-talent-search for isolation) ───
const PORTAL_CATALOG: Record<string, { name: string; domain: string; searchQuery: (kw: string) => string; scrapeUrl?: string }> = {
  jobleads: {
    name: "JobLeads",
    domain: "jobleads.com",
    searchQuery: (kw) => `site:jobleads.com ${kw} emprego Portugal`,
  },
  dataannotation: {
    name: "DataAnnotation",
    domain: "dataannotation.tech",
    searchQuery: (kw) => `site:dataannotation.tech ${kw} Portugal portuguese`,
    scrapeUrl: "https://www.dataannotation.tech/language-directory?projects=PT",
  },
  sapo_emprego: {
    name: "Sapo Emprego",
    domain: "emprego.sapo.pt",
    searchQuery: (kw) => `site:emprego.sapo.pt ${kw}`,
  },
  alerta_emprego: {
    name: "Alerta Emprego",
    domain: "alertaemprego.pt",
    searchQuery: (kw) => `site:alertaemprego.pt ${kw}`,
  },
  portal_emprego: {
    name: "Portal Emprego",
    domain: "portalemprego.pt",
    searchQuery: (kw) => `site:portalemprego.pt ${kw}`,
  },
  indeed_pt: {
    name: "Indeed PT",
    domain: "pt.indeed.com",
    searchQuery: (kw) => `site:pt.indeed.com ${kw}`,
  },
  expresso_emprego: {
    name: "Expresso Emprego",
    domain: "expressoemprego.pt",
    searchQuery: (kw) => `site:expressoemprego.pt ${kw}`,
  },
  iefp: {
    name: "IEFP",
    domain: "iefp.pt",
    searchQuery: (kw) => `site:iefp.pt emprego ${kw}`,
    scrapeUrl: "https://www.iefp.pt/emprego",
  },
  emprego_publico: {
    name: "Emprego Público",
    domain: "empregopublico.gov.pt",
    searchQuery: (kw) => `site:empregopublico.gov.pt ${kw}`,
    scrapeUrl: "https://www.empregopublico.gov.pt/",
  },
};

function detectPlatform(url: string): string {
  if (!url) return "web";
  const lower = url.toLowerCase();
  if (lower.includes("jobleads.com")) return "JobLeads";
  if (lower.includes("dataannotation.tech")) return "DataAnnotation";
  if (lower.includes("emprego.sapo.pt")) return "Sapo Emprego";
  if (lower.includes("alertaemprego.pt")) return "Alerta Emprego";
  if (lower.includes("portalemprego.pt")) return "Portal Emprego";
  if (lower.includes("pt.indeed.com") || lower.includes("indeed.pt")) return "Indeed PT";
  if (lower.includes("expressoemprego.pt")) return "Expresso Emprego";
  if (lower.includes("iefp.pt")) return "IEFP";
  if (lower.includes("empregopublico.gov.pt")) return "Emprego Público";
  return "web";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ─── Validate cron secret ───
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");

  // Accept either cron secret header OR the anon key from pg_net
  const isAuthorized =
    (cronSecret && providedSecret === cronSecret) ||
    (authHeader?.startsWith("Bearer ") && authHeader.replace("Bearer ", "") === Deno.env.get("SUPABASE_ANON_KEY"));

  if (!isAuthorized) {
    console.error("Unauthorized auto-import attempt");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  if (!firecrawlKey) {
    console.error("FIRECRAWL_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Firecrawl not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get all active workspaces
    const { data: workspaces, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, name")
      .limit(50);

    if (wsErr || !workspaces?.length) {
      console.log("No workspaces found or error:", wsErr);
      return new Response(
        JSON.stringify({ success: true, message: "No workspaces to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const summary: Record<string, any> = {};
    const portalSlugs = Object.keys(PORTAL_CATALOG);

    for (const ws of workspaces) {
      console.log(`Processing workspace: ${ws.name} (${ws.id})`);
      const wsResults: Record<string, number> = {};

      for (const slug of portalSlugs) {
        const portal = PORTAL_CATALOG[slug];
        try {
          const imported = await importFromPortal({
            portalSlug: slug,
            portal,
            workspaceId: ws.id,
            supabase,
            firecrawlKey,
            lovableKey,
            maxResults: 5,
          });
          wsResults[portal.name] = imported;
          console.log(`  ${portal.name}: ${imported} new results`);
        } catch (err) {
          console.error(`  ${portal.name} failed:`, err instanceof Error ? err.message : err);
          wsResults[portal.name] = -1; // error marker
        }

        // Rate limit: 1.5s between portals
        await delay(1500);
      }

      summary[ws.name] = wsResults;
    }

    console.log("Auto-import complete:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Auto-import fatal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Import from a single portal for a workspace ───
async function importFromPortal({
  portalSlug,
  portal,
  workspaceId,
  supabase,
  firecrawlKey,
  lovableKey,
  maxResults,
}: {
  portalSlug: string;
  portal: (typeof PORTAL_CATALOG)[string];
  workspaceId: string;
  supabase: any;
  firecrawlKey: string;
  lovableKey: string | undefined;
  maxResults: number;
}): Promise<number> {
  const kw = "emprego";
  const searchQuery = portal.searchQuery(kw);

  const importAbort = new AbortController();
  const importTimeout = setTimeout(() => importAbort.abort(), 25000);
  const fcResponse = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: searchQuery,
      limit: maxResults,
      lang: "pt",
      country: "pt",
    }),
    signal: importAbort.signal,
  });
  clearTimeout(importTimeout);

  if (fcResponse.status === 402) {
    console.warn("Firecrawl credits exhausted — stopping");
    throw new Error("CREDITS_EXHAUSTED");
  }

  if (fcResponse.status === 429) {
    console.warn("Firecrawl rate limited");
    throw new Error("RATE_LIMITED");
  }

  if (!fcResponse.ok) {
    const errData = await fcResponse.json().catch(() => ({}));
    throw new Error(`Firecrawl error ${fcResponse.status}: ${JSON.stringify(errData)}`);
  }

  const fcData = await fcResponse.json();
  const searchResults = fcData.data || [];

  if (searchResults.length === 0) return 0;

  // Build basic results
  const rawResults = searchResults.map((r: any) => ({
    workspace_id: workspaceId,
    search_type: "job_offer",
    search_query: `auto:${portalSlug}`,
    source_url: r.url || "",
    source_platform: detectPlatform(r.url) !== "web" ? detectPlatform(r.url) : portal.name,
    title: r.title || "Sem título",
    description: (r.description || "").slice(0, 500),
    location: "",
    skills: [],
    raw_content: (r.description || "").slice(0, 2000),
    extracted_data: { job_title: r.title, description: r.description },
    status: "new",
  }));

  // Deduplicate by source_url
  const urls = rawResults.map((r: any) => r.source_url).filter(Boolean);
  if (urls.length === 0) return 0;

  const { data: existing } = await supabase
    .from("hr_talent_results")
    .select("source_url")
    .eq("workspace_id", workspaceId)
    .in("source_url", urls);

  const existingSet = new Set((existing || []).map((r: any) => r.source_url));
  const deduped = rawResults.filter((r: any) => !r.source_url || !existingSet.has(r.source_url));

  if (deduped.length === 0) return 0;

  // Enrich with AI if available
  if (lovableKey) {
    try {
      const combinedContent = searchResults
        .map((r: any) => `## ${r.title}\nURL: ${r.url}\n${(r.description || "").slice(0, 1500)}`)
        .join("\n\n---\n\n");

      const aiResp = await __loggedAIFetch(workspaceId ?? null, "hr-portal-auto-import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "Extract job listings. Return structured JSON via the tool call." },
            {
              role: "user",
              content: `Extract job listings from ${portal.name}. For each: job_title, company, location, description (max 150 chars), skills_required (array), employment_type.\n\n${combinedContent.slice(0, 6000)}`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "extract_jobs",
              description: "Extract job listings",
              parameters: {
                type: "object",
                properties: {
                  jobs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        job_title: { type: "string" },
                        company: { type: "string" },
                        location: { type: "string" },
                        description: { type: "string" },
                        skills_required: { type: "array", items: { type: "string" } },
                        employment_type: { type: "string" },
                      },
                      required: ["job_title"],
                    },
                  },
                },
                required: ["jobs"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "extract_jobs" } },
        }),
      });

      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          const jobs = parsed.jobs || [];
          // Merge AI data into deduped results
          for (let i = 0; i < Math.min(deduped.length, jobs.length); i++) {
            const job = jobs[i];
            deduped[i].title = job.job_title || deduped[i].title;
            deduped[i].description = (job.description || "").slice(0, 500) || deduped[i].description;
            deduped[i].location = job.location || "";
            deduped[i].skills = job.skills_required || [];
            deduped[i].extracted_data = job;
          }
        }
      }
    } catch (aiErr) {
      console.warn("AI enrichment failed, using raw data:", aiErr instanceof Error ? aiErr.message : aiErr);
    }
  }

  const { error: insertErr } = await supabase
    .from("hr_talent_results")
    .insert(deduped);

  if (insertErr) {
    console.error("Insert error:", insertErr);
    throw new Error(`Insert failed: ${insertErr.message}`);
  }

  return deduped.length;
}
