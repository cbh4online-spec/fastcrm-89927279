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
  // New fields from Racius
  about: string | null;
  activity_description: string | null;
  company_age: number | null;
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
      about: null,
      activity_description: record.activity || null,
      company_age: null,
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

  // Step 1: Search for the company page on Racius using Firecrawl search
  console.log('[NIF] Step 1: Searching Racius for NIF:', cleanNif);
  let companyPageUrl: string | null = null;

  try {
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `site:racius.com ${cleanNif}`,
        limit: 5,
      }),
    });

    const searchData = await searchResponse.json();
    
    if (searchResponse.ok && searchData?.success && searchData?.data?.length > 0) {
      // Find the actual company page (not /empresas/ or /nif/)
      for (const result of searchData.data) {
        const url = result.url || '';
        // Company pages on Racius look like: racius.com/company-slug/
        if (url.includes('racius.com/') && 
            !url.includes('/empresas/') && 
            !url.includes('/nif/') && 
            !url.includes('/relatorios/') &&
            !url.includes('/termos') &&
            !url.includes('/politica')) {
          companyPageUrl = url;
          console.log('[NIF] Found company page:', companyPageUrl);
          break;
        }
      }
    }
    
    if (!companyPageUrl) {
      console.log('[NIF] Search results:', JSON.stringify(searchData?.data?.map((r: any) => r.url)));
    }
  } catch (error) {
    console.warn('[NIF] Firecrawl search error:', error);
  }

  // Fallback: try direct search URL if search didn't find a company page
  if (!companyPageUrl) {
    companyPageUrl = `https://www.racius.com/empresas/?q=${cleanNif}`;
    console.log('[NIF] Using fallback search URL:', companyPageUrl);
  }

  // Step 2: Scrape the company page
  console.log('[NIF] Step 2: Scraping company page:', companyPageUrl);
  try {
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: companyPageUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('[NIF] Firecrawl scrape error:', scrapeResponse.status, JSON.stringify(scrapeData));
      return null;
    }

    const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
    console.log('[NIF] Scraped markdown length:', markdown.length);

    if (!markdown || markdown.length < 50) {
      console.warn('[NIF] No meaningful content from Racius');
      return null;
    }

    return parseRaciusMarkdown(markdown, cleanNif, companyPageUrl);
  } catch (error) {
    console.error('[NIF] Firecrawl scrape error:', error);
    return null;
  }
}

function parseRaciusMarkdown(markdown: string, nif: string, sourceUrl: string): LookupResult | null {
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = markdown;

  // ── Company Name (first H1) ──
  let companyName: string | null = null;
  for (const line of lines) {
    if (line.startsWith('# ') && !companyName) {
      const name = line.replace(/^#+\s*/, '').trim();
      // Skip generic page titles
      if (name.toLowerCase() !== 'empresas' && name.length > 2) {
        companyName = name;
      }
      break;
    }
  }
  // Fallback: bold text
  if (!companyName) {
    const nameMatch = fullText.match(/\*\*([^*]{3,})\*\*/);
    if (nameMatch) companyName = nameMatch[1].trim();
  }

  // ── Address ──
  // Racius format: "Rua ..., Nº XX, Localidade XXXX-XXX Concelho"
  let address: string | null = null;
  let postalCode: string | null = null;
  let city: string | null = null;
  let region: string | null = null;

  // Look for "Morada" section
  const moradaIdx = fullText.indexOf('Morada');
  if (moradaIdx !== -1) {
    // Get text after "Morada" up to the next section
    const afterMorada = fullText.substring(moradaIdx + 6, moradaIdx + 500);
    const moradaLines = afterMorada.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('ico-') && l !== 'Morada');
    
    // First non-empty line is the full address with postal code
    for (const ml of moradaLines) {
      if (ml.length > 5 && !ml.startsWith('#')) {
        // Extract postal code from the address line
        const pcMatch = ml.match(/(\d{4}[-\s]?\d{3})/);
        if (pcMatch) {
          postalCode = pcMatch[1].replace(/\s/, '-');
          // Address is everything before the postal code
          const addrPart = ml.substring(0, ml.indexOf(pcMatch[0])).trim();
          if (addrPart) address = addrPart;
          // City is after the postal code
          const afterPc = ml.substring(ml.indexOf(pcMatch[0]) + pcMatch[0].length).trim();
          if (afterPc) city = afterPc;
        } else if (!address) {
          address = ml;
        }
        break;
      }
    }

    // Next distinct lines after address are usually Concelho and Distrito
    const locationLines = moradaLines.filter(l => 
      l.length > 1 && l.length < 50 && 
      l !== address && l !== postalCode && l !== city &&
      !l.includes('ico-') && !l.startsWith('#')
    );
    
    if (locationLines.length >= 2) {
      // Typically: Concelho then Distrito
      if (!city) city = locationLines[0];
      region = locationLines[1] || null;
    } else if (locationLines.length === 1 && !city) {
      city = locationLines[0];
    }
  }

  // ── Forma Jurídica (Legal Nature) ──
  let legalNature: string | null = null;
  const formaMatch = fullText.match(/Forma\s*Jur[ií]dica[\s\S]*?\n\s*\n\s*([^\n]+)/i);
  if (formaMatch) {
    const val = formaMatch[1].replace(/\*+/g, '').trim();
    if (val && !val.startsWith('ico-') && val.length > 2) legalNature = val;
  }

  // ── Capital Social ──
  let capitalSocial: string | null = null;
  const capitalMatch = fullText.match(/Capital\s*Social[\s\S]*?\n\s*\n\s*([^\n]+)/i);
  if (capitalMatch) {
    const val = capitalMatch[1].replace(/\*+/g, '').trim();
    if (val && val.includes('€')) capitalSocial = val;
  }
  // Fallback
  if (!capitalSocial) {
    const capFallback = fullText.match(/€\s*[\d.,]+/);
    if (capFallback) capitalSocial = capFallback[0].trim();
  }

  // ── Atividade (Activity Description) ──
  let activityDescription: string | null = null;
  const atividadeIdx = fullText.indexOf('Atividade');
  if (atividadeIdx !== -1) {
    // Avoid matching "Estado de Atividade"
    const beforeAtividade = fullText.substring(Math.max(0, atividadeIdx - 15), atividadeIdx);
    if (!beforeAtividade.includes('Estado')) {
      const afterAtividade = fullText.substring(atividadeIdx + 9, atividadeIdx + 1000);
      const actLines = afterAtividade.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('ico-') && l !== 'Atividade');
      for (const al of actLines) {
        if (al.length > 20 && !al.startsWith('#') && !al.startsWith('-')) {
          activityDescription = al;
          break;
        }
      }
    }
  }

  // ── Acerca da Empresa (About) ──
  let about: string | null = null;
  let foundingDate: string | null = null;
  let companyAge: number | null = null;

  const acercaMatch = fullText.match(/Acerca\s*da\s*Empresa[\s\S]*?\n\s*\n\s*([\s\S]+?)(?=\n\s*-\s*ico-|\n\s*#{2,}|\n\s*CAE)/i);
  if (acercaMatch) {
    const aboutText = acercaMatch[1].replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (aboutText.length > 10) about = aboutText;
  }
  // Fallback: look for the typical pattern
  if (!about) {
    const aboutFallback = fullText.match(/A\s+empresa\s+.+?tem\s+\d+\s+anos[\s\S]*?(?:similares|relacionados|n\.?\s*e\.)\./i);
    if (aboutFallback) about = aboutFallback[0].replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Extract founding date from About text
  if (about) {
    const dateInAbout = about.match(/constitu[ií]da\s+em\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (dateInAbout) foundingDate = dateInAbout[1];

    const ageInAbout = about.match(/tem\s+(\d+)\s+anos/i);
    if (ageInAbout) companyAge = parseInt(ageInAbout[1]);
  }

  // ── CAE codes ──
  const caeCodes: string[] = [];
  let caeDescription: string | null = null;
  const caeRegex = /(\d{5})\s*[-–]\s*([^\n\]]+)/g;
  let caeMatch;
  while ((caeMatch = caeRegex.exec(fullText)) !== null) {
    const code = caeMatch[1];
    if (!caeCodes.includes(code)) {
      caeCodes.push(code);
      if (!caeDescription) caeDescription = caeMatch[2].replace(/\*+/g, '').replace(/\].*$/, '').trim();
    }
  }

  // ── Phone ──
  let phone: string | null = null;
  const phoneMatch = fullText.match(/(?:Telefone|Tel)[:\s]*([+\d\s()-]+)/i);
  if (phoneMatch) phone = phoneMatch[1].trim();

  // ── Email ──
  let email: string | null = null;
  const emailMatch = fullText.match(/(?:Email|E-mail)[:\s]*([^\s\n]+@[^\s\n]+)/i);
  if (emailMatch) email = emailMatch[1].trim();

  // ── Website ──
  let website: string | null = null;
  const websiteMatch = fullText.match(/(?:Website|Site|Web)[:\s]*((?:https?:\/\/)?[^\s\n]+\.[a-z]{2,})/i);
  if (websiteMatch) website = websiteMatch[1].trim();

  // ── Status ──
  let companyStatus: string | null = null;
  const statusMatch = fullText.match(/(?:Estado\s*(?:de\s*)?Atividade|Estado\s*da\s*Empresa|Situação)[:\s]*([^\n]+)/i);
  if (statusMatch) companyStatus = parseStatus(statusMatch[1].replace(/\*+/g, '').trim());

  // ── Racius URL ──
  let raciusUrl: string | null = null;
  const raciusLinkMatch = fullText.match(/(https?:\/\/(?:www\.)?racius\.com\/[a-z0-9-]+\/)/i);
  if (raciusLinkMatch) {
    raciusUrl = raciusLinkMatch[1];
  } else if (sourceUrl && sourceUrl.includes('racius.com') && !sourceUrl.includes('/empresas/')) {
    raciusUrl = sourceUrl;
  } else {
    raciusUrl = `https://www.racius.com/empresas/?q=${nif}`;
  }

  // If we couldn't find anything meaningful, return null
  if (!companyName && !address && caeCodes.length === 0 && !about) {
    console.warn('[NIF] Could not parse any meaningful data from Racius');
    return null;
  }

  console.log('[NIF] Parsed Racius data:', {
    companyName, address, postalCode, city, region,
    legalNature, capitalSocial, caeCodes, about: about?.substring(0, 60),
    activityDescription: activityDescription?.substring(0, 60),
    foundingDate, companyAge,
  });

  return {
    company_name: companyName,
    tax_id: nif,
    address,
    postal_code: postalCode,
    city,
    region,
    county: city, // Racius shows Concelho in the same position as city
    parish: null,
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
    about,
    activity_description: activityDescription,
    company_age: companyAge,
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
