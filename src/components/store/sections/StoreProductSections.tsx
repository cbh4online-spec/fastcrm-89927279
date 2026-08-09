import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { humanizeSpecKey } from "@/utils/specLabels";

const SECTION_LABELS: Record<string, string> = {
  overview: "Visão geral",
  how_to_use: "Como usar",
  specifications: "Especificações",
  clinical: "Informação técnica",
};

const SECTION_ORDER = ["overview", "how_to_use", "specifications", "clinical"];

interface StoreProductSectionsProps {
  productId: string;
}

/**
 * Secções estruturadas de conteúdo publicado (product_content_sections),
 * com âncoras para navegação rápida dentro da ficha.
 */
export function StoreProductSections({ productId }: StoreProductSectionsProps) {
  const { data: sections = [] } = useQuery({
    queryKey: ["store-product-sections", productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_content_sections")
        .select("section_key, body_markdown, attributes")
        .eq("product_id", productId)
        .eq("locale", "pt-PT")
        .eq("is_published", true);
      if (error) throw error;
      return (data || []) as Array<{
        section_key: string;
        body_markdown: string | null;
        attributes: Record<string, any> | null;
      }>;
    },
  });

  const visible = sections
    .filter((s) => (s.body_markdown && s.body_markdown.trim()) || Object.keys(s.attributes || {}).length > 0)
    .sort((a, b) => SECTION_ORDER.indexOf(a.section_key) - SECTION_ORDER.indexOf(b.section_key));

  if (visible.length === 0) return null;

  return (
    <section className="space-y-6" aria-label="Informação detalhada do produto">
      <nav className="flex flex-wrap gap-2">
        {visible.map((s) => (
          <a
            key={s.section_key}
            href={`#sec-${s.section_key}`}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {SECTION_LABELS[s.section_key] || humanizeSpecKey(s.section_key)}
          </a>
        ))}
      </nav>

      {visible.map((s) => {
        const attrs = Object.entries(s.attributes || {}).filter(
          ([, v]) => v !== null && v !== undefined && String(v).trim() !== "",
        );
        return (
          <div key={s.section_key} id={`sec-${s.section_key}`} className="scroll-mt-24 rounded-2xl border p-5">
            <h2 className="mb-3 text-lg font-semibold">
              {SECTION_LABELS[s.section_key] || humanizeSpecKey(s.section_key)}
            </h2>
            {s.body_markdown && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {s.body_markdown}
              </p>
            )}
            {attrs.length > 0 && (
              <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {attrs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b py-1.5 text-sm">
                    <dt className="text-muted-foreground">{humanizeSpecKey(k)}</dt>
                    <dd className="text-right font-medium">
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </section>
  );
}
