import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { brandFacetsFromRows } from "@/hooks/useStoreProducts";

const row = (brand: string | null) => ({ brand, store_category_id: "c", workspace_id: "w" });

describe("brandFacetsFromRows (leitura partilhada categoria+marca)", () => {
  it("conta cada produto uma vez por marca e ignora vazias", () => {
    expect(brandFacetsFromRows([row("Ajax"), row("Ajax "), row(null), row(""), row("Hikvision")])).toEqual([
      { value: "Ajax", count: 2 },
      { value: "Hikvision", count: 1 },
    ]);
  });
});
