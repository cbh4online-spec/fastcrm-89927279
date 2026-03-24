import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import { firecrawl } from "../_shared/firecrawl-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { urlId, workspaceId } = await req.json();
    if (!urlId || !workspaceId) {
      return new Response(JSON.stringify({ error: "urlId e workspaceId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: urlRecord, error } = await supabase
      .from("account_brief_urls")
      .select("id, url, page_type, account_id")
      .eq("id", urlId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !urlRecord) {
      return new Response(JSON.stringify({ error: "URL não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[reprocess] Scraping: ${urlRecord.url}`);
    const result = await firecrawl.scrape(urlRecord.url, {
      formats: ["markdown"],
      onlyMainContent: true,
    });

    if (!result.success || !result.data?.markdown) {
      return new Response(JSON.stringify({ success: false, error: result.error || "Sem conteúdo" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const markdown = result.data.markdown;
    const title = result.data.metadata?.title || null;

    await supabase.from("account_brief_pages").upsert({
      workspace_id: workspaceId,
      account_id: urlRecord.account_id,
      url_id: urlRecord.id,
      final_url: result.data.metadata?.sourceURL || urlRecord.url,
      title,
      page_type: urlRecord.page_type,
      http_status: result.data.metadata?.statusCode || 200,
      crawl_status: "success",
      raw_text: markdown.slice(0, 50000),
      cleaned_text: markdown.slice(0, 30000),
      metadata_json: result.data.metadata || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id,url_id" });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[reprocess] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
