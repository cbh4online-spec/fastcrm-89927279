// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info, x-supabase-client-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json().catch(() => ({ query: "" }));
    const q = String(query ?? "").trim();
    if (!q) {
      return new Response(
        JSON.stringify({ success: true, images: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY missing", images: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const target = `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1`;

    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: target,
        formats: ["rawHtml"],
        onlyMainContent: false,
      }),
    });

    const data = await fcRes.json().catch(() => null);
    if (!fcRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data?.error || `Firecrawl ${fcRes.status}`,
          images: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html: string =
      data?.data?.rawHtml || data?.rawHtml || data?.data?.html || data?.html || "";

    // Bing embeds image metadata as JSON in `m="{...}"` attributes containing murl/turl.
    const images: { url: string; thumb: string }[] = [];
    const seen = new Set<string>();
    const re = /m="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null && images.length < 20) {
      try {
        const decoded = match[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&");
        const obj = JSON.parse(decoded);
        const url = obj?.murl as string | undefined;
        const thumb = (obj?.turl as string | undefined) || url;
        if (url && /^https?:\/\//.test(url) && !seen.has(url)) {
          seen.add(url);
          images.push({ url, thumb: thumb || url });
        }
      } catch {
        /* ignore */
      }
    }

    return new Response(
      JSON.stringify({ success: true, images }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? "internal_error", images: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
