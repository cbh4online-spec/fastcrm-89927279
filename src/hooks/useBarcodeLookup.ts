import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BarcodeLookupResult {
  found: boolean;
  product_id?: string;
  name?: string;
  sku?: string;
  barcode?: string;
  images?: string[];
  stock_on_hand?: number;
  base_price?: number;
  status?: string;
  category?: string;
}

export interface ExternalLookupResult {
  found: boolean;
  name?: string;
  brand?: string;
  image_url?: string;
  category?: string;
}

export function useBarcodeLookup(workspaceId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BarcodeLookupResult | null>(null);

  const lookup = useCallback(
    async (barcode: string): Promise<BarcodeLookupResult> => {
      if (!workspaceId || !barcode) {
        return { found: false };
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "barcode-lookup",
          { body: { workspace_id: workspaceId, barcode: barcode.trim() } }
        );
        if (error) throw error;
        const r = data as BarcodeLookupResult;
        setResult(r);
        return r;
      } catch (err) {
        console.warn('[PRODUCTS] BARCODE_LOOKUP_FAILED', (err as Error).message);
        const fallback: BarcodeLookupResult = { found: false };
        setResult(fallback);
        return fallback;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId]
  );

  const externalLookup = useCallback(
    async (barcode: string): Promise<ExternalLookupResult> => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "barcode-external-lookup",
          { body: { barcode: barcode.trim() } }
        );
        if (error) throw error;
        return data as ExternalLookupResult;
      } catch (err) {
        console.warn('[PRODUCTS] BARCODE_EXTERNAL_FAILED', (err as Error).message);
        return { found: false };
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setIsLoading(false);
  }, []);

  return { lookup, externalLookup, isLoading, result, reset };
}
