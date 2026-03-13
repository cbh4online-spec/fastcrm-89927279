const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LookupResult {
  company_name: string | null;
  tax_id: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  region: string | null;
  county: string | null;
  parish: string | null;
  cae_codes: string[];
  cae_description: string | null;
  company_status: string | null;
  legal_nature: string | null;
  capital_social: string | null;
  founding_date: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  fax: string | null;
  racius_url: string | null;
}

// ─── nif.pt API attempt ───
async function tryNifPt(cleanNif: string): Promise<{ result: LookupResult | null; shouldFallback: boolean; error?: string }> {
  const apiKey = Deno.env.get('NIF_PT_API_KEY');
  if (!apiKey) {
    console.log('[NIF] NIF_PT_API_KEY not configured, skipping nif.pt');
    return { result: null, shouldFallback: true };
  }

  try {
    const apiUrl = `https://www.nif.pt/?json=1&q=${cleanNif}&key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.warn('[NIF] nif.pt API returned:', response.status);
      return { result: null, shouldFallback: true };
    }

    const data = await response.json();
    console.log('[NIF] nif.pt response result:', data.result);

    if (data.result === 'error') {
      const message = (data.message || '').toLowerCase();
      // Rate limit or no records - fallback to Firecrawl
      if (message.includes('limit') || message.includes('minute') || message.includes('no records') || message.includes('not found')) {
        console.log('[NIF] nif.pt rate limited or not found, falling back to Firecrawl');
        return { result: null, shouldFallback: true };
      }
      return { result: null, shouldFallback: true, error: data.message };
    }

    if (data.result !== 'success' || !data.records || Object.keys(data.records).length === 0) {
      return { result: null, shouldFallback: true };
    }

    const recordKey = Object.keys(data.records)[0];
    const record = data.records[recordKey];

    let caeCodes: string[] = [];
    if (record.cae) {
      caeCodes = Array.isArray(record.cae)
        ? record.cae.map((c: any) => String(c))
        : [String(record.cae)];
    } else if (record.cae_main?.code) {
      caeCodes = [record.cae_main.code];
    } else if (record.rapiea?.code) {
      caeCodes = [record.rapiea.code];
    }

    const result: LookupResult = {
      company_name: record.title || null,
      tax_id: String(record.nif) || cleanNif,
      address: record.place?.address || record.address || null,
      postal_code: formatPostalCode(record.place?.pc4 || record.pc4, record.place?.pc3 || record.pc3),
      city: record.place?.city || record.city || null,
      region: record.geo?.region || null,
      county: record.geo?.county || null,
      parish: record.geo?.parish || null,
      cae_codes: caeCodes,
      cae_description: record.cae_main?.description || record.rapiea?.description_short || record.activity || null,
      company_status: parseStatus(record.status),
      legal_nature: parseLegalNature(record.structure?.nature),
      capital_social: formatCapital(record.structure?.capital, record.structure?.capital_currency),
      founding_date: record.start_date || null,
      email: record.contacts?.email || null,
      phone: record.contacts?.phone || null,
      website: record.contacts?.website || null,
      fax: record.contacts?.fax || null,
      racius_url: record.racius || null,
    };

    return { result, shouldFallback: false };
  } catch (error) {
    console.warn('[NIF] nif.pt error:', error);
    return { result: null, shouldFallback: true };
  }
}

// ─── Firecrawl + Racius fallback ───
async function tryFirecrawlRacius(cleanNif: string): Promise<LookupResult | null> {
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlKey) {
    console.error('[NIF] FIRECRAWL_API_KEY not configured');
    return null;
  }

  const raciusUrl = `https://www.racius.com/empresas/?q=${cleanNif}`;
  console.log('[NIF] Firecrawl scraping Racius:', raciusUrl);

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: raciusUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[NIF] Firecrawl API error:', response.status, JSON.stringify(data));
      return null;
    }

    const markdown = data?.data?.markdown || data?.markdown || '';
    console.log('[NIF] Firecrawl markdown length:', markdown.length);

    if (!markdown || markdown.length < 50) {
      console.warn('[NIF] No meaningful content from Racius');
      return null;
    }

    // Parse the Racius markdown to extract company data
    return parseRaciusMarkdown(markdown, cleanNif);
  } catch (error) {
    console.error('[NIF] Firecrawl error:', error);
    return null;
  }
}

function parseRaciusMarkdown(markdown: string, nif: string): LookupResult | null {
  // Racius typically shows company info in a structured format
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
  
  let companyName: string | null = null;
  let address: string | null = null;
  let postalCode: string | null = null;
  let city: string | null = null;
  let phone: string | null = null;
  let email: string | null = null;
  let website: string | null = null;
  let caeDescription: string | null = null;
  let caeCodes: string[] = [];
  let capitalSocial: string | null = null;
  let legalNature: string | null = null;
  let companyStatus: string | null = null;
  let foundingDate: string | null = null;
  let region: string | null = null;
  let county: string | null = null;
  let parish: string | null = null;
  let raciusUrl: string | null = null;

  // Try to find company name from headings
  for (const line of lines) {
    // Company name is usually the first H1 or H2
    if (line.startsWith('# ') && !companyName) {
      companyName = line.replace(/^#+\s*/, '').trim();
      continue;
    }
    if (line.startsWith('## ') && !companyName) {
      companyName = line.replace(/^#+\s*/, '').trim();
      continue;
    }
  }

  // Search for patterns in the markdown content
  const fullText = markdown;
  
  // NIF confirmation
  const nifMatch = fullText.match(/NIF[:\s]*(\d{9})/i);
  
  // Company name fallback - look for bold text near NIF
  if (!companyName) {
    const nameMatch = fullText.match(/\*\*([^*]+)\*\*/);
    if (nameMatch) companyName = nameMatch[1].trim();
  }

  // Address patterns
  const addressMatch = fullText.match(/(?:Morada|Sede|Endereço)[:\s]*([^\n]+)/i);
  if (addressMatch) address = addressMatch[1].replace(/\*+/g, '').trim();

  // Postal code
  const pcMatch = fullText.match(/(\d{4}[-\s]?\d{3})/);
  if (pcMatch) postalCode = pcMatch[1].replace(/\s/, '-');

  // City - after postal code or in "Localidade" field
  const cityMatch = fullText.match(/(?:Localidade|Cidade|Concelho)[:\s]*([^\n|]+)/i);
  if (cityMatch) city = cityMatch[1].replace(/\*+/g, '').trim();

  // District/Region
  const regionMatch = fullText.match(/(?:Distrito|Região)[:\s]*([^\n|]+)/i);
  if (regionMatch) region = regionMatch[1].replace(/\*+/g, '').trim();

  // County
  const countyMatch = fullText.match(/(?:Concelho)[:\s]*([^\n|]+)/i);
  if (countyMatch) county = countyMatch[1].replace(/\*+/g, '').trim();

  // Parish
  const parishMatch = fullText.match(/(?:Freguesia)[:\s]*([^\n|]+)/i);
  if (parishMatch) parish = parishMatch[1].replace(/\*+/g, '').trim();

  // Phone
  const phoneMatch = fullText.match(/(?:Telefone|Tel)[:\s]*([+\d\s()-]+)/i);
  if (phoneMatch) phone = phoneMatch[1].trim();

  // Email
  const emailMatch = fullText.match(/(?:Email|E-mail)[:\s]*([^\s\n]+@[^\s\n]+)/i);
  if (emailMatch) email = emailMatch[1].trim();

  // Website
  const websiteMatch = fullText.match(/(?:Website|Site|Web)[:\s]*((?:https?:\/\/)?[^\s\n]+\.[a-z]{2,})/i);
  if (websiteMatch) website = websiteMatch[1].trim();

  // CAE
  const caeMatch = fullText.match(/(?:CAE|Atividade)[:\s]*(\d{5})\s*[-–]\s*([^\n]+)/i);
  if (caeMatch) {
    caeCodes = [caeMatch[1]];
    caeDescription = caeMatch[2].replace(/\*+/g, '').trim();
  }
  // Multiple CAE codes
  const caeMultiMatch = fullText.matchAll(/(\d{5})\s*[-–]\s*([^\n]+)/g);
  for (const match of caeMultiMatch) {
    if (!caeCodes.includes(match[1])) {
      caeCodes.push(match[1]);
      if (!caeDescription) caeDescription = match[2].replace(/\*+/g, '').trim();
    }
  }

  // Capital social
  const capitalMatch = fullText.match(/(?:Capital\s*Social)[:\s]*([^\n]+)/i);
  if (capitalMatch) capitalSocial = capitalMatch[1].replace(/\*+/g, '').trim();

  // Legal nature
  const natureMatch = fullText.match(/(?:Natureza\s*Jurídica|Forma\s*Jurídica)[:\s]*([^\n]+)/i);
  if (natureMatch) legalNature = natureMatch[1].replace(/\*+/g, '').trim();

  // Status
  const statusMatch = fullText.match(/(?:Estado|Situação|Estado\s*da\s*Empresa)[:\s]*([^\n]+)/i);
  if (statusMatch) companyStatus = parseStatus(statusMatch[1].replace(/\*+/g, '').trim());

  // Founding date
  const dateMatch = fullText.match(/(?:Data\s*(?:de\s*)?(?:Constituição|Início|Fundação))[:\s]*([^\n]+)/i);
  if (dateMatch) foundingDate = dateMatch[1].replace(/\*+/g, '').trim();

  // Racius URL - look for links to the company page
  const raciusLinkMatch = fullText.match(/(https?:\/\/(?:www\.)?racius\.com\/[^\s\n)]+)/i);
  if (raciusLinkMatch) raciusUrl = raciusLinkMatch[1];
  else raciusUrl = `https://www.racius.com/empresas/?q=${nif}`;

  // If we couldn't find anything meaningful, return null
  if (!companyName && !address && caeCodes.length === 0) {
    console.warn('[NIF] Could not parse any meaningful data from Racius');
    return null;
  }

  return {
    company_name: companyName,
    tax_id: nif,
    address,
    postal_code: postalCode,
    city,
    region,
    county,
    parish,
    cae_codes: caeCodes,
    cae_description: caeDescription,
    company_status: companyStatus,
    legal_nature: legalNature,
    capital_social: capitalSocial,
    founding_date: foundingDate,
    email,
    phone,
    website,
    fax: null,
    racius_url: raciusUrl,
  };
}

// ─── Main handler ───
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nif } = await req.json();

    if (!nif) {
      return new Response(
        JSON.stringify({ success: false, error: 'NIF é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanNif = nif.toString().replace(/\s/g, '');
    if (!/^\d{9}$/.test(cleanNif)) {
      return new Response(
        JSON.stringify({ success: false, error: 'NIF inválido. Deve ter 9 dígitos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[NIF] Looking up:', cleanNif);

    // Strategy 1: Try nif.pt first
    const nifPtResult = await tryNifPt(cleanNif);
    
    if (nifPtResult.result) {
      console.log('[NIF] Success via nif.pt');
      return new Response(
        JSON.stringify({ success: true, data: nifPtResult.result, source: 'nif.pt' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strategy 2: Fallback to Firecrawl + Racius
    if (nifPtResult.shouldFallback) {
      console.log('[NIF] Trying Firecrawl + Racius fallback...');
      const firecrawlResult = await tryFirecrawlRacius(cleanNif);
      
      if (firecrawlResult) {
        console.log('[NIF] Success via Firecrawl + Racius');
        return new Response(
          JSON.stringify({ success: true, data: firecrawlResult, source: 'racius' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Both failed
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Empresa não encontrada com este NIF. Verifique o número e tente novamente.' 
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[NIF] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao pesquisar empresa' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatPostalCode(pc4?: string, pc3?: string): string | null {
  if (!pc4) return null;
  return pc3 ? `${pc4}-${pc3}` : pc4;
}

function parseStatus(status?: string): string | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('activ') || s.includes('ativ') || s === 'active') return 'Ativa';
  if (s.includes('dissolv') || s.includes('encerr') || s.includes('extint')) return 'Encerrada';
  if (s.includes('insolvên') || s.includes('insolven')) return 'Insolvência';
  return status;
}

function parseLegalNature(nature?: string): string | null {
  if (!nature) return null;
  const map: Record<string, string> = {
    'UNI': 'Sociedade Unipessoal por Quotas',
    'LDA': 'Sociedade por Quotas',
    'SA': 'Sociedade Anónima',
    'ENI': 'Empresário em Nome Individual',
    'COOP': 'Cooperativa',
    'ACE': 'Agrupamento Complementar de Empresas',
    'AEIE': 'Agrupamento Europeu de Interesse Económico',
    'FUND': 'Fundação',
    'ASSOC': 'Associação',
  };
  return map[nature.toUpperCase()] || nature;
}

function formatCapital(capital?: string, currency?: string): string | null {
  if (!capital) return null;
  const num = parseFloat(capital);
  if (isNaN(num)) return capital;
  const formatted = num.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = currency === 'EUR' || !currency ? '€' : currency;
  return `${formatted} ${symbol}`;
}
