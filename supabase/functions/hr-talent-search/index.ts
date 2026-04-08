import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── PORTAL CATALOG ───
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

// ─── PLATFORM DETECTION ───
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
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("net-empregos")) return "Net-Empregos";
  return "web";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { search_type, query, location, workspace_id, rss_url, portal_slug, keywords } = await req.json();

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    // ─── PORTAL IMPORT (NEW) ───
    if (search_type === "portal_import" && portal_slug) {
      return await handlePortalImport({ portal_slug, keywords, workspace_id, supabase, firecrawlKey, lovableKey, corsHeaders });
    }

    // ─── RSS FEED IMPORT ───
    if (search_type === "rss_feed" && rss_url) {
      return await handleRssFeed({ rss_url, workspace_id, supabase, firecrawlKey, lovableKey, corsHeaders });
    }

    // ─── WEB SEARCH (existing) ───
    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const type = search_type || "candidate";
    const loc = location ? ` ${location}` : "";
    let searchQuery: string;

    if (type === "candidate") {
      searchQuery = `${query}${loc} CV perfil profissional site:linkedin.com/in OR site:indeed.pt OR site:net-empregos.com`;
    } else {
      searchQuery = `${query}${loc} emprego vaga site:indeed.pt OR site:net-empregos.com OR site:linkedin.com/jobs`;
    }

    console.log("Searching:", searchQuery);

    const fcAbort = new AbortController();
    const fcTimeout = setTimeout(() => fcAbort.abort(), 25000);
    const fcResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        lang: "pt",
        country: "pt",
      }),
      signal: fcAbort.signal,
    });
    clearTimeout(fcTimeout);

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

    const extractedResults = await extractSearchResults(results, type, query, workspace_id, lovableKey);

    if (extractedResults.length > 0) {
      const { error: insertErr } = await supabase
        .from("hr_talent_results")
        .insert(extractedResults);
      if (insertErr) console.error("Insert error:", insertErr);
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

// ─── PORTAL IMPORT HANDLER ───
async function handlePortalImport({ portal_slug, keywords, workspace_id, supabase, firecrawlKey, lovableKey, corsHeaders }: any) {
  const portal = PORTAL_CATALOG[portal_slug];
  if (!portal) {
    return new Response(
      JSON.stringify({ error: `Portal desconhecido: ${portal_slug}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`Portal import: ${portal.name}, keywords: ${keywords || "(none)"}`);

  const kw = keywords?.trim() || "emprego";
  let results: any[] = [];

  // Strategy: try scrape for portals with known URLs, then fallback to search
  if (portal.scrapeUrl && !keywords) {
    console.log(`Scraping portal page: ${portal.scrapeUrl}`);
    try {
      const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: portal.scrapeUrl,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });

      if (scrapeResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos Firecrawl insuficientes", code: "CREDITS_EXHAUSTED" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (scrapeResp.ok) {
        const scrapeData = await scrapeResp.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        if (markdown.length > 100) {
          // Parse with AI
          const parsed = await parseContentWithAI(markdown, portal.name, portal.scrapeUrl, lovableKey);
          if (parsed.length > 0) {
            results = parsed.map((job: any) => ({
              ...job,
              source_url: job.source_url || portal.scrapeUrl,
            }));
          }
        }
      }
    } catch (e) {
      console.error("Scrape fallback to search:", e);
    }
  }

  // Search fallback or primary strategy
  if (results.length === 0) {
    const searchQuery = portal.searchQuery(kw);
    console.log(`Searching portal: ${searchQuery}`);

    const portalAbort = new AbortController();
    const portalTimeout = setTimeout(() => portalAbort.abort(), 25000);
    const fcResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        lang: "pt",
        country: "pt",
      }),
      signal: portalAbort.signal,
    });
    clearTimeout(portalTimeout);

    if (fcResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos Firecrawl insuficientes", code: "CREDITS_EXHAUSTED" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fcResponse.ok) {
      const errData = await fcResponse.json();
      console.error("Firecrawl search error:", errData);
      return new Response(
        JSON.stringify({ error: errData.error || "Search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fcData = await fcResponse.json();
    const searchResults = fcData.data || [];

    for (const r of searchResults) {
      results.push({
        job_title: r.title || "Sem título",
        description: r.description || "",
        source_url: r.url || "",
        company: "",
        location: "",
        skills_required: [],
        employment_type: "",
      });
    }

    // Enrich with AI if available
    if (lovableKey && searchResults.length > 0) {
      const enriched = await extractSearchResults(searchResults, "job_offer", kw, workspace_id, lovableKey);
      if (enriched.length > 0) {
        // Use enriched data directly
        // Deduplicate by source_url
        const { data: existingUrls } = await supabase
          .from("hr_talent_results")
          .select("source_url")
          .eq("workspace_id", workspace_id)
          .in("source_url", enriched.map((r: any) => r.source_url).filter(Boolean));

        const existingSet = new Set((existingUrls || []).map((r: any) => r.source_url));
        const deduped = enriched.filter((r: any) => !r.source_url || !existingSet.has(r.source_url));

        // Override platform detection
        const finalResults = deduped.map((r: any) => ({
          ...r,
          source_platform: detectPlatform(r.source_url) !== "web" ? detectPlatform(r.source_url) : portal.name,
          search_query: `portal:${portal_slug}${keywords ? ` ${keywords}` : ""}`,
        }));

        if (finalResults.length > 0) {
          const { error: insertErr } = await supabase
            .from("hr_talent_results")
            .insert(finalResults);
          if (insertErr) console.error("Insert error:", insertErr);
        }

        return new Response(
          JSON.stringify({ success: true, results: finalResults, count: finalResults.length, portal: portal.name }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  }

  // If we got results from scraping (not search-enriched path)
  if (results.length > 0) {
    // Deduplicate
    const urls = results.map((r: any) => r.source_url).filter(Boolean);
    const { data: existingUrls } = urls.length > 0
      ? await supabase.from("hr_talent_results").select("source_url").eq("workspace_id", workspace_id).in("source_url", urls)
      : { data: [] };

    const existingSet = new Set((existingUrls || []).map((r: any) => r.source_url));

    const insertRows = results
      .filter((r: any) => !r.source_url || !existingSet.has(r.source_url))
      .map((job: any) => ({
        workspace_id,
        search_type: "job_offer",
        search_query: `portal:${portal_slug}${keywords ? ` ${keywords}` : ""}`,
        source_url: job.source_url || "",
        source_platform: portal.name,
        title: job.job_title || "Sem título",
        description: (job.description || "").slice(0, 500),
        location: job.location || "",
        skills: job.skills_required || [],
        raw_content: "",
        extracted_data: job,
        status: "new",
      }));

    if (insertRows.length > 0) {
      const { error: insertErr } = await supabase
        .from("hr_talent_results")
        .insert(insertRows);
      if (insertErr) console.error("Insert error:", insertErr);
    }

    return new Response(
      JSON.stringify({ success: true, results: insertRows, count: insertRows.length, portal: portal.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, results: [], count: 0, message: `Sem resultados de ${portal.name}`, portal: portal.name }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── PARSE CONTENT WITH AI ───
async function parseContentWithAI(markdown: string, portalName: string, sourceUrl: string, lovableKey: string | undefined): Promise<any[]> {
  if (!lovableKey) return [];

  try {
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract job listings from web pages. Return structured data." },
          {
            role: "user",
            content: `Extract all job listings from this ${portalName} page. For each job extract:
- job_title, company, location, description (max 200 chars), skills_required (array), employment_type, source_url (link to individual posting if available)

Source: ${sourceUrl}
Content (first 8000 chars):
${markdown.slice(0, 8000)}`,
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
                      source_url: { type: "string" },
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

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI parse failed:", aiResp.status, errText);
      return [];
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return [];

    const parsed = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return parsed.jobs || [];
  } catch (e) {
    console.error("AI parse error:", e);
    return [];
  }
}

// ─── RSS FEED HANDLER ───
async function handleRssFeed({ rss_url, workspace_id, supabase, firecrawlKey, lovableKey, corsHeaders }: any) {
  console.log("Fetching RSS feed:", rss_url);

  const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: rss_url,
      formats: ["markdown", "html"],
      onlyMainContent: false,
    }),
  });

  const scrapeData = await scrapeResp.json();

  if (!scrapeResp.ok) {
    console.error("Firecrawl scrape error:", scrapeData);
    if (scrapeResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "Firecrawl credits insufficient", code: "CREDITS_EXHAUSTED" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: scrapeData.error || "Failed to fetch RSS feed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rawContent = scrapeData.data?.markdown || scrapeData.data?.html || scrapeData.markdown || scrapeData.html || "";

  if (!rawContent || rawContent.length < 50) {
    return new Response(
      JSON.stringify({ success: true, results: [], message: "Feed vazio ou inacessível" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!lovableKey) {
    return new Response(
      JSON.stringify({ error: "AI Gateway not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Parsing RSS content with AI, length:", rawContent.length);

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You extract job listings from RSS feeds and web pages. Return structured data for each job found." },
        {
          role: "user",
          content: `Extract all job listings from this RSS feed / job portal page. For each job, extract:
- job_title, company, location, description (max 200 chars), skills_required (array), employment_type, salary_range, source_url, published_date

Source URL: ${rss_url}
Content (first 8000 chars):
${rawContent.slice(0, 8000)}`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_jobs",
          description: "Extract multiple job listings from RSS feed content",
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
                    salary_range: { type: "string" },
                    source_url: { type: "string" },
                    published_date: { type: "string" },
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

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error("AI parsing failed:", aiResp.status, errText);
    return new Response(
      JSON.stringify({ error: "Failed to parse feed with AI" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const aiData = await aiResp.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    return new Response(
      JSON.stringify({ success: true, results: [], message: "Não foi possível extrair vagas do feed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const parsed = typeof toolCall.function.arguments === "string"
    ? JSON.parse(toolCall.function.arguments)
    : toolCall.function.arguments;

  const jobs = parsed.jobs || [];
  console.log(`Extracted ${jobs.length} jobs from RSS feed`);

  const platform = detectPlatform(rss_url);

  const extractedResults = jobs.map((job: any) => ({
    workspace_id,
    search_type: "job_offer",
    search_query: `RSS: ${rss_url}`,
    source_url: job.source_url || rss_url,
    source_platform: platform !== "web" ? platform : "RSS Feed",
    title: job.job_title || "Sem título",
    description: (job.description || "").slice(0, 500),
    location: job.location || "",
    skills: job.skills_required || [],
    raw_content: rawContent.slice(0, 5000),
    extracted_data: job,
    status: "new",
  }));

  if (extractedResults.length > 0) {
    const { error: insertErr } = await supabase
      .from("hr_talent_results")
      .insert(extractedResults);
    if (insertErr) console.error("Insert error:", insertErr);
  }

  return new Response(
    JSON.stringify({ success: true, results: extractedResults, count: extractedResults.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── EXTRACT SEARCH RESULTS (shared) ───
async function extractSearchResults(
  results: any[],
  type: string,
  query: string,
  workspace_id: string,
  lovableKey: string | undefined
) {
  const extractedResults: any[] = [];

  for (const result of results) {
    const markdown = result.markdown || result.description || "";
    const sourceUrl = result.url || "";
    const title = result.title || "";

    let extractedData: any = {};
    let skills: string[] = [];
    let extractedLocation = "";
    let description = result.description || "";

    if (lovableKey && markdown && markdown.length > 50) {
      try {
        const extractionPrompt = type === "candidate"
          ? `Extract from this web page about a professional/candidate:
- name, role, location, skills (array), experience_years, bio (max 200 chars), email, linkedin_url

Page title: ${title}
Content:
${markdown.slice(0, 3000)}`
          : `Extract from this job posting:
- job_title, company, location, salary_range, skills_required (array), employment_type, description (max 200 chars)

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
            tools: [{
              type: "function",
              function: {
                name: "extract_data",
                description: "Extract structured data from the web page content",
                parameters: type === "candidate"
                  ? {
                      type: "object",
                      properties: {
                        name: { type: "string" }, role: { type: "string" }, location: { type: "string" },
                        skills: { type: "array", items: { type: "string" } }, experience_years: { type: "number" },
                        bio: { type: "string" }, email: { type: "string" }, linkedin_url: { type: "string" },
                      },
                      required: ["name"],
                    }
                  : {
                      type: "object",
                      properties: {
                        job_title: { type: "string" }, company: { type: "string" }, location: { type: "string" },
                        salary_range: { type: "string" }, skills_required: { type: "array", items: { type: "string" } },
                        employment_type: { type: "string" }, description: { type: "string" },
                      },
                      required: ["job_title"],
                    },
              },
            }],
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

    const platform = detectPlatform(sourceUrl);

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

  return extractedResults;
}