

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    const systemPrompt = `You are a company data enrichment assistant. Given a tax identification number (NIF/NIPC for Portugal), you must be EXTREMELY CAREFUL and CONSERVATIVE.

CRITICAL RULES:
1. You do NOT have access to official Portuguese business registries (Portal das Finanças, Racius, etc.)
2. NEVER guess or invent company data based on partial matches
3. If you cannot find VERIFIED, CONFIRMED information for THIS EXACT tax ID, return null for ALL fields
4. Do not confuse similar-sounding companies or return data for the wrong company
5. Only return data if you are 100% certain it belongs to the company with this exact tax ID
6. When in doubt, return null - it's better to have no data than wrong data
7. Set confidence to "low" unless you have absolute certainty

IMPORTANT: Portuguese NIF/NIPC is a 9-digit number. Each company has a unique NIF. Do NOT return data for a different company.`;

    const userPrompt = `Tax ID to research: ${tax_id} (Country: ${country})

IMPORTANT: Only return data if you are 100% CERTAIN this is the correct company for this EXACT tax ID: ${tax_id}

If you cannot confirm with certainty, return null for all fields and set confidence to "low".

Fields to find (only if verified):
- Official company name
- Address, city, postal code
- Contact email and phone
- Website
- Social media (LinkedIn, Facebook, Instagram, Twitter)
- Industry
- Description`;

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
