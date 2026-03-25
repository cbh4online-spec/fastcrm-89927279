import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, nif } = await req.json();
    if (!accountId || !workspaceId) {
      return new Response(JSON.stringify({ success: false, error: "accountId e workspaceId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get account
    const { data: account, error: accError } = await supabase
      .from("account_brief_accounts")
      .select("id, name, nif, domain, normalized_domain")
      .eq("id", accountId)
      .eq("workspace_id", workspaceId)
      .single();

    if (accError || !account) {
      return new Response(JSON.stringify({ success: false, error: "Conta não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountNif = nif || account.nif;
    const companyName = account.name;

    if (!firecrawlKey) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ success: false, error: "AI não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Find Racius page
    let raciusUrl: string | null = null;
    const searchQuery = accountNif
      ? `site:racius.com ${accountNif}`
      : `site:racius.com "${companyName}"`;

    console.log(`[corporate] Searching Racius: ${searchQuery}`);

    try {
      const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: searchQuery, limit: 5 }),
        signal: AbortSignal.timeout(10000),
      });

      const searchData = await searchRes.json();
      if (searchRes.ok && searchData?.success && searchData?.data?.length > 0) {
        for (const result of searchData.data) {
          const url = result.url || "";
          if (url.includes("racius.com/") &&
              !url.includes("/empresas/?") &&
              !url.includes("/termos") &&
              !url.includes("/politica") &&
              !url.includes("/relatorios/")) {
            raciusUrl = url;
            break;
          }
        }
      }
    } catch (e) {
      console.warn("[corporate] Racius search failed:", (e as Error).message);
    }

    if (!raciusUrl && accountNif) {
      raciusUrl = `https://www.racius.com/empresas/?q=${accountNif}`;
    }

    if (!raciusUrl) {
      return new Response(JSON.stringify({ success: false, error: "Não foi possível encontrar a empresa no Racius" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[corporate] Scraping: ${raciusUrl}`);

    // Step 2: Scrape full page
    let markdown = "";
    try {
      const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: raciusUrl,
          formats: ["markdown"],
          onlyMainContent: false,
          waitFor: 2000,
        }),
        signal: AbortSignal.timeout(15000),
      });

      const scrapeData = await scrapeRes.json();
      markdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";
    } catch (e) {
      console.error("[corporate] Scrape failed:", (e as Error).message);
      return new Response(JSON.stringify({ success: false, error: "Falha ao aceder ao Racius", retryable: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (markdown.length < 100) {
      return new Response(JSON.stringify({ success: false, error: "Conteúdo insuficiente do Racius" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[corporate] Got ${markdown.length} chars, extracting with AI...`);

    // Step 3: Extract structured data with Gemini
    const extractionPrompt = `Analisa o seguinte conteúdo de uma página do Racius (registo comercial português) e extrai os dados corporativos em formato JSON.

CONTEÚDO:
${markdown.substring(0, 15000)}

Extrai e retorna APENAS um JSON válido com esta estrutura exata:
{
  "shareholders": [{"name": "string", "quota_percent": number|null, "quota_value": "string|null", "type": "individual|corporate"}],
  "managers": [{"name": "string", "role": "string", "start_date": "string|null"}],
  "annual_revenue": [{"year": number, "revenue": number|null, "revenue_formatted": "string|null", "currency": "EUR"}],
  "capital_social": "string|null",
  "legal_nature": "string|null",
  "founding_date": "string|null",
  "company_status": "string|null",
  "nif": "string|null"
}

Regras:
- shareholders: procura secções como "Sócios", "Quotistas", "Acionistas". Inclui nome, percentagem e valor da quota se disponível.
- managers: procura "Gerência", "Administração", "Órgãos Sociais". Inclui nome e cargo (Gerente, Administrador, etc.)
- annual_revenue: procura "Volume de Negócios", "Faturação", "Receitas". Extrai os últimos 3 anos se disponível. revenue deve ser número em euros.
- Se não encontrares dados para uma secção, retorna array vazio [].
- Retorna APENAS o JSON, sem texto adicional.`;

    try {
      const aiRes = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "És um extrator de dados corporativos de registos públicos portugueses. Retorna apenas JSON válido." },
            { role: "user", content: extractionPrompt },
          ],
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!aiRes.ok) {
        const status = aiRes.status;
        console.error(`[corporate] AI failed: ${status}`);
        if (status === 402 || status === 429) {
          return new Response(JSON.stringify({ success: false, error: "Serviço AI temporariamente indisponível", retryable: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: false, error: "Falha na extração AI" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiRes.json();
      const content = aiData?.choices?.[0]?.message?.content || "";
      
      // Parse JSON from AI response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[corporate] Could not parse AI response as JSON");
        return new Response(JSON.stringify({ success: false, error: "Falha ao processar resposta AI" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const extracted = JSON.parse(jsonMatch[0]);
      console.log(`[corporate] Extracted: ${extracted.shareholders?.length || 0} shareholders, ${extracted.managers?.length || 0} managers, ${extracted.annual_revenue?.length || 0} revenue entries`);

      // Step 4: Upsert to database
      const { error: upsertError } = await supabase
        .from("account_brief_corporate_data")
        .upsert({
          workspace_id: workspaceId,
          account_id: accountId,
          nif: extracted.nif || accountNif || null,
          shareholders: extracted.shareholders || [],
          managers: extracted.managers || [],
          annual_revenue: extracted.annual_revenue || [],
          capital_social: extracted.capital_social || null,
          legal_nature: extracted.legal_nature || null,
          founding_date: extracted.founding_date || null,
          company_status: extracted.company_status || null,
          source_url: raciusUrl,
          extracted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "account_id" });

      if (upsertError) {
        console.error("[corporate] Upsert error:", upsertError.message);
        throw upsertError;
      }

      // Update NIF on account if found and not already set
      if (extracted.nif && !account.nif) {
        await supabase.from("account_brief_accounts")
          .update({ nif: extracted.nif })
          .eq("id", accountId);
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          shareholders: extracted.shareholders || [],
          managers: extracted.managers || [],
          annual_revenue: extracted.annual_revenue || [],
          capital_social: extracted.capital_social,
          legal_nature: extracted.legal_nature,
          founding_date: extracted.founding_date,
          company_status: extracted.company_status,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("[corporate] Extraction error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("[corporate] Error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
