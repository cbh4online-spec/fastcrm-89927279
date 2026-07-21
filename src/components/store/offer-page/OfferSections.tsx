import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoreProductDescription } from "@/components/store/StoreProductDescription";
import { StoreProductHighlights } from "@/components/store/StoreProductHighlights";
import { StoreReviewsSection } from "@/components/store/StoreReviewsSection";
import { StoreBoughtTogether } from "@/components/store/sections/StoreBoughtTogether";
import { StoreRelatedProducts } from "@/components/store/sections/StoreRelatedProducts";
import { StoreProductDocuments } from "@/components/store/sections/StoreProductDocuments";
import type { OfferPageConfig, OfferSectionKey } from "./offerPageTypes";
import { SECTION_LABELS } from "./offerPageTypes";

interface Props {
  config: OfferPageConfig;
  product: any;
  workspaceSlug: string;
}

function AccordionBlock({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-t">
      <button
        type="button"
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base font-semibold">{title}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="pb-6">{children}</div>}
    </div>
  );
}

/**
 * Renders the configured content sections in the order provided by config.sections.
 * Reuses existing storefront section components.
 */
export function OfferSections({ config, product, workspaceSlug }: Props) {
  const isEnabled = (key: OfferSectionKey) => config.sections?.[key] === true;

  return (
    <section className="mt-8" aria-label="Detalhes do produto">
      {isEnabled("description") && (
        <AccordionBlock title={SECTION_LABELS.description} defaultOpen>
          <StoreProductDescription
            description={product.commercial_description || product.short_description}
          />
        </AccordionBlock>
      )}

      {isEnabled("benefits") && Array.isArray(product.benefits) && product.benefits.length > 0 && (
        <AccordionBlock title={SECTION_LABELS.benefits} defaultOpen>
          <StoreProductHighlights benefits={product.benefits} />
        </AccordionBlock>
      )}

      {isEnabled("specifications") && product.specifications && Object.keys(product.specifications).length > 0 && (
        <AccordionBlock title={SECTION_LABELS.specifications}>
          <dl className="grid gap-2 sm:grid-cols-2">
            {Object.entries(product.specifications).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 rounded-md border p-3 text-sm">
                <dt className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                <dd className="font-medium text-right">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </AccordionBlock>
      )}

      {isEnabled("video") && product.demo_video_url && (
        <AccordionBlock title={SECTION_LABELS.video}>
          <video src={product.demo_video_url} controls className="w-full rounded-lg" />
        </AccordionBlock>
      )}

      {isEnabled("delivery") && (
        <AccordionBlock title={SECTION_LABELS.delivery}>
          <p className="text-sm text-muted-foreground">
            {config.deliveryText || "Consulte disponibilidade e prazos no checkout."}
          </p>
        </AccordionBlock>
      )}

      {isEnabled("warranty") && (
        <AccordionBlock title={SECTION_LABELS.warranty}>
          <p className="text-sm text-muted-foreground">
            Consulte as condições de garantia aplicáveis a este produto.
          </p>
        </AccordionBlock>
      )}

      {isEnabled("documents") && (
        <AccordionBlock title={SECTION_LABELS.documents}>
          <StoreProductDocuments productId={product.id} />
        </AccordionBlock>
      )}

      {isEnabled("reviews") && (
        <AccordionBlock title={SECTION_LABELS.reviews} defaultOpen>
          <StoreReviewsSection productId={product.id} workspaceId={product.workspace_id} />
        </AccordionBlock>
      )}

      {isEnabled("faq") && config.faqItems.some((f) => f.active) && (
        <AccordionBlock title={SECTION_LABELS.faq} defaultOpen>
          <div className="space-y-3">
            {config.faqItems
              .filter((f) => f.active && f.question && f.answer)
              .map((f) => (
                <details key={f.id} className="rounded-md border p-3">
                  <summary className="cursor-pointer text-sm font-medium">{f.question}</summary>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {f.answer}
                  </p>
                </details>
              ))}
          </div>
        </AccordionBlock>
      )}

      {isEnabled("relatedProducts") && (
        <div className="mt-8 space-y-8">
          <StoreBoughtTogether
            workspaceId={product.workspace_id}
            productId={product.id}
            workspaceSlug={workspaceSlug}
          />
          <StoreRelatedProducts
            workspaceId={product.workspace_id}
            productId={product.id}
            categoryId={product.store_category_id}
            workspaceSlug={workspaceSlug}
          />
        </div>
      )}
    </section>
  );
}
