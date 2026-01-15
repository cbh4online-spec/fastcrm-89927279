const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LookupResult {
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

    // Validate NIF format (9 digits)
    const cleanNif = nif.toString().replace(/\s/g, '');
    if (!/^\d{9}$/.test(cleanNif)) {
      return new Response(
        JSON.stringify({ success: false, error: 'NIF inválido. Deve ter 9 dígitos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Serviço de pesquisa não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking up NIF:', cleanNif);

    // Step 1: Search Racius for the NIF to find the company page URL
    const searchUrl = `https://www.racius.com/pesquisa/?q=${cleanNif}`;
    console.log('Searching:', searchUrl);

    const searchResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['markdown', 'links'],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('Firecrawl search error:', errorData);
      
      if (searchResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos de pesquisa esgotados' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao pesquisar empresa' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    console.log('Search response received');

    // Find the company page URL from the search results
    const links = searchData.data?.links || searchData.links || [];
    const markdown = searchData.data?.markdown || searchData.markdown || '';
    
    console.log('Found links:', links.length);
    console.log('Markdown preview:', markdown.substring(0, 500));

    // Look for company page URL - it should be like /company-name/ but NOT /pesquisa/
    let companyPageUrl: string | null = null;
    
    for (const link of links) {
      if (typeof link === 'string' && 
          link.includes('racius.com/') && 
          !link.includes('/pesquisa') &&
          !link.includes('/observatorio') &&
          !link.includes('/sobre') &&
          !link.includes('/contactos') &&
          !link.includes('/login') &&
          !link.includes('/registo') &&
          !link.includes('/faq') &&
          !link.includes('/termos') &&
          !link.includes('/privacidade') &&
          !link.includes('javascript:') &&
          !link.endsWith('racius.com/') &&
          !link.endsWith('racius.com')) {
        // Check if it looks like a company page (has a slug after the domain)
        const urlPath = link.replace('https://www.racius.com/', '').replace('http://www.racius.com/', '');
        // Company pages have slugs with hyphens and end with /
        if (urlPath && urlPath.length > 3 && !urlPath.startsWith('?')) {
          companyPageUrl = link;
          console.log('Found company page URL:', companyPageUrl);
          break;
        }
      }
    }

    if (!companyPageUrl) {
      console.log('No company page found in search results');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Empresa não encontrada com este NIF' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Scrape the actual company page
    console.log('Scraping company page:', companyPageUrl);

    const companyResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: companyPageUrl,
        formats: ['markdown'],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    if (!companyResponse.ok) {
      const errorData = await companyResponse.json();
      console.error('Firecrawl company page error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao obter dados da empresa' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyData = await companyResponse.json();
    const companyMarkdown = companyData.data?.markdown || companyData.markdown || '';
    
    console.log('Company markdown length:', companyMarkdown.length);
    console.log('Company markdown preview:', companyMarkdown.substring(0, 1500));

    // Parse the company data from markdown
    const result = parseCompanyData(companyMarkdown, cleanNif);

    if (!result.company_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair os dados da empresa' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed company data:', result);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-company-nif:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao pesquisar empresa' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseCompanyData(markdown: string, nif: string): LookupResult {
  const result: LookupResult = {
    company_name: null,
    billing_address: null,
    billing_city: null,
    billing_postal_code: null,
    billing_country: 'Portugal',
    cae: null,
    cae_description: null,
    company_status: null,
    capital_social: null,
    founding_date: null,
  };

  // Clean markdown
  const cleanContent = markdown.replace(/\*\*/g, '').replace(/\*/g, '');
  const lines = cleanContent.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log('Parsing markdown with', lines.length, 'lines');

  // Extract company name - usually the first heading
  for (const line of lines) {
    const headingMatch = line.match(/^#+\s+(.+)/);
    if (headingMatch && !result.company_name) {
      const name = headingMatch[1].trim();
      // Skip if it's a section header or too short
      if (!name.toLowerCase().includes('informação') && 
          !name.toLowerCase().includes('dados') &&
          !name.toLowerCase().includes('pesquisa') &&
          !name.toLowerCase().includes('racius') &&
          !name.toLowerCase().includes('empresa') &&
          name.length > 5) {
        result.company_name = name
          .replace(/\s*[-–|].*$/, '') // Remove anything after dash
          .replace(/\s*,\s*$/, '')
          .trim();
        console.log('Found company name:', result.company_name);
        break;
      }
    }
  }

  // If no heading found, try other patterns
  if (!result.company_name) {
    const namePatterns = [
      /Denominação[:\s]*([^\n|]+)/i,
      /Razão Social[:\s]*([^\n|]+)/i,
      /Nome[:\s]*([^\n|]+)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = cleanContent.match(pattern);
      if (match && match[1] && match[1].length > 3) {
        result.company_name = match[1].trim();
        console.log('Found company name via pattern:', result.company_name);
        break;
      }
    }
  }

  // Extract NIF to verify
  const nifMatch = cleanContent.match(/(?:NIF|NIPC|Contribuinte)[:\s]*(\d{9})/i);
  if (nifMatch) {
    console.log('Found NIF in page:', nifMatch[1]);
  }

  // Extract address - look for "Morada" or "Sede"
  const addressPatterns = [
    /(?:Morada|Sede)[:\s]*([^\n|]+)/i,
    /(?:Endereço)[:\s]*([^\n|]+)/i,
  ];

  for (const pattern of addressPatterns) {
    const match = cleanContent.match(pattern);
    if (match && match[1]) {
      const addr = match[1].trim();
      if (addr.length > 5 && !addr.toLowerCase().includes('não disponível')) {
        result.billing_address = addr;
        console.log('Found address:', result.billing_address);
        break;
      }
    }
  }

  // Extract postal code (Portuguese format: XXXX-XXX)
  const postalMatch = cleanContent.match(/(\d{4}[-\s]?\d{3})/);
  if (postalMatch) {
    result.billing_postal_code = postalMatch[1].replace(/\s/g, '-');
    console.log('Found postal code:', result.billing_postal_code);
    
    // Try to extract city from same context
    const postalIdx = cleanContent.indexOf(postalMatch[0]);
    const contextAfter = cleanContent.substring(postalIdx, postalIdx + 100);
    const cityMatch = contextAfter.match(/\d{4}[-\s]?\d{3}\s+([A-Za-zÀ-ÿ\s]+)/);
    if (cityMatch && cityMatch[1]) {
      result.billing_city = cityMatch[1].trim().split(/[,\n|]/)[0].trim();
      console.log('Found city:', result.billing_city);
    }
  }

  // Extract CAE - look for 5 digit code
  const caePatterns = [
    /CAE(?:\s+Principal)?[:\s]*(\d{5})\s*[-–]?\s*([^\n|]+)?/i,
    /Actividade[:\s]*(\d{5})\s*[-–]?\s*([^\n|]+)?/i,
    /Atividade[:\s]*(\d{5})\s*[-–]?\s*([^\n|]+)?/i,
  ];

  for (const pattern of caePatterns) {
    const match = cleanContent.match(pattern);
    if (match) {
      result.cae = match[1];
      console.log('Found CAE:', result.cae);
      if (match[2]) {
        result.cae_description = match[2].trim();
        console.log('Found CAE description:', result.cae_description);
      }
      break;
    }
  }

  // Extract company status
  const statusPatterns = [
    /(?:Estado|Situação|Situacao)[:\s]*([^\n|]+)/i,
  ];

  for (const pattern of statusPatterns) {
    const match = cleanContent.match(pattern);
    if (match && match[1]) {
      const status = match[1].trim().toLowerCase();
      if (status.includes('activ') || status.includes('ativ')) {
        result.company_status = 'Ativa';
      } else if (status.includes('dissolv') || status.includes('encerr') || status.includes('extint')) {
        result.company_status = 'Encerrada';
      } else if (status.includes('insolvên') || status.includes('insolven')) {
        result.company_status = 'Insolvência';
      } else {
        result.company_status = match[1].trim();
      }
      console.log('Found status:', result.company_status);
      break;
    }
  }

  // Check for status indicators in content
  if (!result.company_status) {
    if (cleanContent.toLowerCase().includes('em actividade') || cleanContent.toLowerCase().includes('em atividade')) {
      result.company_status = 'Ativa';
    } else if (cleanContent.toLowerCase().includes('dissolvida') || cleanContent.toLowerCase().includes('encerrada')) {
      result.company_status = 'Encerrada';
    }
  }

  // Extract capital social
  const capitalPatterns = [
    /Capital(?:\s+Social)?[:\s]*([€\d\s.,]+(?:€|EUR)?)/i,
  ];

  for (const pattern of capitalPatterns) {
    const match = cleanContent.match(pattern);
    if (match && match[1]) {
      result.capital_social = match[1].trim();
      console.log('Found capital:', result.capital_social);
      break;
    }
  }

  // Extract founding date
  const datePatterns = [
    /Constituição[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /Data de Constituição[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /Fundação[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /Início de Atividade[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /Inicio de Actividade[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = cleanContent.match(pattern);
    if (match && match[1]) {
      result.founding_date = match[1];
      console.log('Found founding date:', result.founding_date);
      break;
    }
  }

  return result;
}
