/**
 * Ordenação "Recomendados" do catálogo público.
 * Determinística e baseada apenas no nome/tipo já existentes do produto:
 * 1) ordem manual definida pela loja (store_sort_order > 0) e destaques,
 * 2) kits reais (nome contém "kit"),
 * 3) equipamentos principais (centrais, detetores, câmaras, sirenes, teclados…),
 * 4) restantes produtos,
 * 5) acessórios, peças e consumíveis (suportes, baterias, caixas, cabos…).
 * Nunca cria kits nem altera dados.
 */

export interface RankableProduct {
  id: string;
  name?: string | null;
  store_sort_order?: number | null;
  store_featured?: boolean | null;
  stock_status?: string | null;
}

const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const KIT_RE = /\b(kit|starterkit|pack)\b/;
const ACCESSORY_RE =
  /\b(suporte|soporte|bracket|acessorio|accesorio|bateria|pilha|caixa de montagem|caixa para|holder|antena|altifalante|cabo|adaptador|alimentador|fonte de alimentacao|parafuso|tampa|moldura|placa de montagem|smartbracket|tag|pass|fob|substituicao|recarga|fusivel|conector|gland|glandbox)\b/;
const MAIN_RE =
  /\b(hub|central|painel de controlo|detetor|detector|motionprotect|motioncam|doorprotect|glassprotect|fireprotect|leaksprotect|camara|camera|turretcam|bulletcam|domecam|nvr|sirene|siren|streetsiren|homesiren|teclado|keypad|keypadcombi|repetidor|rex|botao de panico|button|relay|wallswitch|lightswitch|socket|tomada)\b/;

export function recommendedTier(p: RankableProduct): number {
  const name = norm(p.name || "");
  if ((p.store_sort_order ?? 0) > 0 || p.store_featured) return 0;
  if (KIT_RE.test(name)) return 1;
  const accessory = ACCESSORY_RE.test(name);
  if (MAIN_RE.test(name) && !accessory) return 2;
  if (accessory) return 4;
  return 3;
}

export function sortRecommended<T extends RankableProduct>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const t = recommendedTier(a) - recommendedTier(b);
    if (t !== 0) return t;
    const oos = Number(a.stock_status === "out_of_stock") - Number(b.stock_status === "out_of_stock");
    if (oos !== 0) return oos;
    const so = (a.store_sort_order ?? 0) - (b.store_sort_order ?? 0);
    if (so !== 0) return so;
    return (a.name || "").localeCompare(b.name || "", "pt");
  });
}
