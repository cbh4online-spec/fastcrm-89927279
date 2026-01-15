const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NifPtResponse {
  result: string;
  records: Record<string, NifPtRecord>;
  nif_validation: boolean;
  is_nif: boolean;
  credits: {
    used: string;
    left: string;
  };
}

interface NifPtRecord {
  nif: string;
  seo_url: string;
  title: string;
  address: string;
  pc4: string;
  pc3: string;
  city: string;
  activity: string;
  status: string;
  cae: string;
  contacts: {
    email: string;
    phone: string;
    website: string;
    fax: string;
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
  rapiea: {
    code: string;
    description_short: string;
    description_long: string;
  };
  cae_main?: {
    code: string;
    description: string;
  };
  start_date?: string;
}

interface LookupResult {
  company_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  cae_codes: string[];
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
      const message = (data as any).message || '';
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

    // Parse the response into our format
    // Handle CAE - always return as array for consistency
    let caeCodes: string[] = [];
    if (record.cae) {
      if (Array.isArray(record.cae)) {
        caeCodes = record.cae.map((c: any) => String(c));
      } else {
        caeCodes = [String(record.cae)];
      }
    } else if (record.cae_main?.code) {
      caeCodes = [record.cae_main.code];
    } else if (record.rapiea?.code) {
      caeCodes = [record.rapiea.code];
    }

    const result: LookupResult = {
      company_name: record.title || null,
      billing_address: record.address || record.place?.address || null,
      billing_city: record.city || record.place?.city || null,
      billing_postal_code: formatPostalCode(record.pc4, record.pc3) || formatPostalCode(record.place?.pc4, record.place?.pc3) || null,
      billing_country: 'Portugal',
      cae_codes: caeCodes,
      cae_description: record.cae_main?.description || record.rapiea?.description_short || record.activity || null,
      company_status: parseStatus(record.status),
      capital_social: formatCapital(record.structure?.capital, record.structure?.capital_currency),
      founding_date: record.start_date || null,
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
  
  if (statusLower.includes('activ') || statusLower.includes('ativ')) {
    return 'Ativa';
  } else if (statusLower.includes('dissolv') || statusLower.includes('encerr') || statusLower.includes('extint')) {
    return 'Encerrada';
  } else if (statusLower.includes('insolvên') || statusLower.includes('insolven')) {
    return 'Insolvência';
  }
  
  return status;
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
