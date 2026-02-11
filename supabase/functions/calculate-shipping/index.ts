import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// CTT 2026 Pricing Tables (Portugal Continental)

// Correio Azul / Pacote Postal - até 2kg
const CORREIO_AZUL_RATES = [
  { maxWeight: 0.1, price: 2.10 },   // até 100g
  { maxWeight: 0.5, price: 3.90 },   // 100g - 500g
  { maxWeight: 2.0, price: 7.80 },   // 500g - 2kg
];

// Encomenda Postal - até 10kg (Trajeto T1)
const ENCOMENDA_POSTAL_T1_RATES = [
  { maxWeight: 2.0, price: 8.25 },   // até 2kg
  { maxWeight: 5.0, price: 10.50 },  // 2kg - 5kg
  { maxWeight: 10.0, price: 15.55 }, // 5kg - 10kg
];

function getCorreioAzulPrice(weightKg: number): number | null {
  if (weightKg > 2.0) return null;
  for (const rate of CORREIO_AZUL_RATES) {
    if (weightKg <= rate.maxWeight) return rate.price;
  }
  return null;
}

function getEncomendaPostalPrice(weightKg: number): number | null {
  if (weightKg > 10.0) return null;
  for (const rate of ENCOMENDA_POSTAL_T1_RATES) {
    if (weightKg <= rate.maxWeight) return rate.price;
  }
  return null;
}

serve(async (req) => {
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
