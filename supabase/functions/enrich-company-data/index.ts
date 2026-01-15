import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tax_id, country = "Portugal" } = await req.json();

    if (!tax_id) {
      return new Response(
        JSON.stringify({ error: "Tax ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a company data enrichment assistant. Given a tax identification number (NIF/NIPC for Portugal, or equivalent for other countries), research and provide company information.

IMPORTANT RULES:
1. Only return data you are confident about
2. If you cannot find reliable information, return null for those fields
3. For Portuguese companies (NIF/NIPC with 9 digits), search for information in Portuguese business registries
4. Return realistic, verifiable data only
5. Do not invent or fabricate data

You must call the extract_company_data function with the information you find.`;

    const userPrompt = `Find company information for tax ID: ${tax_id} in ${country}. 

Search for:
- Official company name
- Registered address (street, city, postal code)
- Contact email and phone
- Website URL
- Social media profiles (LinkedIn, Facebook, Instagram, Twitter)
- Industry/sector
- Brief company description

Return only verified information. Use null for any field you cannot confirm.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_company_data",
              description: "Extract and structure company data from research",
              parameters: {
                type: "object",
                properties: {
                  company_name: { 
                    type: "string", 
                    description: "Official registered company name",
                    nullable: true
                  },
                  billing_address: { 
                    type: "string", 
                    description: "Full street address",
                    nullable: true
                  },
                  billing_city: { 
                    type: "string", 
                    description: "City name",
                    nullable: true
                  },
                  billing_postal_code: { 
                    type: "string", 
                    description: "Postal/ZIP code",
                    nullable: true
                  },
                  billing_country: { 
                    type: "string", 
                    description: "Country name",
                    nullable: true
                  },
                  billing_email: { 
                    type: "string", 
                    description: "Contact or billing email",
                    nullable: true
                  },
                  phone: { 
                    type: "string", 
                    description: "Contact phone number",
                    nullable: true
                  },
                  website: { 
                    type: "string", 
                    description: "Company website URL",
                    nullable: true
                  },
                  linkedin_url: { 
                    type: "string", 
                    description: "LinkedIn company page URL",
                    nullable: true
                  },
                  facebook_url: { 
                    type: "string", 
                    description: "Facebook page URL",
                    nullable: true
                  },
                  instagram_url: { 
                    type: "string", 
                    description: "Instagram profile URL",
                    nullable: true
                  },
                  twitter_url: { 
                    type: "string", 
                    description: "Twitter/X profile URL",
                    nullable: true
                  },
                  industry: { 
                    type: "string", 
                    description: "Industry or sector",
                    nullable: true
                  },
                  description: { 
                    type: "string", 
                    description: "Brief company description",
                    nullable: true
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Confidence level in the data accuracy"
                  }
                },
                required: ["confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_company_data" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_company_data") {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair dados da empresa" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: companyData,
        message: companyData.confidence === "high" 
          ? "Dados encontrados com alta confiança" 
          : companyData.confidence === "medium"
          ? "Dados encontrados com confiança média - verifique antes de guardar"
          : "Dados encontrados com baixa confiança - recomenda-se verificação manual"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in enrich-company-data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
