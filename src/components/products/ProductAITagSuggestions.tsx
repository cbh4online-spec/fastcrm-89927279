import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { buildTagSuggestions } from "@/lib/ai-commerce/tagStrategy";

interface ProductAITagSuggestionsProps {
  product: any;
  existingTags: string[];
  onApply: (tags: string[]) => void;
  isApplying?: boolean;
}

export function ProductAITagSuggestions({
  product,
  existingTags,
  onApply,
  isApplying,
}: ProductAITagSuggestionsProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const { data: specAttributes } = useQuery({
    queryKey: ["product-specs", product?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_spec_attributes")
        .select("spec_key, spec_value")
        .eq("product_id", product.id);
      if (error) throw error;
      return (data || []) as { spec_key: string; spec_value: string }[];
    },
    enabled: !!product?.id,
  });

  const { data: aiContent } = useQuery({
    queryKey: ["product-ai-commerce", product?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_ai_commerce")
        .select("ai_target_audience, ai_use_cases, ai_keywords, ai_key_features")
        .eq("product_id", product.id)
        .maybeSingle();
      if (error) return null;
      return data as any;
    },
    enabled: !!product?.id,
  });

  const groups = useMemo(
    () =>
      buildTagSuggestions(
        {
          name: product?.name,
          brand: product?.brand,
          manufacturer: product?.manufacturer,
          model: product?.model,
          category: product?.category,
          subcategory: product?.subcategory,
          specifications: product?.specifications || null,
          specAttributes: specAttributes || [],
          idealFor: aiContent?.ideal_for || null,
          useCases: aiContent?.use_cases || null,
          searchTerms: aiContent?.search_terms || null,
        },
        existingTags
      ),
    [product, specAttributes, aiContent, existingTags]
  );

  if (groups.length === 0) return null;

  const toggle = (tag: string) =>
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleApply = () => {
    if (selected.length === 0) return;
    onApply(selected);
    setSelected([]);
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-medium">Etiquetas sugeridas (AI Commerce)</p>
        </div>
        <Button
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={selected.length === 0 || isApplying}
          onClick={handleApply}
        >
          {isApplying ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Check className="h-3 w-3 mr-1" />
          )}
          Adicionar {selected.length > 0 ? `(${selected.length})` : ""}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Propostas a partir dos dados reais da ficha. Nada é guardado sem a sua aprovação.
      </p>

      {groups.map((group) => (
        <div key={group.purpose} className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {group.label}
          </p>
          <p className="text-[10px] text-muted-foreground">{group.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map((tag) => {
              const active = selected.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(tag)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
