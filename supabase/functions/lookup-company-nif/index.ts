const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NifPtResponse {
  result: string;
  message?: string;
  records: Record<string, NifPtRecord>;
  nif_validation: boolean;
  is_nif: boolean;
  credits: {
    used: string;
    left: {
      month: number;
      day: number;
      hour: number;
      minute: number;
      paid: number;
    };
  };
}

interface NifPtRecord {
  nif: string | number;
  seo_url: string;
  title: string;
  address: string;
  pc4: string;
  pc3: string;
  city: string;
  start_date?: string;
  activity: string;
  status: string;
  cae: string | string[];
  contacts: {
    email: string | null;
    phone: string | null;
    website: string | null;
    fax: string | null;
  };
  structure: {
    nature: string;
    capital: string;
    capital_currency: string;
  };
  geo: {
    region: string;
    county: string;
    parish: string;
  };
  place: {
    address: string;
    pc4: string;
    pc3: string;
    city: string;
  };
  racius?: string;
  rapiea?: {
    code: string;
    description_short: string;
    description_long: string;
  };
  cae_main?: {
    code: string;
    description: string;
  };
}

interface LookupResult {
  // Basic info
  company_name: string | null;
  tax_id: string | null;
  
  // Address
  address: string | null;
  postal_code: string | null;
  city: string | null;
  
  // Geographic info
  region: string | null;
  county: string | null;
  parish: string | null;
  
  // Business info
  cae_codes: string[];
  cae_description: string | null;
  company_status: string | null;
  legal_nature: string | null;
  capital_social: string | null;
  founding_date: string | null;
  
  // Contacts
  email: string | null;
  phone: string | null;
  website: string | null;
  fax: string | null;
  
  // External links
  racius_url: string | null;
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

    const apiKey = Deno.env.get('NIF_PT_API_KEY');
    if (!apiKey) {
      console.error('NIF_PT_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Serviço de pesquisa não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking up NIF:', cleanNif);

    // Call nif.pt API
    const apiUrl = `https://www.nif.pt/?json=1&q=${cleanNif}&key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('nif.pt API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao consultar API do NIF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: NifPtResponse = await response.json();
    console.log('API response:', JSON.stringify(data));

    // Handle rate limiting
    if (data.result === 'error') {
      const message = data.message || '';
      if (message.toLowerCase().includes('limit') || message.toLowerCase().includes('minute')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Limite de consultas atingido. Aguarde um minuto e tente novamente.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: message || 'Erro ao consultar API do NIF' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data.result !== 'success' || !data.records || Object.keys(data.records).length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Empresa não encontrada com este NIF' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the first record (should be the only one for a specific NIF)
    const recordKey = Object.keys(data.records)[0];
    const record = data.records[recordKey];

    // Handle CAE - always return as array for consistency
    let caeCodes: string[] = [];
    if (record.cae) {
      if (Array.isArray(record.cae)) {
        caeCodes = record.cae.map((c: string | number) => String(c));
      } else {
        caeCodes = [String(record.cae)];
      }
    } else if (record.cae_main?.code) {
      caeCodes = [record.cae_main.code];
    } else if (record.rapiea?.code) {
      caeCodes = [record.rapiea.code];
    }

    // Parse the response into our comprehensive format
    const result: LookupResult = {
      // Basic info
      company_name: record.title || null,
      tax_id: String(record.nif) || cleanNif,
      
      // Address - prefer place object, fallback to root fields
      address: record.place?.address || record.address || null,
      postal_code: formatPostalCode(record.place?.pc4 || record.pc4, record.place?.pc3 || record.pc3),
      city: record.place?.city || record.city || null,
      
      // Geographic info
      region: record.geo?.region || null,
      county: record.geo?.county || null,
      parish: record.geo?.parish || null,
      
      // Business info
      cae_codes: caeCodes,
      cae_description: record.cae_main?.description || record.rapiea?.description_short || record.activity || null,
      company_status: parseStatus(record.status),
      legal_nature: parseLegalNature(record.structure?.nature),
      capital_social: formatCapital(record.structure?.capital, record.structure?.capital_currency),
      founding_date: record.start_date || null,
      
      // Contacts
      email: record.contacts?.email || null,
      phone: record.contacts?.phone || null,
      website: record.contacts?.website || null,
      fax: record.contacts?.fax || null,
      
      // External links
      racius_url: record.racius || null,
    };

    console.log('Parsed company data:', JSON.stringify(result));

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

function formatPostalCode(pc4?: string, pc3?: string): string | null {
  if (!pc4) return null;
  if (pc3) {
    return `${pc4}-${pc3}`;
  }
  return pc4;
}

function parseStatus(status?: string): string | null {
  if (!status) return null;
  
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('activ') || statusLower.includes('ativ') || statusLower === 'active') {
    return 'Ativa';
  } else if (statusLower.includes('dissolv') || statusLower.includes('encerr') || statusLower.includes('extint')) {
    return 'Encerrada';
  } else if (statusLower.includes('insolvên') || statusLower.includes('insolven')) {
    return 'Insolvência';
  }
  
  return status;
}

function parseLegalNature(nature?: string): string | null {
  if (!nature) return null;
  
  const natureMap: Record<string, string> = {
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
  
  return natureMap[nature.toUpperCase()] || nature;
}

function formatCapital(capital?: string, currency?: string): string | null {
  if (!capital) return null;
  
  const numCapital = parseFloat(capital);
  if (isNaN(numCapital)) return capital;
  
  const formattedNumber = numCapital.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const currencySymbol = currency === 'EUR' || !currency ? '€' : currency;
  
  return `${formattedNumber} ${currencySymbol}`;
}
