import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import { firecrawl } from "../_shared/firecrawl-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, runId, maxPages = 15 } = await req.json();
    if (!accountId || !workspaceId) {
      return new Response(JSON.stringify({ error: "accountId e workspaceId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get URLs to crawl (prioritized, active)
    const { data: urls, error: urlsError } = await supabase
      .from("account_brief_urls")
      .select("id, url, page_type")
      .eq("account_id", accountId)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .limit(maxPages);

    if (urlsError) throw urlsError;
    if (!urls?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0, failed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[crawl] Processing ${urls.length} URLs for account ${accountId}`);

    let processed = 0;
    let failed = 0;
    const startTime = Date.now();

    for (const urlRecord of urls) {
      try {
        console.log(`[crawl] Scraping: ${urlRecord.url}`);
        const result = await firecrawl.scrape(urlRecord.url, {
          formats: ["markdown"],
          onlyMainContent: true,
          timeout: 30000,
        });

        if (!result.success || !result.data?.markdown) {
          console.warn(`[crawl] No content for ${urlRecord.url}`);
          failed++;

          // Log error
          await supabase.from("account_brief_analysis_errors").insert({
            workspace_id: workspaceId,
            account_id: accountId,
            analysis_run_id: runId || null,
            url_id: urlRecord.id,
            step_name: "crawl",
            error_type: "no_content",
            error_message: result.error || "No markdown content returned",
            retryable: true,
          });
          continue;
        }

        const markdown = result.data.markdown;
        const title = result.data.metadata?.title || null;
        const httpStatus = result.data.metadata?.statusCode || 200;
        const finalUrl = result.data.metadata?.sourceURL || urlRecord.url;

        // Upsert page
        const { data: page, error: pageError } = await supabase
          .from("account_brief_pages")
          .upsert({
            workspace_id: workspaceId,
            account_id: accountId,
            url_id: urlRecord.id,
            final_url: finalUrl,
            title,
            page_type: urlRecord.page_type,
            http_status: httpStatus,
            crawl_status: "success",
            raw_text: markdown.slice(0, 50000), // Cap at 50k chars
            cleaned_text: markdown.slice(0, 30000),
            metadata_json: result.data.metadata || {},
            updated_at: new Date().toISOString(),
          }, { onConflict: "account_id,url_id" })
          .select("id")
          .single();

        if (pageError) {
          console.error(`[crawl] Page upsert error:`, pageError);
          // Try insert instead
          const { data: insertedPage } = await supabase
            .from("account_brief_pages")
            .insert({
              workspace_id: workspaceId,
              account_id: accountId,
              url_id: urlRecord.id,
              final_url: finalUrl,
              title,
              page_type: urlRecord.page_type,
              http_status: httpStatus,
              crawl_status: "success",
              raw_text: markdown.slice(0, 50000),
              cleaned_text: markdown.slice(0, 30000),
              metadata_json: result.data.metadata || {},
            })
            .select("id")
            .single();

          if (insertedPage) {
            // Create snapshot
            const hash = await hashText(markdown);
            await supabase.from("account_brief_page_snapshots").insert({
              workspace_id: workspaceId,
              account_id: accountId,
              page_id: insertedPage.id,
              snapshot_hash: hash,
              snapshot_text: markdown.slice(0, 30000),
            });
          }
        } else if (page) {
          // Create snapshot
          const hash = await hashText(markdown);
          await supabase.from("account_brief_page_snapshots").insert({
            workspace_id: workspaceId,
            account_id: accountId,
            page_id: page.id,
            snapshot_hash: hash,
            snapshot_text: markdown.slice(0, 30000),
          });
        }

        processed++;
      } catch (err) {
        console.error(`[crawl] Error scraping ${urlRecord.url}:`, err);
        failed++;

        await supabase.from("account_brief_analysis_errors").insert({
          workspace_id: workspaceId,
          account_id: accountId,
          analysis_run_id: runId || null,
          url_id: urlRecord.id,
          step_name: "crawl",
          error_type: "scrape_error",
          error_message: err instanceof Error ? err.message : String(err),
          retryable: true,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    // Update run
    if (runId) {
      await supabase
        .from("account_brief_analysis_runs")
        .update({
          pages_processed: processed,
          pages_failed: failed,
          duration_ms: durationMs,
          status: failed === urls.length ? "failed" : processed > 0 ? "processing" : "failed",
        })
        .eq("id", runId);
    }

    console.log(`[crawl] Done: ${processed} processed, ${failed} failed in ${durationMs}ms`);

    return new Response(JSON.stringify({ success: true, processed, failed, durationMs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[crawl] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
