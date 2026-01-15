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

    // Use Firecrawl to scrape Racius page for the NIF
    const raciusUrl = `https://www.racius.com/pesquisa/?q=${cleanNif}`;
    
    console.log(`Searching for NIF ${cleanNif} on Racius...`);

    // First, search for the company
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: raciusUrl,
        formats: ["markdown"],
        waitFor: 3000,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Firecrawl search error:", searchResponse.status, errorText);
      
      if (searchResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos Firecrawl insuficientes" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao pesquisar empresa. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    const searchContent = searchData.data?.markdown || "";

    // Try to find the company link in search results
    const companyLinkMatch = searchContent.match(/\[([^\]]+)\]\((https:\/\/www\.racius\.com\/[^)]+)\)/);
    
    if (!companyLinkMatch) {
      // Try alternative: direct company page
      const directUrl = `https://www.racius.com/nif/${cleanNif}/`;
      
      const directResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: directUrl,
          formats: ["markdown"],
          waitFor: 3000,
        }),
      });

      if (directResponse.ok) {
        const directData = await directResponse.json();
        const companyData = parseCompanyData(directData.data?.markdown || "", cleanNif);
        
        if (companyData.company_name) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: companyData,
              source: "racius",
              message: "Dados encontrados com sucesso"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Empresa não encontrada para este NIF",
          data: null 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Scrape the company detail page
    const companyUrl = companyLinkMatch[2];
    console.log(`Found company page: ${companyUrl}`);

    const detailResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: companyUrl,
        formats: ["markdown"],
        waitFor: 3000,
      }),
    });

    if (!detailResponse.ok) {
      console.error("Firecrawl detail error:", detailResponse.status);
      return new Response(
        JSON.stringify({ error: "Erro ao obter detalhes da empresa" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const detailData = await detailResponse.json();
    const companyContent = detailData.data?.markdown || "";
    
    const companyData = parseCompanyData(companyContent, cleanNif);

    if (!companyData.company_name) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Não foi possível extrair dados da empresa",
          data: null 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: companyData,
        source: "racius",
        message: "Dados encontrados com sucesso"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in lookup-company-nif:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseCompanyData(content: string, nif: string): CompanyData {
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
    // Extract company name - usually the main heading
    const nameMatch = content.match(/^#\s*(.+?)(?:\s*[-–|]|$)/m) || 
                      content.match(/Denominação[:\s]*([^\n]+)/i) ||
                      content.match(/Nome[:\s]*([^\n]+)/i);
    if (nameMatch) {
      data.company_name = nameMatch[1].trim().replace(/\*+/g, "");
    }

    // Extract address
    const addressMatch = content.match(/Sede[:\s]*([^\n]+)/i) || 
                         content.match(/Morada[:\s]*([^\n]+)/i) ||
                         content.match(/Endereço[:\s]*([^\n]+)/i);
    if (addressMatch) {
      data.billing_address = addressMatch[1].trim().replace(/\*+/g, "");
    }

    // Extract postal code
    const postalMatch = content.match(/(\d{4}[-\s]?\d{3})/);
    if (postalMatch) {
      data.billing_postal_code = postalMatch[1].replace(/\s/g, "-");
    }

    // Extract city from postal code line or address
    const cityMatch = content.match(/\d{4}[-\s]?\d{3}\s*([A-Za-zÀ-ÿ\s]+)/i);
    if (cityMatch) {
      data.billing_city = cityMatch[1].trim();
    }

    // Extract CAE
    const caeMatch = content.match(/CAE[:\s]*(\d{5})/i) ||
                     content.match(/Actividade[:\s]*(\d{5})/i);
    if (caeMatch) {
      data.cae = caeMatch[1];
    }

    // Extract CAE description
    const caeDescMatch = content.match(/CAE[:\s]*\d{5}\s*[-–]\s*([^\n]+)/i) ||
                         content.match(/Actividade Principal[:\s]*([^\n]+)/i);
    if (caeDescMatch) {
      data.cae_description = caeDescMatch[1].trim().replace(/\*+/g, "");
    }

    // Extract company status
    const statusMatch = content.match(/Estado[:\s]*([^\n]+)/i) ||
                        content.match(/Situação[:\s]*([^\n]+)/i);
    if (statusMatch) {
      const status = statusMatch[1].trim().toLowerCase();
      if (status.includes("activ") || status.includes("ativ")) {
        data.company_status = "Ativa";
      } else if (status.includes("dissolv") || status.includes("encerr")) {
        data.company_status = "Encerrada";
      } else if (status.includes("insolvên")) {
        data.company_status = "Insolvente";
      } else {
        data.company_status = statusMatch[1].trim().replace(/\*+/g, "");
      }
    }

    // Extract capital social
    const capitalMatch = content.match(/Capital[:\s]*([€\d\s,.]+)/i);
    if (capitalMatch) {
      data.capital_social = capitalMatch[1].trim();
    }

    // Extract founding date
    const dateMatch = content.match(/Constituição[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) ||
                      content.match(/Data de Constituição[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) ||
                      content.match(/Fundação[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
    if (dateMatch) {
      data.founding_date = dateMatch[1];
    }

  } catch (e) {
    console.error("Error parsing company data:", e);
  }

  return data;
}
