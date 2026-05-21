import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface StockEnrichmentEntry {
  supplier_id: string | null;
  supplier_name: string | null;
  brand: string | null;
}

export interface StockEnrichmentResult {
  byProduct: Map<string, StockEnrichmentEntry>;
  suppliers: { id: string; name: string }[];
  brands: string[];
}

export function useStockEnrichment() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["stock-enrichment", wsId],
    enabled: !!wsId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<StockEnrichmentResult> => {
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, default_supplier_id, distributor")
        .eq("workspace_id", wsId);
      if (pErr) throw pErr;

      const supplierIds = Array.from(
        new Set((products || []).map((p: any) => p.default_supplier_id).filter(Boolean)),
      );

      let suppliersMap = new Map<string, string>();
      if (supplierIds.length) {
        const { data: sups } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", supplierIds);
        (sups || []).forEach((s: any) => suppliersMap.set(s.id, s.name));
      }

      const byProduct = new Map<string, StockEnrichmentEntry>();
      const brandsSet = new Set<string>();
      (products || []).forEach((p: any) => {
        const supplier_name = p.default_supplier_id
          ? suppliersMap.get(p.default_supplier_id) || null
          : null;
        const brand = (p.distributor && String(p.distributor).trim()) || null;
        byProduct.set(p.id, {
          supplier_id: p.default_supplier_id || null,
          supplier_name,
          brand,
        });
        if (brand) brandsSet.add(brand);
      });

      const suppliers = Array.from(suppliersMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        byProduct,
        suppliers,
        brands: Array.from(brandsSet).sort(),
      };
    },
  });
}
