

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
  // Basic fields
  industry?: EnrichmentField;
  size?: EnrichmentField;
  phone?: EnrichmentField;
  email?: EnrichmentField;
  address?: EnrichmentField;
  description?: EnrichmentField;
  website?: EnrichmentField;
  socialLinks?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  // Rich context fields
  about_us?: EnrichmentField;
  services?: EnrichmentField;
  products?: EnrichmentField;
  clients?: EnrichmentField;
  team_info?: EnrichmentField;
  mission_values?: EnrichmentField;
  differentiators?: EnrichmentField;
  certifications?: EnrichmentField;
  target_market?: EnrichmentField;
  year_founded?: EnrichmentField;
}

function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1] : null;
}

function normalizeWebsite(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

// Enrich using only company name via AI
async function enrichFromNameOnly(companyName: string, LOVABLE_API_KEY: string): Promise<EnrichmentResult> {
  const aiPrompt = `Pesquisa informações públicas sobre a empresa "${companyName}" em Portugal.

Tenta encontrar:
- Setor de atividade
- Website oficial (se conheceres)
- Descrição breve da empresa
- Possíveis redes sociais
- O que a empresa faz (serviços/produtos)

IMPORTANTE: Só inclui informações que tenhas alta confiança que estão corretas. 
Se não tiveres certeza, não inventes dados.
Marca a confiança como "low" para informações que não tens a certeza.`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "És um assistente especializado em pesquisar informações sobre empresas portuguesas. Responde sempre usando a ferramenta fornecida. Sê conservador - só extrai informação que tenhas confiança razoável."
        },
        { role: "user", content: aiPrompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_company_info",
            description: "Extrai informações estruturadas sobre uma empresa",
            parameters: {
              type: "object",
              properties: {
                industry: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                website: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "URL do website oficial" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                description: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                services: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Lista de serviços principais separados por vírgula" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                linkedin: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                }
              },
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_company_info" } }
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error("AI enrichment from name failed:", errorText);
    throw new Error("Falha na pesquisa por IA");
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  
  const result: EnrichmentResult = {};
  
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      
      if (parsed.industry?.value) {
        result.industry = { ...parsed.industry, source: "AI knowledge" };
      }
      if (parsed.website?.value) {
        result.website = { ...parsed.website, source: "AI knowledge" };
      }
      if (parsed.description?.value) {
        result.description = { ...parsed.description, source: "AI knowledge" };
      }
      if (parsed.services?.value) {
        result.services = { ...parsed.services, source: "AI knowledge" };
      }
      if (parsed.linkedin?.value) {
        result.socialLinks = { linkedin: parsed.linkedin.value };
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }
  }

  return result;
}

// Helper to extract social links from HTML content or links
function extractSocialFromContent(content: string): Record<string, string> {
  const social: Record<string, string> = {};
  
  // Patterns to find social media URLs
  const patterns = [
    { key: "linkedin", regex: /https?:\/\/(www\.)?linkedin\.com\/[^\s"'<>)]+/gi },
    { key: "instagram", regex: /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>)]+/gi },
    { key: "facebook", regex: /https?:\/\/(www\.)?facebook\.com\/[^\s"'<>)]+/gi },
    { key: "twitter", regex: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s"'<>)]+/gi },
  ];
  
  for (const { key, regex } of patterns) {
    const matches = content.match(regex);
    if (matches && matches.length > 0) {
      // Get the first valid match
      social[key] = matches[0].replace(/[,.:;)]+$/, ''); // Clean trailing punctuation
    }
  }
  
  return social;
}

// Helper to extract email and phone from content
function extractContactInfo(content: string): { email?: string; phone?: string } {
  const result: { email?: string; phone?: string } = {};
  
  // Email pattern
  const emailMatch = content.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
  if (emailMatch) {
    result.email = emailMatch[1];
  }
  
  // Portuguese phone patterns (various formats)
  const phonePatterns = [
    /\+351\s?[0-9]{9}/g,                    // +351 912345678
    /\+351\s?[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}/g,  // +351 912 345 678
    /(?:00351|351)?[29][0-9]{8}/g,          // 912345678 or 212345678
    /(?:\(?\+?351\)?[\s.-]?)?(?:2[0-9]|9[1-9])\s?[0-9]{3}\s?[0-9]{4}/g, // Various formats
  ];
  
  for (const pattern of phonePatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      result.phone = matches[0].replace(/\s/g, '');
      break;
    }
  }
  
  return result;
}

// Search for social media profiles via web search
async function searchSocialMedia(
  companyName: string,
  FIRECRAWL_API_KEY: string
): Promise<Record<string, string>> {
  const social: Record<string, string> = {};
  
  try {
    console.log("Searching social media for:", companyName);
    
    // Search for LinkedIn
    const linkedinSearch = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${companyName} site:linkedin.com/company`,
        limit: 3,
        lang: "pt",
        country: "PT",
      }),
    });
    
    const linkedinData = await linkedinSearch.json();
    if (linkedinData.success && linkedinData.data?.length > 0) {
      const linkedinUrl = linkedinData.data[0]?.url;
      if (linkedinUrl && linkedinUrl.includes("linkedin.com/company")) {
        social.linkedin = linkedinUrl;
        console.log("Found LinkedIn via search:", linkedinUrl);
      }
    }
    
    // Search for Facebook
    const facebookSearch = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${companyName} site:facebook.com`,
        limit: 3,
        lang: "pt",
        country: "PT",
      }),
    });
    
    const facebookData = await facebookSearch.json();
    if (facebookData.success && facebookData.data?.length > 0) {
      const facebookUrl = facebookData.data[0]?.url;
      if (facebookUrl && facebookUrl.includes("facebook.com") && !facebookUrl.includes("/login")) {
        social.facebook = facebookUrl;
        console.log("Found Facebook via search:", facebookUrl);
      }
    }
    
    // Search for Instagram
    const instagramSearch = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${companyName} site:instagram.com`,
        limit: 3,
        lang: "pt",
        country: "PT",
      }),
    });
    
    const instagramData = await instagramSearch.json();
    if (instagramData.success && instagramData.data?.length > 0) {
      const instagramUrl = instagramData.data[0]?.url;
      if (instagramUrl && instagramUrl.includes("instagram.com") && !instagramUrl.includes("/accounts/")) {
        social.instagram = instagramUrl;
        console.log("Found Instagram via search:", instagramUrl);
      }
    }
  } catch (e) {
    console.error("Social media search error:", e);
  }
  
  return social;
}

// Find contact page URL from links by analyzing text and patterns
function findContactPageUrl(pageLinks: string[], pageHtml: string): string | null {
  // Patterns for contact page URLs
  const urlPatterns = [
    /\/contact/i, /\/contacto/i, /\/contactos/i, /\/contato/i,
    /\/about/i, /\/sobre/i, /\/quem-somos/i,
    /\?.*contact/i, /\?.*pageid=\d+/i
  ];
  
  // First, check direct URL patterns
  for (const link of pageLinks) {
    for (const pattern of urlPatterns) {
      if (pattern.test(link)) {
        return link;
      }
    }
  }
  
  // Try to find contact links by analyzing the HTML for link text
  const linkTextPatterns = [
    /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*contact[^<]*)<\/a>/gi,
    /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*contacto[^<]*)<\/a>/gi,
    /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*contacte[^<]*)<\/a>/gi,
    /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*fale[^<]*)<\/a>/gi,
    /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*sobre[^<]*)<\/a>/gi,
  ];
  
  for (const pattern of linkTextPatterns) {
    const matches = [...pageHtml.matchAll(pattern)];
    for (const match of matches) {
      if (match[1] && !match[1].startsWith('#') && !match[1].startsWith('javascript')) {
        console.log("Found contact link via text analysis:", match[1]);
        return match[1];
      }
    }
  }
  
  return null;
}

// Enrich from website scraping with deep context extraction
async function enrichFromWebsite(
  targetUrl: string, 
  companyName: string,
  FIRECRAWL_API_KEY: string,
  LOVABLE_API_KEY: string | undefined
): Promise<EnrichmentResult> {
  const normalizedUrl = normalizeWebsite(targetUrl);
  console.log("Enriching company from:", normalizedUrl);

  // Scrape the main page
  const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: normalizedUrl,
      formats: ["markdown", "links", "html"],
      onlyMainContent: false,
      waitFor: 3000,
    }),
  });

  const scrapeData = await scrapeResponse.json();

  if (!scrapeResponse.ok || !scrapeData.success) {
    console.error("Firecrawl error:", scrapeData);
    throw new Error("Não foi possível aceder ao website");
  }

  let pageContent = scrapeData.data?.markdown || "";
  const pageHtml = scrapeData.data?.html || "";
  const pageLinks = scrapeData.data?.links || [];
  const metadata = scrapeData.data?.metadata || {};

  // Find contact page using improved detection
  const contactPageUrl = findContactPageUrl(pageLinks, pageHtml);
  
  if (contactPageUrl) {
    // Scrape the found contact page
    try {
      let fullContactUrl = contactPageUrl;
      if (!contactPageUrl.startsWith('http')) {
        const baseUrl = new URL(normalizedUrl);
        fullContactUrl = contactPageUrl.startsWith('/') 
          ? `${baseUrl.origin}${contactPageUrl}`
          : `${baseUrl.origin}/${contactPageUrl}`;
      }
      
      console.log("Attempting to scrape contact page:", fullContactUrl);
      
      const contactResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: fullContactUrl,
          formats: ["markdown", "html"],
          onlyMainContent: false,
          waitFor: 2000,
        }),
      });
      
      const contactData = await contactResponse.json();
      if (contactData.success && contactData.data?.markdown) {
        console.log("Successfully scraped contact page:", fullContactUrl);
        pageContent += "\n\n--- CONTACT PAGE ---\n" + contactData.data.markdown;
      }
    } catch (e) {
      console.error("Failed to scrape contact page:", e);
    }
  } else {
    // Fallback: Try common paths
    const baseUrl = new URL(normalizedUrl);
    const commonPaths = ['/contactos', '/contacts', '/contact', '/contacto', '/sobre', '/about'];
    
    for (const path of commonPaths) {
      try {
        const testUrl = `${baseUrl.origin}${path}`;
        const testResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: testUrl,
            formats: ["markdown", "html"],
            onlyMainContent: false,
            waitFor: 2000,
          }),
        });
        
        const testData = await testResponse.json();
        if (testData.success && testData.data?.markdown) {
          console.log("Found contact page via common path:", testUrl);
          pageContent += "\n\n--- CONTACT PAGE ---\n" + testData.data.markdown;
          break;
        }
      } catch (e) {
        // Ignore errors for contact page attempts
      }
    }
  }

  // Extract social links from page links AND HTML content
  const socialLinks: EnrichmentResult["socialLinks"] = {};
  
  // From page links
  for (const link of pageLinks) {
    if (link.includes("linkedin.com") && !socialLinks.linkedin) socialLinks.linkedin = link;
    if (link.includes("instagram.com") && !socialLinks.instagram) socialLinks.instagram = link;
    if (link.includes("facebook.com") && !socialLinks.facebook) socialLinks.facebook = link;
    if ((link.includes("twitter.com") || link.includes("x.com")) && !socialLinks.twitter) socialLinks.twitter = link;
  }
  
  // Also search in HTML content for social links
  const htmlSocial = extractSocialFromContent(pageHtml);
  if (!socialLinks.linkedin && htmlSocial.linkedin) socialLinks.linkedin = htmlSocial.linkedin;
  if (!socialLinks.instagram && htmlSocial.instagram) socialLinks.instagram = htmlSocial.instagram;
  if (!socialLinks.facebook && htmlSocial.facebook) socialLinks.facebook = htmlSocial.facebook;
  if (!socialLinks.twitter && htmlSocial.twitter) socialLinks.twitter = htmlSocial.twitter;
  
  // If no social links found, search the web for them
  const hasSocialLinks = Object.keys(socialLinks).length > 0;
  if (!hasSocialLinks && companyName) {
    console.log("No social links found on website, searching the web...");
    const webSocial = await searchSocialMedia(companyName, FIRECRAWL_API_KEY);
    if (webSocial.linkedin) socialLinks.linkedin = webSocial.linkedin;
    if (webSocial.facebook) socialLinks.facebook = webSocial.facebook;
    if (webSocial.instagram) socialLinks.instagram = webSocial.instagram;
    if (webSocial.twitter) socialLinks.twitter = webSocial.twitter;
  }
  
  // Extract contact info from content
  const contactInfo = extractContactInfo(pageContent + " " + pageHtml);
  console.log("Extracted contact info:", contactInfo);
  console.log("Extracted social links:", socialLinks);

  // Use AI to extract structured information
  if (!LOVABLE_API_KEY) {
    return {
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
      description: metadata.description ? {
        value: metadata.description,
        confidence: "medium" as const,
        source: "meta description"
      } : undefined
    };
  }

  // AI extraction with expanded fields for deep context
  const aiPrompt = `Analisa o seguinte conteúdo de um website empresarial e extrai TODAS as informações relevantes para um CRM comercial.

Nome da empresa: ${companyName || "Desconhecido"}
URL: ${normalizedUrl}

Conteúdo do website:
${pageContent.slice(0, 15000)}

INSTRUÇÃO IMPORTANTE: Extrai o máximo de informação possível para cada campo. Não resumas demasiado - queremos contexto rico para análise futura.

Campos a extrair (só inclui se estiverem claramente presentes):

DADOS BÁSICOS:
- industry: setor de atividade principal
- size: dimensão da empresa se mencionada
- phone: número de telefone principal
- email: email de contacto geral
- address: morada física completa

CONTEXTO EMPRESARIAL (extrair texto completo quando disponível):
- about_us: descrição completa da empresa, "Quem Somos", história (até 500 palavras)
- services: lista COMPLETA de serviços ou soluções oferecidos (separados por " | ")
- products: lista de produtos ou ofertas (separados por " | ")
- clients: nomes de clientes ou setores que servem (separados por " | ")
- team_info: informação sobre equipa, fundadores, liderança
- mission_values: missão, visão e valores da empresa
- differentiators: o que diferencia a empresa da concorrência
- certifications: certificações, prémios, acreditações
- target_market: mercado-alvo, tipo de clientes
- year_founded: ano de fundação

Para cada campo indica a confiança (high/medium/low) baseado em quão claramente a informação está presente.`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "És um assistente especializado em extrair informações empresariais de websites para um CRM. O objetivo é capturar CONTEXTO RICO sobre a empresa para análise comercial futura. Extrai o máximo de informação relevante possível. Responde sempre usando a ferramenta fornecida."
        },
        { role: "user", content: aiPrompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_company_info",
            description: "Extrai informações estruturadas e contexto rico sobre uma empresa",
            parameters: {
              type: "object",
              properties: {
                // Basic fields
                industry: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                size: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                phone: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                email: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                address: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                // Rich context fields
                about_us: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Descrição completa da empresa (até 500 palavras)" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                services: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Lista de serviços separados por ' | '" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                products: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Lista de produtos separados por ' | '" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                clients: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Lista de clientes ou setores separados por ' | '" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                team_info: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Informação sobre equipa/liderança" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                mission_values: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Missão, visão e valores" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                differentiators: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Diferenciais competitivos" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                certifications: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Certificações e prémios" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                target_market: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Mercado-alvo" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                year_founded: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "Ano de fundação" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                }
              },
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_company_info" } }
    }),
  });

  if (!aiResponse.ok) {
    console.error("AI extraction failed:", await aiResponse.text());
    return {
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
      description: metadata.description ? {
        value: metadata.description,
        confidence: "medium" as const,
        source: "meta description"
      } : undefined
    };
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  
  let extractedData: Partial<EnrichmentResult> = {};
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      
      // Basic fields
      if (parsed.industry?.value) {
        extractedData.industry = { ...parsed.industry, source: "website content" };
      }
      if (parsed.size?.value) {
        extractedData.size = { ...parsed.size, source: "website content" };
      }
      if (parsed.phone?.value) {
        extractedData.phone = { ...parsed.phone, source: "website content" };
      }
      if (parsed.email?.value) {
        extractedData.email = { ...parsed.email, source: "website content" };
      }
      if (parsed.address?.value) {
        extractedData.address = { ...parsed.address, source: "website content" };
      }
      
      // Rich context fields
      if (parsed.about_us?.value) {
        extractedData.about_us = { ...parsed.about_us, source: "website content" };
      }
      if (parsed.services?.value) {
        extractedData.services = { ...parsed.services, source: "website content" };
      }
      if (parsed.products?.value) {
        extractedData.products = { ...parsed.products, source: "website content" };
      }
      if (parsed.clients?.value) {
        extractedData.clients = { ...parsed.clients, source: "website content" };
      }
      if (parsed.team_info?.value) {
        extractedData.team_info = { ...parsed.team_info, source: "website content" };
      }
      if (parsed.mission_values?.value) {
        extractedData.mission_values = { ...parsed.mission_values, source: "website content" };
      }
      if (parsed.differentiators?.value) {
        extractedData.differentiators = { ...parsed.differentiators, source: "website content" };
      }
      if (parsed.certifications?.value) {
        extractedData.certifications = { ...parsed.certifications, source: "website content" };
      }
      if (parsed.target_market?.value) {
        extractedData.target_market = { ...parsed.target_market, source: "website content" };
      }
      if (parsed.year_founded?.value) {
        extractedData.year_founded = { ...parsed.year_founded, source: "website content" };
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }
  }

  // Fallback: If AI didn't extract phone/email but we found them via regex, add them
  if (!extractedData.phone && contactInfo.phone) {
    extractedData.phone = {
      value: contactInfo.phone,
      confidence: "medium" as const,
      source: "extracted from page"
    };
  }
  if (!extractedData.email && contactInfo.email) {
    extractedData.email = {
      value: contactInfo.email,
      confidence: "medium" as const,
      source: "extracted from page"
    };
  }

  console.log("Final enrichment data keys:", Object.keys(extractedData));
  console.log("Social links found:", socialLinks);

  return {
    ...extractedData,
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { website, email, companyName } = await req.json();

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Determine enrichment strategy
    let targetUrl = website;
    if (!targetUrl && email) {
      const domain = extractDomainFromEmail(email);
      if (domain) {
        targetUrl = `https://${domain}`;
      }
    }

    // Strategy 1: If we have a website/email, scrape it
    if (targetUrl && FIRECRAWL_API_KEY) {
      try {
        const result = await enrichFromWebsite(targetUrl, companyName, FIRECRAWL_API_KEY, LOVABLE_API_KEY);
        console.log("Enrichment from website complete:", Object.keys(result));
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (scrapeError) {
        console.error("Website scraping failed, falling back to AI:", scrapeError);
        // Fall through to AI-only enrichment
      }
    }

    // Strategy 2: If we only have company name, use AI knowledge
    if (companyName && LOVABLE_API_KEY) {
      console.log("Enriching from company name only:", companyName);
      try {
        const result = await enrichFromNameOnly(companyName, LOVABLE_API_KEY);
        console.log("Enrichment from AI complete:", Object.keys(result));
        return new Response(
          JSON.stringify({ success: true, data: result, source: "ai_knowledge" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (aiError) {
        console.error("AI enrichment failed:", aiError);
        return new Response(
          JSON.stringify({ success: false, error: "Não foi possível obter informações sobre esta empresa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // No valid enrichment source
    if (!companyName) {
      return new Response(
        JSON.stringify({ success: false, error: "É necessário pelo menos o nome da empresa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Serviço de enriquecimento não está disponível" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Enrichment error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro ao enriquecer dados"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
