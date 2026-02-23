import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProtocolKit {
  id: string;
  protocol_id: string;
  kit_name: string;
  kit_level: "basic" | "advanced" | "custom";
  description: string | null;
  is_default: boolean;
  position: number;
  items: ProtocolKitItem[];
}

export interface ProtocolKitItem {
  id: string;
  kit_id: string;
  product_id: string;
  suggested_qty: number;
  is_optional: boolean;
  notes: string | null;
  position: number;
  product?: {
    id: string;
    name: string;
    sku: string | null;
    base_price: number;
    images: string[] | null;
    short_description: string | null;
  };
}

export function useProtocolKits(protocolId: string | undefined) {
  return useQuery({
    queryKey: ["protocol-kits", protocolId],
    queryFn: async () => {
      if (!protocolId) return [];

      const { data: kits, error } = await supabase
        .from("protocol_kits")
        .select("*")
        .eq("protocol_id", protocolId)
        .order("position", { ascending: true });

      if (error) throw error;
      if (!kits || kits.length === 0) return [];

      const kitIds = kits.map((k: any) => k.id);

      const { data: items } = await supabase
        .from("protocol_kit_items")
        .select("*")
        .in("kit_id", kitIds)
        .order("position", { ascending: true });

      // Fetch products for kit items
      const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
      let productsMap = new Map<string, any>();

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, name, sku, base_price, images, short_description")
          .in("id", productIds);

        (products || []).forEach((p: any) => productsMap.set(p.id, p));
      }

      return kits.map((kit: any) => ({
        ...kit,
        items: (items || [])
          .filter((i: any) => i.kit_id === kit.id)
          .map((i: any) => ({
            ...i,
            product: productsMap.get(i.product_id) || null,
          })),
      })) as ProtocolKit[];
    },
    enabled: !!protocolId,
  });
}

export const kitLevelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  basic: { label: "Básico", color: "text-blue-700", bgColor: "bg-blue-100" },
  advanced: { label: "Avançado", color: "text-purple-700", bgColor: "bg-purple-100" },
  custom: { label: "Personalizado", color: "text-emerald-700", bgColor: "bg-emerald-100" },
};
