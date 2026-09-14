/**
 * Camada AI Commerce na ficha pública do produto:
 *  - registo do evento `product_view` com a atribuição do canal;
 *  - dados estruturados adicionais (FAQ) sem duplicar o Product/Offer já
 *    emitido por `ProductSeoHead`.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { captureAttribution, trackCommerceEvent } from "@/lib/ai-commerce/tracking";
import type { AIFaqEntry } from "@/lib/ai-commerce/types";

interface Props {
  productId: string;
  workspaceId: string | null | undefined;
}

export function AICommerceProductExtras({ productId, workspaceId }: Props) {
  const { data } = useQuery({
    queryKey: ["public-product-ai-commerce", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_ai_commerce")
        .select("ai_faq, ai_commerce_enabled")
        .eq("product_id", productId)
        .eq("ai_commerce_enabled", true)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  useEffect(() => {
    if (!workspaceId) return;
    captureAttribution();
    void trackCommerceEvent({ workspaceId, eventType: "product_view", productId });
  }, [workspaceId, productId]);

  const faq = (Array.isArray(data?.ai_faq) ? (data!.ai_faq as unknown as AIFaqEntry[]) : []).filter(
    (entry) => entry?.question?.trim() && entry?.answer?.trim(),
  );

  if (faq.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
