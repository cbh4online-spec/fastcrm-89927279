import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentResult {
  fullName?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  company?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  jobTitle?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  preferredChannel?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  country?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  language?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  companyWebsite?: string;
}

function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([^@]+)$/);
  if (!match) return null;
  const domain = match[1].toLowerCase();
  // Skip common free email providers
  const freeProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "icloud.com", "sapo.pt", "mail.com", "protonmail.com"];
  if (freeProviders.includes(domain)) return null;
  return domain;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function detectCountryFromPhone(phone: string): string | null {
  const normalized = normalizePhone(phone);
  if (normalized.startsWith("+351") || normalized.startsWith("351")) return "Portugal";
  if (normalized.startsWith("+55") || normalized.startsWith("55")) return "Brasil";
  if (normalized.startsWith("+34")) return "Espanha";
  if (normalized.startsWith("+33")) return "França";
  if (normalized.startsWith("+44")) return "Reino Unido";
  if (normalized.startsWith("+1")) return "EUA/Canadá";
  return null;
}

function detectLanguageFromCountry(country: string | null): string | null {
  if (!country) return null;
  const langMap: Record<string, string> = {
    "Portugal": "Português",
    "Brasil": "Português",
    "Espanha": "Espanhol",
    "França": "Francês",
    "Reino Unido": "Inglês",
    "EUA/Canadá": "Inglês",
  };
  return langMap[country] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, email, phone, workspaceId } = await req.json();

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: "workspaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: EnrichmentResult = {};
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Extract company from email domain
    let companyDomain: string | null = null;
    if (email) {
      companyDomain = extractDomainFromEmail(email);
      if (companyDomain) {
        // Check if we have a company with this domain in CRM
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("name, website")
          .eq("workspace_id", workspaceId)
          .or(`website.ilike.%${companyDomain}%,email.ilike.%@${companyDomain}%`)
          .limit(1)
          .single();

        if (existingCompany) {
          result.company = {
            value: existingCompany.name,
            confidence: "high",
            source: "CRM existente"
          };
          result.companyWebsite = existingCompany.website;
        } else {
          // Use domain as company name suggestion
          const companyName = companyDomain.split('.')[0];
          result.company = {
            value: companyName.charAt(0).toUpperCase() + companyName.slice(1),
            confidence: "low",
            source: "Domínio do email"
          };
          result.companyWebsite = `https://${companyDomain}`;
        }
      }
    }

    // 2. Detect country/language from phone
    if (phone) {
      const country = detectCountryFromPhone(phone);
      if (country) {
        result.country = {
          value: country,
          confidence: "high",
          source: "Código do país"
        };
        const language = detectLanguageFromCountry(country);
        if (language) {
          result.language = {
            value: language,
            confidence: "high",
            source: "País detectado"
          };
        }
      }

      // Suggest WhatsApp as preferred channel if phone provided
      result.preferredChannel = {
        value: "WhatsApp",
        confidence: "medium",
        source: "Telefone fornecido"
      };
    } else if (email) {
      result.preferredChannel = {
        value: "Email",
        confidence: "medium",
        source: "Email fornecido"
      };
    }

    // 3. Analyze conversation history for patterns
    if (email || phone) {
      const { data: conversations } = await supabase
        .from("conversations")
        .select(`
          id,
          channel,
          messages (id, direction)
        `)
        .eq("workspace_id", workspaceId)
        .limit(10);

      if (conversations && conversations.length > 0) {
        // Find most used channel
        const channelCounts: Record<string, number> = {};
        for (const conv of conversations) {
          const channel = conv.channel;
          channelCounts[channel] = (channelCounts[channel] || 0) + 1;
        }
        const topChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0];
        if (topChannel) {
          result.preferredChannel = {
            value: topChannel[0] === "email" ? "Email" : topChannel[0] === "whatsapp" ? "WhatsApp" : "Instagram",
            confidence: "high",
            source: "Histórico de conversas"
          };
        }
      }
    }

    // 4. Use AI to enrich if we have company website
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && result.companyWebsite) {
      try {
        // Try to scrape company website for more context
        const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
        let companyContext = "";

        if (FIRECRAWL_API_KEY) {
          try {
            const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              },
              body: JSON.stringify({
                url: result.companyWebsite,
                formats: ["markdown"],
                onlyMainContent: true,
                timeout: 15000,
              }),
            });

            if (scrapeResponse.ok) {
              const scrapeData = await scrapeResponse.json();
              if (scrapeData.success && scrapeData.data?.markdown) {
                companyContext = scrapeData.data.markdown.slice(0, 3000);
              }
            }
          } catch (e) {
            console.log("Scraping failed, continuing without company context:", e);
          }
        }

        // Use AI to suggest role based on name and company
        const prompt = `Given this contact information:
- Name: ${name || "Unknown"}
- Email: ${email || "Unknown"}
- Company: ${result.company?.value || "Unknown"}
${companyContext ? `\nCompany website content:\n${companyContext}` : ""}

Suggest the most likely job title/role for this person. Consider:
- Email patterns (e.g., ceo@, director@, marketing@)
- Common roles in similar companies
- Name patterns

Return ONLY a JSON object with this structure (no markdown):
{
  "jobTitle": "Suggested title or null",
  "jobTitleConfidence": "low" | "medium",
  "reasoning": "Brief explanation"
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a CRM assistant that helps enrich contact data. Be conservative - only suggest when you have reasonable confidence." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
              const parsed = JSON.parse(cleanContent);
              if (parsed.jobTitle) {
                result.jobTitle = {
                  value: parsed.jobTitle,
                  confidence: parsed.jobTitleConfidence || "low",
                  source: "Análise IA"
                };
              }
            } catch (e) {
              console.log("Failed to parse AI response:", e);
            }
          }
        }
      } catch (e) {
        console.error("AI enrichment failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Contact enrichment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
