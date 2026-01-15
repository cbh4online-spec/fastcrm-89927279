import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyData {
  company_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  cae: string | null;
  cae_description: string | null;
  company_status: string | null;
  capital_social: string | null;
  founding_date: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nif } = await req.json();

    if (!nif) {
      return new Response(
        JSON.stringify({ error: "NIF é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate NIF format (9 digits for Portuguese companies)
    const cleanNif = nif.toString().replace(/\s/g, "");
    if (!/^\d{9}$/.test(cleanNif)) {
      return new Response(
        JSON.stringify({ error: "NIF deve ter 9 dígitos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY não está configurada");
    }

    // Use einforma.pt which has direct NIF URLs
    const einformaUrl = `https://www.einforma.pt/servlet/app/portal/ENTP/prod/ETIQUETA_EMPRESA/nif/${cleanNif}`;
    
    console.log(`Looking up NIF ${cleanNif} on einforma.pt...`);

    // Use Firecrawl with JSON extraction for structured data
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: einformaUrl,
        formats: [
          "markdown",
          {
            type: "json",
            schema: {
              type: "object",
              properties: {
                company_name: { 
                  type: "string", 
                  description: "Nome da empresa / Denominação social" 
                },
                billing_address: { 
                  type: "string", 
                  description: "Morada completa / Sede / Endereço" 
                },
                billing_city: { 
                  type: "string", 
                  description: "Cidade / Localidade" 
                },
                billing_postal_code: { 
                  type: "string", 
                  description: "Código Postal no formato XXXX-XXX" 
                },
                cae: { 
                  type: "string", 
                  description: "Código CAE principal (5 dígitos)" 
                },
                cae_description: { 
                  type: "string", 
                  description: "Descrição da atividade / CAE principal" 
                },
                company_status: { 
                  type: "string", 
                  description: "Estado da empresa (Ativa, Inativa, Encerrada, Dissolvida)" 
                },
                capital_social: { 
                  type: "string", 
                  description: "Capital Social" 
                },
                founding_date: { 
                  type: "string", 
                  description: "Data de constituição no formato DD/MM/AAAA" 
                }
              },
              required: ["company_name"]
            }
          }
        ],
        waitFor: 5000,
        onlyMainContent: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Firecrawl error:", response.status, errorText);
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos Firecrawl esgotados" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try fallback to Racius
      return await tryRaciusFallback(cleanNif, FIRECRAWL_API_KEY, corsHeaders);
    }

    const data = await response.json();
    console.log("Firecrawl response received");

    // Extract JSON data from response
    const jsonData = data.data?.json || data.json;
    const markdown = data.data?.markdown || data.markdown || "";
    
    if (jsonData && jsonData.company_name) {
      console.log("Found company via JSON extraction:", jsonData.company_name);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            company_name: jsonData.company_name || null,
            billing_address: jsonData.billing_address || null,
            billing_city: jsonData.billing_city || null,
            billing_postal_code: jsonData.billing_postal_code || null,
            billing_country: "Portugal",
            cae: jsonData.cae || null,
            cae_description: jsonData.cae_description || null,
            company_status: jsonData.company_status || null,
            capital_social: jsonData.capital_social || null,
            founding_date: jsonData.founding_date || null,
          },
          source: "einforma",
          message: "Dados encontrados com sucesso"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If JSON extraction failed, try parsing markdown
    if (markdown) {
      const parsedData = parseCompanyFromMarkdown(markdown, cleanNif);
      if (parsedData.company_name) {
        console.log("Found company via markdown parsing:", parsedData.company_name);
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: parsedData,
            source: "einforma",
            message: "Dados encontrados com sucesso"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Try fallback to Racius
    return await tryRaciusFallback(cleanNif, FIRECRAWL_API_KEY, corsHeaders);

  } catch (error) {
    console.error("Error in lookup-company-nif:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function tryRaciusFallback(nif: string, apiKey: string, corsHeaders: Record<string, string>): Promise<Response> {
  console.log(`Trying Racius fallback for NIF ${nif}...`);
  
  try {
    // Try direct company page on Racius
    const raciusUrl = `https://www.racius.com/nif/${nif}/`;
    
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: raciusUrl,
        formats: ["markdown"],
        waitFor: 5000,
        onlyMainContent: false,
      }),
    });

    if (!response.ok) {
      console.error("Racius fallback failed:", response.status);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Empresa não encontrada. Verifique se o NIF está correto.",
          data: null 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || "";

    if (!markdown || markdown.includes("não encontr") || markdown.includes("não existe") || markdown.length < 200) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Empresa não encontrada para este NIF",
          data: null 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedData = parseCompanyFromMarkdown(markdown, nif);
    
    if (parsedData.company_name) {
      console.log("Found company via Racius fallback:", parsedData.company_name);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: parsedData,
          source: "racius",
          message: "Dados encontrados com sucesso"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Não foi possível extrair dados da empresa",
        data: null 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Racius fallback error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Empresa não encontrada. Verifique se o NIF está correto.",
        data: null 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

function parseCompanyFromMarkdown(content: string, nif: string): CompanyData {
  const data: CompanyData = {
    company_name: null,
    billing_address: null,
    billing_city: null,
    billing_postal_code: null,
    billing_country: "Portugal",
    cae: null,
    cae_description: null,
    company_status: null,
    capital_social: null,
    founding_date: null,
  };

  try {
    // Clean content
    const cleanContent = content.replace(/\*\*/g, "").replace(/\*/g, "");
    const lines = cleanContent.split("\n").map(l => l.trim()).filter(l => l);

    // Extract company name - usually the first heading or after "Denominação"
    const namePatterns = [
      /^#\s*(.+?)(?:\s*[-–|]|$)/m,
      /Denominação[:\s]*([^\n]+)/i,
      /Razão Social[:\s]*([^\n]+)/i,
      /Nome[:\s]*([^\n]+)/i,
      /Empresa[:\s]*([^\n]+)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = cleanContent.match(pattern);
      if (match && match[1] && match[1].length > 3 && match[1].length < 200) {
        data.company_name = match[1].trim()
          .replace(/^[:\s]+/, "")
          .replace(/[:\s]+$/, "")
          .replace(/\s+/g, " ");
        break;
      }
    }

    // Extract address
    const addressPatterns = [
      /(?:Sede|Morada|Endereço)[:\s]*([^\n]+)/i,
      /Rua[^,\n]*/i,
      /Av\.[^,\n]*/i,
      /Avenida[^,\n]*/i,
    ];
    
    for (const pattern of addressPatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        const addr = (match[1] || match[0]).trim();
        if (addr.length > 5) {
          data.billing_address = addr;
          break;
        }
      }
    }

    // Extract postal code (Portuguese format: XXXX-XXX)
    const postalMatch = cleanContent.match(/(\d{4}[-\s]?\d{3})/);
    if (postalMatch) {
      data.billing_postal_code = postalMatch[1].replace(/\s/g, "-");
      
      // Try to extract city from same line
      const postalLine = cleanContent.substring(
        cleanContent.indexOf(postalMatch[0]),
        cleanContent.indexOf(postalMatch[0]) + 100
      );
      const cityMatch = postalLine.match(/\d{4}[-\s]?\d{3}\s+([A-Za-zÀ-ÿ\s]+)/);
      if (cityMatch && cityMatch[1]) {
        data.billing_city = cityMatch[1].trim().split(/[,\n]/)[0].trim();
      }
    }

    // Extract CAE
    const caeMatch = cleanContent.match(/(?:CAE|Actividade|Atividade)[^\d]*(\d{5})/i);
    if (caeMatch) {
      data.cae = caeMatch[1];
    }

    // Extract CAE description
    const caeDescPatterns = [
      /CAE[^\d]*\d{5}\s*[-–]\s*([^\n]+)/i,
      /Actividade Principal[:\s]*([^\n]+)/i,
      /Atividade Principal[:\s]*([^\n]+)/i,
      /Objecto Social[:\s]*([^\n]+)/i,
    ];
    
    for (const pattern of caeDescPatterns) {
      const match = cleanContent.match(pattern);
      if (match && match[1]) {
        data.cae_description = match[1].trim();
        break;
      }
    }

    // Extract company status
    const statusPatterns = [
      /Estado[:\s]*([^\n]+)/i,
      /Situação[:\s]*([^\n]+)/i,
      /Status[:\s]*([^\n]+)/i,
    ];
    
    for (const pattern of statusPatterns) {
      const match = cleanContent.match(pattern);
      if (match && match[1]) {
        const status = match[1].trim().toLowerCase();
        if (status.includes("activ") || status.includes("ativ")) {
          data.company_status = "Ativa";
        } else if (status.includes("dissolv") || status.includes("encerr") || status.includes("extint")) {
          data.company_status = "Encerrada";
        } else if (status.includes("insolvên") || status.includes("insolven")) {
          data.company_status = "Insolvente";
        } else if (status.includes("suspens")) {
          data.company_status = "Suspensa";
        } else {
          data.company_status = match[1].trim();
        }
        break;
      }
    }

    // Check for status in content without explicit label
    if (!data.company_status) {
      if (cleanContent.toLowerCase().includes("em atividade") || cleanContent.toLowerCase().includes("em actividade")) {
        data.company_status = "Ativa";
      } else if (cleanContent.toLowerCase().includes("dissolvida") || cleanContent.toLowerCase().includes("encerrada")) {
        data.company_status = "Encerrada";
      }
    }

    // Extract capital social
    const capitalMatch = cleanContent.match(/Capital[^\d]*([€\d\s.,]+(?:€|EUR)?)/i);
    if (capitalMatch && capitalMatch[1]) {
      data.capital_social = capitalMatch[1].trim();
    }

    // Extract founding date
    const datePatterns = [
      /Constituição[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /Data de Constituição[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /Fundação[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /Constituída em[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    ];
    
    for (const pattern of datePatterns) {
      const match = cleanContent.match(pattern);
      if (match && match[1]) {
        data.founding_date = match[1];
        break;
      }
    }

  } catch (e) {
    console.error("Error parsing company data:", e);
  }

  return data;
}
