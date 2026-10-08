/** Validação dos dados do vendedor (espelha as restrições da base de dados). */
export function isValidPtNif(nif: string): boolean {
  if (!/^\d{9}$/.test(nif)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(nif[i]) * (9 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === Number(nif[8]);
}

export interface SellerForm {
  seller_legal_name: string;
  seller_tax_id: string;
  seller_address: string;
  delivery_business_days: string;
}

export function validateSeller(f: SellerForm): string | null {
  const name = f.seller_legal_name.trim();
  if (name && (name.length < 2 || name.length > 200)) return "Nome legal: entre 2 e 200 caracteres.";
  const nif = f.seller_tax_id.replace(/\s/g, "");
  if (nif && !isValidPtNif(nif)) return "NIF inválido (9 dígitos com dígito de controlo).";
  const addr = f.seller_address.trim();
  if (addr && (addr.length < 5 || addr.length > 300)) return "Morada: entre 5 e 300 caracteres.";
  const d = f.delivery_business_days.trim();
  if (d && !(/^\d+$/.test(d) && Number(d) >= 1 && Number(d) <= 60)) return "Prazo de entrega: 1 a 60 dias úteis.";
  return null;
}

export function sellerPayload(f: SellerForm) {
  const nif = f.seller_tax_id.replace(/\s/g, "");
  const d = f.delivery_business_days.trim();
  return {
    seller_legal_name: f.seller_legal_name.trim() || null,
    seller_tax_id: nif || null,
    seller_address: f.seller_address.trim() || null,
    delivery_business_days: d ? Number(d) : null,
  };
}

export function businessDaysLabel(n: number): string {
  return `${n} ${n === 1 ? "dia útil" : "dias úteis"}`;
}
