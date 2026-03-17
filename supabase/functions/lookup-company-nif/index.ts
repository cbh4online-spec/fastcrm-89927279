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
  about: string | null;
  activity_description: string | null;
  company_age: number | null;
}

type SourceStatus = 'success' | 'no_data' | 'transient_error';

interface SourceResult {
  status: SourceStatus;
  data: LookupResult | null;
}

interface ViesSourceResult {
  status: SourceStatus;
  data: { company_name: string | null; address: string | null; valid: boolean } | null;
}

// ─── Retry helper for transient errors ───
async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 500): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const msg = lastError.message || '';
      const isTransient = msg.includes('timed out') || msg.includes('timeout') || msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('abort');
      if (!isTransient || i === retries) throw lastError;
      console.log(`[NIF] Retry ${i + 1}/${retries} after: ${msg}`);
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

// ─── nif.pt API attempt (with timeout) ───
async function tryNifPt(cleanNif: string): Promise<SourceResult> {
  const apiKey = Deno.env.get('NIF_PT_API_KEY');
  if (!apiKey) {
    console.log('[NIF] NIF_PT_API_KEY not configured, skipping nif.pt');
    return { status: 'no_data', data: null };
  }

  try {
    const result = await withRetry(async () => {
      const apiUrl = `https://www.nif.pt/?json=1&q=${cleanNif}&key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`nif.pt server error: ${response.status}`);
        }
        console.warn('[NIF] nif.pt API returned:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[NIF] nif.pt response result:', data.result);

      if (data.result === 'error' || data.result !== 'success' || !data.records || Object.keys(data.records).length === 0) {
        return null;
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

      return {
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
      } as LookupResult;
    }, 1, 300);

    if (result) {
      return { status: 'success', data: result };
    }
    return { status: 'no_data', data: null };
  } catch (error) {
    const msg = (error as Error).message || '';
    console.warn('[NIF] nif.pt error:', msg);
    const isTransient = msg.includes('timed out') || msg.includes('timeout') || msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('abort');
    return { status: isTransient ? 'transient_error' : 'no_data', data: null };
  }
}

// ─── Firecrawl scrape with retry ───
async function firecrawlScrape(firecrawlKey: string, url: string, timeoutMs: number): Promise<{ ok: boolean; markdown: string; transient: boolean }> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 1500,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const status = response.status;
    // Consume body to avoid leaks
    try { await response.text(); } catch {}
    if (status >= 500 || status === 429) {
      return { ok: false, markdown: '', transient: true };
    }
    return { ok: false, markdown: '', transient: false };
  }

  const scrapeData = await response.json();
  const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
  return { ok: true, markdown, transient: false };
}

// ─── Firecrawl + Racius (with retry and fallback) ───
async function tryFirecrawlRacius(cleanNif: string): Promise<SourceResult> {
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlKey) {
    console.log('[NIF] FIRECRAWL_API_KEY not configured');
    return { status: 'no_data', data: null };
  }

  console.log('[NIF] Searching Racius for NIF:', cleanNif);
  let companyPageUrl: string | null = null;
  let searchTransientError = false;

  try {
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `site:racius.com ${cleanNif}`,
        limit: 3,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const searchData = await searchResponse.json();
    
    if (searchResponse.ok && searchData?.success && searchData?.data?.length > 0) {
      for (const result of searchData.data) {
        const url = result.url || '';
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
    } else if (!searchResponse.ok && searchResponse.status >= 500) {
      searchTransientError = true;
    }
  } catch (error) {
    console.warn('[NIF] Firecrawl search error:', (error as Error).message);
    searchTransientError = true;
  }

  // Strategy 1: Scrape the found company page
  if (companyPageUrl) {
    console.log('[NIF] Scraping company page:', companyPageUrl);
    try {
      const scrapeResult = await withRetry(async () => {
        const r = await firecrawlScrape(firecrawlKey, companyPageUrl!, 12000);
        if (!r.ok && r.transient) throw new Error('Firecrawl scrape transient error');
        return r;
      }, 1, 400);

      if (scrapeResult.ok && scrapeResult.markdown.length >= 50) {
        const parsed = parseRaciusMarkdown(scrapeResult.markdown, cleanNif, companyPageUrl);
        if (parsed) return { status: 'success', data: parsed };
      }
    } catch (error) {
      console.warn('[NIF] Scrape company page failed:', (error as Error).message);
    }
  }

  // Strategy 2: Fallback - scrape the search results page on Racius directly
  const fallbackUrl = `https://www.racius.com/empresas/?q=${cleanNif}`;
  console.log('[NIF] Fallback scraping:', fallbackUrl);
  try {
    const scrapeResult = await withRetry(async () => {
      const r = await firecrawlScrape(firecrawlKey, fallbackUrl, 12000);
      if (!r.ok && r.transient) throw new Error('Firecrawl fallback scrape transient error');
      return r;
    }, 1, 400);

    if (scrapeResult.ok && scrapeResult.markdown.length >= 50) {
      const parsed = parseRaciusMarkdown(scrapeResult.markdown, cleanNif, fallbackUrl);
      if (parsed) return { status: 'success', data: parsed };
      // Got content but couldn't parse meaningful data
      return { status: 'no_data', data: null };
    }

    if (!scrapeResult.ok && scrapeResult.transient) {
      return { status: 'transient_error', data: null };
    }
  } catch (error) {
    console.error('[NIF] Firecrawl fallback scrape error:', (error as Error).message);
    return { status: 'transient_error', data: null };
  }

  // If search had transient error and scraping also failed, mark as transient
  if (searchTransientError) {
    return { status: 'transient_error', data: null };
  }

  return { status: 'no_data', data: null };
}

// Known section headers in Racius markdown — used to stop parsing location lines
const SECTION_HEADERS = [
  'forma jur', 'capital social', 'atividade', 'acerca', 'cae',
  'contacto', 'estado', 'objeto', 'nif', 'certidão', 'relatório',
];

function isSectionHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return SECTION_HEADERS.some(h => lower.includes(h)) || /^#{1,4}\s/.test(line);
}

function parseRaciusMarkdown(markdown: string, nif: string, sourceUrl: string): LookupResult | null {
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = markdown;

  // ── Company Name (first H1) ──
  let companyName: string | null = null;
  for (const line of lines) {
    if (line.startsWith('# ') && !companyName) {
      const name = line.replace(/^#+\s*/, '').trim();
      if (name.toLowerCase() !== 'empresas' && name.length > 2) {
        companyName = name;
      }
      break;
    }
  }
  if (!companyName) {
    const nameMatch = fullText.match(/\*\*([^*]{3,})\*\*/);
    if (nameMatch) companyName = nameMatch[1].trim();
  }

  // ── Address + Location ──
  let address: string | null = null;
  let postalCode: string | null = null;
  let city: string | null = null;
  let region: string | null = null;
  let county: string | null = null;

  const moradaIdx = fullText.indexOf('Morada');
  if (moradaIdx !== -1) {
    const afterMorada = fullText.substring(moradaIdx + 6, moradaIdx + 500);
    const moradaLines = afterMorada.split('\n').map(l => l.trim()).filter(l => 
      l && !l.startsWith('ico-') && !l.includes('ico-') && l !== 'Morada' && !l.startsWith('![') && !l.startsWith('- ico')
    );
    
    for (const ml of moradaLines) {
      if (ml.length > 5 && !ml.startsWith('#') && !isSectionHeader(ml)) {
        const pcMatch = ml.match(/(\d{4}[-\s]?\d{3})/);
        if (pcMatch) {
          postalCode = pcMatch[1].replace(/\s/, '-');
          const addrPart = ml.substring(0, ml.indexOf(pcMatch[0])).trim();
          if (addrPart) address = addrPart;
          const afterPc = ml.substring(ml.indexOf(pcMatch[0]) + pcMatch[0].length).trim();
          if (afterPc) city = afterPc;
        } else if (!address) {
          address = ml;
        }
        break;
      }
    }

    const locationLines: string[] = [];
    let foundAddress = false;
    for (const ml of moradaLines) {
      if (ml.includes('ico-') || ml.startsWith('-') || ml.startsWith('!')) continue;
      if (ml.length > 5 && !ml.startsWith('#') && !isSectionHeader(ml)) {
        if (!foundAddress) { foundAddress = true; continue; }
        if (ml.length >= 2 && ml.length < 40 && !/[€\d]{5}/.test(ml) && !isSectionHeader(ml) && !ml.includes('ico-')) {
          locationLines.push(ml);
        }
        if (locationLines.length >= 2 || isSectionHeader(ml)) break;
      }
      if (foundAddress && isSectionHeader(ml)) break;
    }
    
    if (locationLines.length >= 2) {
      county = locationLines[0];
      region = locationLines[1];
      if (!city) city = county;
    } else if (locationLines.length === 1) {
      county = locationLines[0];
      if (!city) city = county;
    }
  }

  // ── Forma Jurídica (Legal Nature) ──
  let legalNature: string | null = null;
  const formaMatch = fullText.match(/Forma\s*Jur[ií]dica[\s\S]*?\n\s*\n\s*([^\n]+)/i);
  if (formaMatch) {
    const val = formaMatch[1].replace(/\*+/g, '').trim();
    if (val && !val.startsWith('ico-') && val.length > 2 && !isSectionHeader(val)) legalNature = val;
  }

  // ── Capital Social ──
  let capitalSocial: string | null = null;
  const capitalMatch = fullText.match(/Capital\s*Social[\s\S]*?\n\s*\n\s*([^\n]+)/i);
  if (capitalMatch) {
    const val = capitalMatch[1].replace(/\*+/g, '').trim();
    if (val && val.includes('€')) capitalSocial = val;
  }
  if (!capitalSocial) {
    const capFallback = fullText.match(/€\s*[\d.,]+/);
    if (capFallback) capitalSocial = capFallback[0].trim();
  }

  // ── Atividade ──
  let activityDescription: string | null = null;
  const atividadeIdx = fullText.indexOf('Atividade');
  if (atividadeIdx !== -1) {
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

  // ── Acerca da Empresa ──
  let about: string | null = null;
  let foundingDate: string | null = null;
  let companyAge: number | null = null;

  const acercaMatch = fullText.match(/Acerca\s*da\s*Empresa[\s\S]*?\n\s*\n\s*([\s\S]+?)(?=\n\s*-\s*ico-|\n\s*#{2,}|\n\s*CAE)/i);
  if (acercaMatch) {
    const aboutText = acercaMatch[1].replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (aboutText.length > 10) about = aboutText;
  }
  if (!about) {
    const aboutFallback = fullText.match(/A\s+empresa\s+.+?tem\s+\d+\s+anos[\s\S]*?(?:similares|relacionados|n\.?\s*e\.)\./i);
    if (aboutFallback) about = aboutFallback[0].replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  }

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

  // ── Contacts ──
  let phone: string | null = null;
  const phoneMatch = fullText.match(/(?:Telefone|Tel)[:\s]*([+\d\s()-]+)/i);
  if (phoneMatch) phone = phoneMatch[1].trim();

  let email: string | null = null;
  const emailMatch = fullText.match(/(?:Email|E-mail)[:\s]*([^\s\n]+@[^\s\n]+)/i);
  if (emailMatch) email = emailMatch[1].trim();

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

  if (!companyName && !address && caeCodes.length === 0 && !about) {
    console.warn('[NIF] Could not parse any meaningful data from Racius');
    return null;
  }

  console.log('[NIF] Parsed Racius:', { companyName, city, county, region, caeCodes: caeCodes.length });

  return {
    company_name: companyName,
    tax_id: nif,
    address,
    postal_code: postalCode,
    city,
    region,
    county: county || city,
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

// ─── EU VIES ───
async function tryVIES(cleanNif: string): Promise<ViesSourceResult> {
  const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>PT</urn:countryCode>
      <urn:vatNumber>${cleanNif}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const result = await withRetry(async () => {
      const response = await fetch(VIES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
        body: soapBody,
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`VIES server error: ${response.status}`);
        }
        console.warn('[NIF] VIES returned status:', response.status);
        return null;
      }

      const xml = await response.text();
      const validMatch = xml.match(/<valid>(true|false)<\/valid>/i);
      const nameMatch = xml.match(/<name>([^<]*)<\/name>/i);
      const addressMatch = xml.match(/<address>([^<]*)<\/address>/i);

      const valid = validMatch?.[1]?.toLowerCase() === 'true';
      const name = nameMatch?.[1]?.trim() || null;
      const addr = addressMatch?.[1]?.trim() || null;

      const cleanName = name && name !== '---' && name.length > 1 ? name : null;
      const cleanAddr = addr && addr !== '---' && addr.length > 1 ? addr : null;

      console.log('[NIF] VIES:', { valid, name: cleanName?.substring(0, 40) });
      return { company_name: cleanName, address: cleanAddr, valid };
    }, 1, 300);

    if (result) {
      return { status: 'success', data: result };
    }
    return { status: 'no_data', data: null };
  } catch (error) {
    const msg = (error as Error).message || '';
    console.warn('[NIF] VIES error:', msg);
    return { status: 'transient_error', data: null };
  }
}

// ─── Merge: fill null fields in primary with secondary ───
function mergeResults(primary: LookupResult, secondary: Partial<LookupResult>): LookupResult {
  const merged = { ...primary };
  for (const key of Object.keys(secondary) as (keyof LookupResult)[]) {
    if (key === 'cae_codes') {
      const pCodes = primary.cae_codes || [];
      const sCodes = (secondary.cae_codes as string[]) || [];
      merged.cae_codes = [...new Set([...pCodes, ...sCodes])];
    } else if (merged[key] === null || merged[key] === undefined) {
      (merged as any)[key] = secondary[key];
    }
  }
  return merged;
}

function viesAsLookup(vies: { company_name: string | null; address: string | null; valid: boolean }, nif: string): Partial<LookupResult> {
  const result: Partial<LookupResult> = {
    company_name: vies.company_name,
    tax_id: nif,
    company_status: vies.valid ? 'Ativa' : null,
  };

  if (vies.address) {
    const pcMatch = vies.address.match(/(\d{4}[-\s]?\d{3})/);
    if (pcMatch) {
      result.postal_code = pcMatch[1].replace(/\s/, '-');
      result.address = vies.address.substring(0, vies.address.indexOf(pcMatch[0])).trim() || null;
      result.city = vies.address.substring(vies.address.indexOf(pcMatch[0]) + pcMatch[0].length).trim() || null;
    } else {
      result.address = vies.address;
    }
  }

  return result;
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
    const startTime = Date.now();

    // 🚀 Run ALL strategies in parallel for maximum speed
    const [nifPtSrc, raciusSrc, viesSrc] = await Promise.all([
      tryNifPt(cleanNif),
      tryFirecrawlRacius(cleanNif),
      tryVIES(cleanNif),
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`[NIF] All strategies completed in ${elapsed}ms — nif.pt:${nifPtSrc.status} racius:${raciusSrc.status} vies:${viesSrc.status}`);

    // Pick the best primary result (nif.pt > Racius > VIES-only)
    let bestResult: LookupResult | null = null;
    let source = 'unknown';

    if (nifPtSrc.status === 'success' && nifPtSrc.data) {
      bestResult = nifPtSrc.data;
      source = 'nif.pt';
    } else if (raciusSrc.status === 'success' && raciusSrc.data) {
      bestResult = raciusSrc.data;
      source = 'racius';
    }

    // Merge secondary sources into the best result
    if (bestResult) {
      if (source === 'nif.pt' && raciusSrc.data) {
        bestResult = mergeResults(bestResult, raciusSrc.data);
      }
      if (viesSrc.data) {
        bestResult = mergeResults(bestResult, viesAsLookup(viesSrc.data, cleanNif));
      }

      console.log(`[NIF] Success via ${source} (+merge) in ${elapsed}ms`);
      return new Response(
        JSON.stringify({ success: true, data: bestResult, source, vies_valid: viesSrc.data?.valid ?? null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Last resort: VIES alone
    if (viesSrc.data && (viesSrc.data.valid || viesSrc.data.company_name)) {
      const viesLookup = viesAsLookup(viesSrc.data, cleanNif);
      const fallback: LookupResult = {
        company_name: viesLookup.company_name || null,
        tax_id: cleanNif,
        address: viesLookup.address || null,
        postal_code: viesLookup.postal_code || null,
        city: viesLookup.city || null,
        region: null, county: null, parish: null,
        cae_codes: [], cae_description: null,
        company_status: viesSrc.data.valid ? 'Ativa' : null,
        legal_nature: null, capital_social: null, founding_date: null,
        email: null, phone: null, website: null, fax: null,
        racius_url: `https://www.racius.com/empresas/?q=${cleanNif}`,
        about: null, activity_description: null, company_age: null,
      };

      console.log(`[NIF] Success via VIES-only in ${elapsed}ms`);
      return new Response(
        JSON.stringify({ success: true, data: fallback, source: 'vies', vies_valid: viesSrc.data.valid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if ALL sources had transient errors — this is NOT "not found", it's a service issue
    const allStatuses = [nifPtSrc.status, raciusSrc.status, viesSrc.status];
    const hasAnyNoData = allStatuses.includes('no_data');
    const allTransientOrNoKey = allStatuses.every(s => s === 'transient_error' || s === 'no_data') && !hasAnyNoData;

    if (allTransientOrNoKey || allStatuses.every(s => s === 'transient_error')) {
      console.warn(`[NIF] All sources had transient errors for ${cleanNif}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Serviço temporariamente indisponível. Tente novamente em alguns segundos.',
          retryable: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // At least one source confirmed no_data — genuinely not found
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Empresa não encontrada com este NIF. Verifique o número e tente novamente.',
        retryable: false,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[NIF] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao pesquisar empresa',
        retryable: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
