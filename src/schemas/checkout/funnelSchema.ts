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
  price: z.coerce.number().min(0, "O preço não pode ser negativo").max(1000000, "Preço demasiado elevado"),
});

export const funnelProductsSchema = z
  .array(funnelProductSchema)
  .min(1, "Adicione pelo menos um produto")
  .max(20, "Máximo de 20 produtos");

export type FunnelProduct = z.infer<typeof funnelProductSchema>;

export const CURRENCIES = ["EUR", "USD", "GBP", "BRL"] as const;

export interface FunnelSettings {
  products?: FunnelProduct[];
  currency?: string;
  price?: number;
  countdown_seconds?: number | null;
  scarcity_text?: string | null;
  require_shipping?: boolean;
}

/** Lê settings antigos/novos e devolve sempre um formato normalizado. */
export function readFunnelSettings(raw: any): Required<Omit<FunnelSettings, "price">> {
  const settings = (raw ?? {}) as FunnelSettings;
  const products: FunnelProduct[] = Array.isArray(settings.products) && settings.products.length
    ? settings.products.map((p: any) => ({
        name: String(p?.name ?? ""),
        quantity: Number(p?.quantity) > 0 ? Number(p.quantity) : 1,
        price: Number(p?.price) || 0,
      }))
    : [];

  return {
    products,
    currency: settings.currency || "EUR",
    countdown_seconds: settings.countdown_seconds ?? null,
    scarcity_text: settings.scarcity_text ?? "",
    require_shipping: settings.require_shipping !== false,
  };
}

export function funnelTotal(products: FunnelProduct[]): number {
  return products.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);
}
