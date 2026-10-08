

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

import { getCorreioAzulPrice, getEncomendaPostalPrice } from "../_shared/cttRates.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { totalWeightKg } = await req.json();
    const weight = typeof totalWeightKg === 'number' && totalWeightKg > 0 ? totalWeightKg : 0.5;

    const options: Array<{
      id: string;
      name: string;
      price: number;
      estimate: string;
      maxWeight: number;
    }> = [];

    // Correio Azul (up to 2kg)
    const azulPrice = getCorreioAzulPrice(weight);
    if (azulPrice !== null) {
      options.push({
        id: 'ctt-azul',
        name: 'CTT Correio Azul',
        price: azulPrice,
        estimate: '1 dia útil',
        maxWeight: 2,
      });
    }

    // Encomenda Postal (up to 10kg)
    const encomendaPrice = getEncomendaPostalPrice(weight);
    if (encomendaPrice !== null) {
      options.push({
        id: 'ctt-encomenda',
        name: 'CTT Encomenda Postal',
        price: encomendaPrice,
        estimate: '3 dias úteis',
        maxWeight: 10,
      });
    }

    const overWeight = weight > 10;

    return new Response(JSON.stringify({
      success: true,
      totalWeightKg: weight,
      options,
      overWeight,
      message: overWeight ? 'Peso excede 10kg. Contacte-nos para orçamento de envio.' : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
