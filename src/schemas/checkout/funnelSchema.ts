import { z } from "zod";

/** Normaliza um texto livre para um slug seguro (sem acentos, minúsculas). */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export const slugSchema = z
  .string()
  .trim()
  .min(3, "O slug tem de ter pelo menos 3 caracteres")
  .max(60, "O slug tem de ter no máximo 60 caracteres")
  .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens");

export const funnelSchema = z.object({
  name: z.string().trim().min(2, "O nome tem de ter pelo menos 2 caracteres").max(120, "Máximo 120 caracteres"),
  slug: slugSchema,
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});

export type FunnelInput = z.infer<typeof funnelSchema>;

export const funnelProductSchema = z.object({
  name: z.string().trim().min(1, "Indique o nome do produto").max(120, "Máximo 120 caracteres"),
  quantity: z.coerce.number().int().min(1, "Quantidade mínima 1").max(999, "Quantidade máxima 999"),
  /** Preço unitário com IVA incluído (é o valor cobrado ao cliente). */
  price: z.coerce.number().min(0, "O preço não pode ser negativo").max(1000000, "Preço demasiado elevado"),
  product_id: z.string().uuid().nullable().optional(),
  sku: z.string().trim().max(80).nullable().optional(),
  image_url: z.string().trim().max(1000).nullable().optional(),
  /** Taxa de IVA em % (0–100). */
  tax_rate: z.coerce.number().min(0, "IVA inválido").max(100, "IVA inválido").optional(),
  /** Preço de referência (riscado) para mostrar poupança. */
  compare_at_price: z.coerce.number().min(0).max(1000000).nullable().optional(),
  /** Preço do catálogo no momento da associação, para detetar divergências. */
  catalog_price: z.coerce.number().min(0).nullable().optional(),
});

export const funnelProductsSchema = z
  .array(funnelProductSchema)
  .min(1, "Adicione pelo menos um produto")
  .max(20, "Máximo de 20 produtos");

export type FunnelProduct = z.infer<typeof funnelProductSchema>;

export const CURRENCIES = ["EUR", "USD", "GBP", "BRL"] as const;

export const DEFAULT_TAX_RATE = 23;

export type DiscountType = "none" | "fixed" | "percent";

export interface FunnelDiscount {
  type: DiscountType;
  value: number;
  label?: string | null;
}

export interface FunnelSettings {
  products?: FunnelProduct[];
  currency?: string;
  price?: number;
  countdown_seconds?: number | null;
  scarcity_text?: string | null;
  require_shipping?: boolean;
  discount?: FunnelDiscount | null;
}

export interface NormalizedFunnelSettings {
  products: FunnelProduct[];
  currency: string;
  countdown_seconds: number | null;
  scarcity_text: string;
  require_shipping: boolean;
  discount: FunnelDiscount;
}

/** Lê settings antigos/novos e devolve sempre um formato normalizado. */
export function readFunnelSettings(raw: any): NormalizedFunnelSettings {
  const settings = (raw ?? {}) as FunnelSettings;
  const products: FunnelProduct[] = Array.isArray(settings.products) && settings.products.length
    ? settings.products.map((p: any) => ({
        name: String(p?.name ?? ""),
        quantity: Number(p?.quantity) > 0 ? Number(p.quantity) : 1,
        price: Number(p?.price) || 0,
        product_id: p?.product_id ?? null,
        sku: p?.sku ?? null,
        image_url: p?.image_url ?? null,
        tax_rate: p?.tax_rate == null ? DEFAULT_TAX_RATE : Number(p.tax_rate) || 0,
        compare_at_price: p?.compare_at_price == null ? null : Number(p.compare_at_price) || null,
        catalog_price: p?.catalog_price == null ? null : Number(p.catalog_price) || 0,
      }))
    : [];

  const rawDiscount = settings.discount ?? null;

  return {
    products,
    currency: settings.currency || "EUR",
    countdown_seconds: settings.countdown_seconds ?? null,
    scarcity_text: settings.scarcity_text ?? "",
    require_shipping: settings.require_shipping !== false,
    discount: {
      type: (rawDiscount?.type as DiscountType) || "none",
      value: Number(rawDiscount?.value) || 0,
      label: rawDiscount?.label ?? null,
    },
  };
}

export interface ExtraLine {
  name: string;
  price: number;
  quantity?: number;
  tax_rate?: number;
}

export interface FunnelTotals {
  /** Total bruto (com IVA) antes de desconto. */
  gross: number;
  /** Valor do desconto aplicado. */
  discount: number;
  /** Total a pagar (com IVA, após desconto). */
  total: number;
  /** Base tributável (sem IVA) após desconto. */
  net: number;
  /** Montante de IVA após desconto. */
  tax: number;
}

/** Calcula subtotal, IVA, desconto e total. Os preços das linhas são com IVA incluído. */
export function funnelTotals(
  products: (FunnelProduct | ExtraLine)[],
  discount?: FunnelDiscount | null,
  extras: ExtraLine[] = []
): FunnelTotals {
  const lines = [...products, ...extras];
  let gross = 0;
  let net = 0;

  for (const line of lines) {
    const qty = Number(line.quantity) > 0 ? Number(line.quantity) : 1;
    const lineGross = (Number(line.price) || 0) * qty;
    const rate = Number((line as FunnelProduct).tax_rate ?? DEFAULT_TAX_RATE) || 0;
    gross += lineGross;
    net += lineGross / (1 + rate / 100);
  }

  let discountValue = 0;
  if (discount && discount.type === "fixed") discountValue = Math.min(Number(discount.value) || 0, gross);
  if (discount && discount.type === "percent") discountValue = (gross * (Number(discount.value) || 0)) / 100;
  discountValue = Math.max(0, Math.min(discountValue, gross));

  const total = gross - discountValue;
  const ratio = gross > 0 ? total / gross : 0;
  const netAfter = net * ratio;

  return {
    gross: round2(gross),
    discount: round2(discountValue),
    total: round2(total),
    net: round2(netAfter),
    tax: round2(total - netAfter),
  };
}

function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Compatibilidade: total bruto simples. */
export function funnelTotal(products: FunnelProduct[]): number {
  return funnelTotals(products).gross;
}
