import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentField {
  value: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

interface EnrichmentResult {
  fullName?: EnrichmentField;
  company?: EnrichmentField;
  jobTitle?: EnrichmentField;
  preferredChannel?: EnrichmentField;
  country?: EnrichmentField;
  language?: EnrichmentField;
  companyWebsite?: string;
  // Expanded fields
  industry?: EnrichmentField;
  numberOfEmployees?: EnrichmentField;
  annualRevenue?: EnrichmentField;
  about?: EnrichmentField;
  linkedinUrl?: EnrichmentField;
  facebookUrl?: EnrichmentField;
  instagramUrl?: EnrichmentField;
  twitterUrl?: EnrichmentField;
  address?: EnrichmentField;
  city?: EnrichmentField;
  postalCode?: EnrichmentField;
  region?: EnrichmentField;
  // NIF/fiscal
  taxId?: EnrichmentField;
  caeCodes?: { value: string[]; confidence: "high" | "medium" | "low"; source: string };
  caeDescription?: EnrichmentField;
  legalNature?: EnrichmentField;
  capitalSocial?: EnrichmentField;
  foundingDate?: EnrichmentField;
  // Contact info extracted from website
  contactEmail?: EnrichmentField;
  contactPhone?: EnrichmentField;
  // Instagram metrics
  instagramFollowers?: { value: number; confidence: "high" | "medium" | "low"; source: string };
  instagramBio?: EnrichmentField;
  // ICP
  icpFitScore?: { value: number; confidence: "high" | "medium" | "low"; source: string };
}

function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([^@]+)$/);
  if (!match) return null;
  const domain = match[1].toLowerCase();
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

function calculateIcpScore(result: EnrichmentResult): number {
  let score = 0;
  let maxScore = 0;

  // Company identified (+20)
  maxScore += 20;
  if (result.company?.value) {
    score += result.company.confidence === "high" ? 20 : result.company.confidence === "medium" ? 15 : 8;
  }

  // Has website (+10)
  maxScore += 10;
  if (result.companyWebsite) score += 10;

  // Has industry (+10)
  maxScore += 10;
  if (result.industry?.value) score += 10;

  // Has contact info (+10)
  maxScore += 10;
  if (result.preferredChannel?.value) score += 10;

  // Has location (+10)
  maxScore += 10;
  if (result.city?.value || result.address?.value || result.country?.value) score += 10;

  // Has job title (+10)
  maxScore += 10;
  if (result.jobTitle?.value) score += 10;

  // Has social presence (+10)
  maxScore += 10;
  if (result.linkedinUrl?.value || result.instagramUrl?.value || result.facebookUrl?.value) score += 10;

  // Has fiscal data (+10)
  maxScore += 10;
  if (result.taxId?.value) score += 10;

  // Has about/description (+5)
  maxScore += 5;
  if (result.about?.value) score += 5;

  // Has employee count (+5)
  maxScore += 5;
  if (result.numberOfEmployees?.value) score += 5;

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { name, email, phone, workspaceId, settings: enrichSettings } = await req.json();

    // AI Gate check
    const _gateWsId = typeof workspaceId !== 'undefined' ? workspaceId : (typeof workspace_id !== 'undefined' ? workspace_id : null);
    if (_gateWsId) {
      const gate = await aiGate(_gateWsId, 'medium', 'contact-enrich');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    // Configuration flags
    const googleEnabled = enrichSettings?.google_enabled ?? true;
    const webscrapingEnabled = enrichSettings?.webscraping_enabled ?? true;
    const googlePlacesEnabled = enrichSettings?.google_places_enabled ?? false;
    const nifLookupEnabled = enrichSettings?.nif_lookup_enabled ?? false;
    const instagramEnrichEnabled = enrichSettings?.instagram_enrich_enabled ?? false;
    const icpScoreEnabled = enrichSettings?.icp_score_enabled ?? false;

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
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("name, website")
          .eq("workspace_id", workspaceId)
          .or(`website.ilike.%${companyDomain}%,email.ilike.%@${companyDomain}%`)
          .limit(1)
          .single();

        if (existingCompany) {
          result.company = { value: existingCompany.name, confidence: "high", source: "CRM existente" };
          result.companyWebsite = existingCompany.website;
        } else {
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

    // 1b. Company-name fallback: search website via Firecrawl when no email/phone
    const companyNameInput = name;
    if (!result.companyWebsite && companyNameInput) {
      // Set company name from input
      if (!result.company) {
        result.company = { value: companyNameInput, confidence: "medium", source: "Nome do lead" };
      }

      // Try to find website via Firecrawl Search
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (FIRECRAWL_API_KEY && webscrapingEnabled) {
        try {
          console.log(`[ENRICHER] Searching website for company: "${companyNameInput}"`);
          const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            },
            body: JSON.stringify({
              query: `${companyNameInput} website oficial Portugal`,
              limit: 3,
              lang: "pt",
              country: "pt",
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const results = searchData.data || searchData.results || [];
            if (results.length > 0) {
              // Pick the first result URL as the company website
              const topResult = results[0];
              const foundUrl = topResult.url || topResult.sourceURL;
              if (foundUrl) {
                // Extract clean domain
                try {
                  const urlObj = new URL(foundUrl);
                  result.companyWebsite = `${urlObj.protocol}//${urlObj.hostname}`;
                  console.log(`[ENRICHER] Found website via search: ${result.companyWebsite}`);
                } catch {
                  result.companyWebsite = foundUrl;
                }
              }
            }
          } else {
            console.warn(`[ENRICHER] Firecrawl search returned ${searchResponse.status}`);
          }
        } catch (e) {
          console.warn("[ENRICHER] Firecrawl search failed:", e);
        }
      }

      // Also try CRM lookup by company name
      if (!result.companyWebsite) {
        const { data: existingByName } = await supabase
          .from("companies")
          .select("name, website")
          .eq("workspace_id", workspaceId)
          .ilike("name", `%${companyNameInput}%`)
          .limit(1)
          .maybeSingle();

        if (existingByName?.website) {
          result.companyWebsite = existingByName.website;
          result.company = { value: existingByName.name, confidence: "high", source: "CRM existente" };
          console.log(`[ENRICHER] Found website via CRM: ${result.companyWebsite}`);
        }
      }
    }

    // 2. Detect country/language from phone
    if (phone) {
      const country = detectCountryFromPhone(phone);
      if (country) {
        result.country = { value: country, confidence: "high", source: "Código do país" };
        const language = detectLanguageFromCountry(country);
        if (language) {
          result.language = { value: language, confidence: "high", source: "País detectado" };
        }
      }
      result.preferredChannel = { value: "WhatsApp", confidence: "medium", source: "Telefone fornecido" };
    } else if (email) {
      result.preferredChannel = { value: "Email", confidence: "medium", source: "Email fornecido" };
    }

    // 3. Analyze conversation history
    if (email || phone) {
      const { data: conversations } = await supabase
        .from("conversations")
        .select(`id, channel, messages (id, direction)`)
        .eq("workspace_id", workspaceId)
        .limit(10);

      if (conversations && conversations.length > 0) {
        const channelCounts: Record<string, number> = {};
        for (const conv of conversations) {
          channelCounts[conv.channel] = (channelCounts[conv.channel] || 0) + 1;
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

    // 4. AI enrichment with expanded extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && result.companyWebsite && googleEnabled) {
      try {
        let companyContext = "";
        const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

        if (FIRECRAWL_API_KEY && webscrapingEnabled) {
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
                companyContext = scrapeData.data.markdown.slice(0, 4000);
              }
            }
          } catch (e) {
            console.log("Scraping failed, continuing:", e);
          }
        }

        // Expanded AI prompt
        const prompt = `Given this contact information:
- Name: ${name || "Unknown"}
- Email: ${email || "Unknown"}
- Company: ${result.company?.value || "Unknown"}
- Website: ${result.companyWebsite || "Unknown"}
${companyContext ? `\nCompany website content (first 4000 chars):\n${companyContext}` : ""}

Extract ALL available information. Return ONLY a JSON object (no markdown):
{
  "jobTitle": "string or null",
  "jobTitleConfidence": "low" | "medium" | "high",
  "industry": "string or null (e.g. 'Software', 'Marketing', 'Construção', 'Restauração')",
  "industryConfidence": "low" | "medium" | "high",
  "numberOfEmployees": "string or null (e.g. '1-10', '11-50', '51-200', '201-500', '500+')",
  "employeesConfidence": "low" | "medium" | "high",
  "annualRevenue": "string or null (e.g. '< 100k€', '100k-500k€', '500k-2M€', '2M-10M€', '> 10M€')",
  "revenueConfidence": "low" | "medium" | "high",
  "about": "string or null (brief company description, max 200 chars)",
  "contactEmail": "string or null (main contact email found on website, e.g. info@, geral@, contacto@)",
  "contactPhone": "string or null (main phone number found on website, include country code if visible e.g. +351 xxx xxx xxx)",
  "linkedinUrl": "string or null (company LinkedIn URL if found on website)",
  "facebookUrl": "string or null",
  "instagramUrl": "string or null",
  "twitterUrl": "string or null"
}`;

        const _startTime = Date.now();
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a CRM data enrichment assistant. Extract factual data from the website content provided. Be conservative - only include data you can verify from the content. Return valid JSON only." },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json()

    // AI Usage Instrumentation
    try {
      const _usage = aiData?.usage;
      logAIUsage({
        workspace_id: workspaceId,
        feature: 'contact-enrich',
        model: aiData?.model || 'google/gemini-3-flash-preview',
        tokens_input: _usage?.prompt_tokens ?? 0,
        tokens_output: _usage?.completion_tokens ?? 0,
        request_type: 'completion',
        latency_ms: Date.now() - (_startTime ?? Date.now()),
      });
    } catch (_e) { /* instrumentation error - non-blocking */ };
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
              const parsed = JSON.parse(cleanContent);

              if (parsed.jobTitle) {
                result.jobTitle = { value: parsed.jobTitle, confidence: parsed.jobTitleConfidence || "low", source: "Análise IA" };
              }
              if (parsed.industry) {
                result.industry = { value: parsed.industry, confidence: parsed.industryConfidence || "low", source: "Análise IA (website)" };
              }
              if (parsed.numberOfEmployees) {
                result.numberOfEmployees = { value: parsed.numberOfEmployees, confidence: parsed.employeesConfidence || "low", source: "Análise IA (website)" };
              }
              if (parsed.annualRevenue) {
                result.annualRevenue = { value: parsed.annualRevenue, confidence: parsed.revenueConfidence || "low", source: "Análise IA (website)" };
              }
              if (parsed.about) {
                result.about = { value: parsed.about, confidence: "medium", source: "Website" };
              }
              if (parsed.linkedinUrl) {
                result.linkedinUrl = { value: parsed.linkedinUrl, confidence: "medium", source: "Website" };
              }
              if (parsed.facebookUrl) {
                result.facebookUrl = { value: parsed.facebookUrl, confidence: "medium", source: "Website" };
              }
              if (parsed.instagramUrl) {
                result.instagramUrl = { value: parsed.instagramUrl, confidence: "medium", source: "Website" };
              }
              if (parsed.twitterUrl) {
                result.twitterUrl = { value: parsed.twitterUrl, confidence: "medium", source: "Website" };
              }
              if (parsed.contactEmail) {
                result.contactEmail = { value: parsed.contactEmail, confidence: "medium", source: "Website" };
              }
              if (parsed.contactPhone) {
                result.contactPhone = { value: parsed.contactPhone, confidence: "medium", source: "Website" };
              }
            } catch (e) {
              console.log("Failed to parse AI response:", e);
            }
          }
        } else if (aiResponse.status === 402 || aiResponse.status === 429) {
          console.warn(`[ENRICHER] AI returned ${aiResponse.status}, skipping AI enrichment`);
        }
      } catch (e) {
        console.error("AI enrichment failed:", e);
      }
    }

    // 5. Google Places enrichment (parallel-safe)
    if (googlePlacesEnabled && result.company?.value) {
      try {
        const placesResponse = await fetch(`${supabaseUrl}/functions/v1/google-places-enrich`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
            "apikey": supabaseAnonKey,
          },
          body: JSON.stringify({
            companyName: result.company.value,
            city: result.country?.value === "Portugal" ? undefined : undefined,
          }),
        });

        if (placesResponse.ok) {
          const placesData = await placesResponse.json();
          if (placesData.success && placesData.data?.length > 0) {
            const place = placesData.data[0];
            if (place.formatted_address && !result.address) {
              result.address = { value: place.formatted_address, confidence: "high", source: "Google Places" };
            }
            if (place.city && !result.city) {
              result.city = { value: place.city, confidence: "high", source: "Google Places" };
            }
            if (place.postal_code) {
              result.postalCode = { value: place.postal_code, confidence: "high", source: "Google Places" };
            }
            if (place.region) {
              result.region = { value: place.region, confidence: "high", source: "Google Places" };
            }
            if (place.phone && !result.preferredChannel) {
              result.preferredChannel = { value: "Telefone", confidence: "medium", source: "Google Places" };
            }
          }
        }
      } catch (e) {
        console.warn("[ENRICHER] Google Places failed:", e);
      }
    }

    // 6. NIF Lookup (Portuguese companies only)
    if (nifLookupEnabled && (result.country?.value === "Portugal" || !result.country)) {
      try {
        const nifResponse = await fetch(`${supabaseUrl}/functions/v1/lookup-company-nif`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
            "apikey": supabaseAnonKey,
          },
          body: JSON.stringify({
            companyName: result.company?.value,
          }),
        });

        if (nifResponse.ok) {
          const nifData = await nifResponse.json();
          if (nifData.success && nifData.data) {
            const nif = nifData.data;
            if (nif.tax_id) {
              result.taxId = { value: nif.tax_id, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.cae_codes?.length) {
              result.caeCodes = { value: nif.cae_codes, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.cae_description) {
              result.caeDescription = { value: nif.cae_description, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.legal_nature) {
              result.legalNature = { value: nif.legal_nature, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.capital_social) {
              result.capitalSocial = { value: nif.capital_social, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.founding_date) {
              result.foundingDate = { value: nif.founding_date, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.company_name && result.company?.confidence !== "high") {
              result.company = { value: nif.company_name, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.address && !result.address) {
              result.address = { value: nif.address, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.city && !result.city) {
              result.city = { value: nif.city, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.postal_code && !result.postalCode) {
              result.postalCode = { value: nif.postal_code, confidence: "high", source: "Registo fiscal" };
            }
            if (nif.about && !result.about) {
              result.about = { value: nif.about, confidence: "high", source: "Registo fiscal" };
            }
          }
        }
      } catch (e) {
        console.warn("[ENRICHER] NIF lookup failed:", e);
      }
    }

    // 7. Instagram enrichment
    if (instagramEnrichEnabled && result.instagramUrl?.value) {
      try {
        const igResponse = await fetch(`${supabaseUrl}/functions/v1/enrich-instagram-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
            "apikey": supabaseAnonKey,
          },
          body: JSON.stringify({
            instagramUrl: result.instagramUrl.value,
          }),
        });

        if (igResponse.ok) {
          const igData = await igResponse.json();
          if (igData.success && igData.data) {
            if (igData.data.followers_count != null) {
              result.instagramFollowers = { value: igData.data.followers_count, confidence: "high", source: "Instagram" };
            }
            if (igData.data.bio) {
              result.instagramBio = { value: igData.data.bio, confidence: "high", source: "Instagram" };
            }
          }
        }
      } catch (e) {
        console.warn("[ENRICHER] Instagram enrich failed:", e);
      }
    }

    // 8. Calculate ICP Fit Score
    if (icpScoreEnabled) {
      const score = calculateIcpScore(result);
      result.icpFitScore = {
        value: score,
        confidence: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
        source: "Cálculo automático",
      };
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
