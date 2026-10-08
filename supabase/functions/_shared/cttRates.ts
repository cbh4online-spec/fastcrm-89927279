// Tabela de portes CTT usada pela loja (fonte única: calculate-shipping e
// create-store-checkout). O servidor recalcula o custo; nunca confia no cliente.
export const CORREIO_AZUL_RATES = [
  { maxWeight: 0.1, price: 2.10 },
  { maxWeight: 0.5, price: 3.90 },
  { maxWeight: 2.0, price: 7.80 },
];
export const ENCOMENDA_POSTAL_T1_RATES = [
  { maxWeight: 2.0, price: 8.25 },
  { maxWeight: 5.0, price: 10.50 },
  { maxWeight: 10.0, price: 15.55 },
];

function lookup(rates: Array<{ maxWeight: number; price: number }>, w: number): number | null {
  for (const r of rates) if (w <= r.maxWeight) return r.price;
  return null;
}

export const getCorreioAzulPrice = (w: number) => (w > 2 ? null : lookup(CORREIO_AZUL_RATES, w));
export const getEncomendaPostalPrice = (w: number) => (w > 10 ? null : lookup(ENCOMENDA_POSTAL_T1_RATES, w));

export function cttPriceFor(methodId: string, weightKg: number): number | null {
  if (methodId === "ctt-azul") return getCorreioAzulPrice(weightKg);
  if (methodId === "ctt-encomenda") return getEncomendaPostalPrice(weightKg);
  return null;
}

/** Mesmo critério do checkout: peso em falta conta 0,5 kg. */
export const FALLBACK_ITEM_WEIGHT_KG = 0.5;
