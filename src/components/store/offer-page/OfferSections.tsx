import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoreProductDescription } from "@/components/store/StoreProductDescription";
import { StoreProductHighlights } from "@/components/store/StoreProductHighlights";
import { StoreReviewsSection } from "@/components/store/StoreReviewsSection";
import { StoreBoughtTogether } from "@/components/store/sections/StoreBoughtTogether";
import { StoreRelatedProducts } from "@/components/store/sections/StoreRelatedProducts";
import { StoreProductDocuments } from "@/components/store/sections/StoreProductDocuments";
import type { OfferPageConfig, OfferSectionKey, OfferSectorConfig } from "./offerPageTypes";
import { SECTION_LABELS, getSectionOrder } from "./offerPageTypes";

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

/* ────────── sector content blocks ────────── */

function IngredientsBlock({ sector }: { sector: OfferSectorConfig }) {
  const items = (sector.ingredients || []).filter((i) => i?.name?.trim());
  if (!items.length) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((i, idx) => (
        <li key={idx} className="rounded-md border p-3 text-sm">
          <span className="font-medium">{i.name}</span>
          {i.role && <span className="block text-muted-foreground">{i.role}</span>}
        </li>
      ))}
    </ul>
  );
}

function StepsBlock({ items, ordered }: { items?: { title: string; description?: string }[]; ordered?: boolean }) {
  const list = (items || []).filter((i) => i?.title?.trim());
  if (!list.length) return null;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={cn("space-y-3", ordered ? "list-decimal pl-5" : "")}>
      {list.map((i, idx) => (
        <li key={idx} className="text-sm">
          <span className="font-medium">{i.title}</span>
          {i.description && (
            <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{i.description}</p>
          )}
        </li>
      ))}
    </Tag>
  );
}

function InstructorBlock({ sector }: { sector: OfferSectorConfig }) {
  const ins = sector.instructor;
  if (!ins?.name?.trim() && !ins?.bio?.trim()) return null;
  return (
    <div className="flex items-start gap-4">
      {ins?.photoUrl && (
        <img
          src={ins.photoUrl}
          alt={ins.name || "Formador"}
          loading="lazy"
          className="h-16 w-16 rounded-full object-cover"
        />
      )}
      <div className="text-sm">
        {ins?.name && <p className="font-medium">{ins.name}</p>}
        {ins?.bio && <p className="mt-1 whitespace-pre-line text-muted-foreground">{ins.bio}</p>}
      </div>
    </div>
  );
}

function SessionsBlock({ sector }: { sector: OfferSectorConfig }) {
  const sessions = (sector.sessions || []).filter(
    (s) => s && (s.date || s.time || s.location),
  );
  if (!sessions.length) return null;
  return (
    <ul className="divide-y rounded-md border">
      {sessions.map((s, idx) => (
        <li key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <div>
            <span className="font-medium">{s.date || "Data a anunciar"}</span>
            {s.time && <span className="text-muted-foreground"> · {s.time}</span>}
            {s.location && <span className="block text-muted-foreground">{s.location}</span>}
          </div>
          {s.seats && <span className="text-xs text-muted-foreground">{s.seats}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the configured content sections in the order defined in the config.
 * Sections without content are skipped (no empty blocks).
 */
export function OfferSections({ config, product, workspaceSlug }: Props) {
  const isEnabled = (key: OfferSectionKey) => config.sections?.[key] === true;
  const sector: OfferSectorConfig = config.sectorConfig || {};

  const renderers: Partial<Record<OfferSectionKey, () => React.ReactNode>> = {
    description: () => (
      <AccordionBlock title={SECTION_LABELS.description} defaultOpen>
        <StoreProductDescription
          description={product.commercial_description || product.short_description}
        />
      </AccordionBlock>
    ),
    benefits: () =>
      Array.isArray(product.benefits) && product.benefits.length > 0 ? (
        <AccordionBlock title={SECTION_LABELS.benefits} defaultOpen>
          <StoreProductHighlights benefits={product.benefits} />
        </AccordionBlock>
      ) : null,
    specifications: () =>
      product.specifications && Object.keys(product.specifications).length > 0 ? (
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
      ) : null,
    ingredients: () => {
      const content = <IngredientsBlock sector={sector} />;
      if (!content || !(sector.ingredients || []).some((i) => i?.name?.trim())) return null;
      return (
        <AccordionBlock title={SECTION_LABELS.ingredients} defaultOpen>
          {content}
        </AccordionBlock>
      );
    },
    howToUse: () =>
      (sector.howToUse || []).some((i) => i?.title?.trim()) ? (
        <AccordionBlock title={SECTION_LABELS.howToUse} defaultOpen>
          <StepsBlock items={sector.howToUse} ordered />
        </AccordionBlock>
      ) : null,
    program: () =>
      (sector.program || []).some((i) => i?.title?.trim()) ? (
        <AccordionBlock title={SECTION_LABELS.program} defaultOpen>
          <StepsBlock items={sector.program} ordered />
        </AccordionBlock>
      ) : null,
    instructor: () =>
      sector.instructor?.name?.trim() || sector.instructor?.bio?.trim() ? (
        <AccordionBlock title={SECTION_LABELS.instructor}>
          <InstructorBlock sector={sector} />
        </AccordionBlock>
      ) : null,
    sessions: () =>
      (sector.sessions || []).some((s) => s?.date || s?.time || s?.location) ? (
        <AccordionBlock title={SECTION_LABELS.sessions} defaultOpen>
          <SessionsBlock sector={sector} />
        </AccordionBlock>
      ) : null,
    equipment: () =>
      (sector.equipment || []).some((i) => i?.title?.trim()) ? (
        <AccordionBlock title={SECTION_LABELS.equipment}>
          <StepsBlock items={sector.equipment} />
        </AccordionBlock>
      ) : null,
    installation: () =>
      (sector.installation || []).some((i) => i?.title?.trim()) || sector.installationNote?.trim() ? (
        <AccordionBlock title={SECTION_LABELS.installation}>
          <div className="space-y-3">
            <StepsBlock items={sector.installation} ordered />
            {sector.installationNote && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {sector.installationNote}
              </p>
            )}
          </div>
        </AccordionBlock>
      ) : null,
    video: () =>
      product.demo_video_url ? (
        <AccordionBlock title={SECTION_LABELS.video}>
          <video src={product.demo_video_url} controls className="w-full rounded-lg" />
        </AccordionBlock>
      ) : null,
    delivery: () => (
      <AccordionBlock title={SECTION_LABELS.delivery}>
        <p className="text-sm text-muted-foreground">
          {config.deliveryText || "Consulte disponibilidade e prazos no checkout."}
        </p>
      </AccordionBlock>
    ),
    warranty: () => (
      <AccordionBlock title={SECTION_LABELS.warranty}>
        <p className="text-sm text-muted-foreground">
          Consulte as condições de garantia aplicáveis a este produto.
        </p>
      </AccordionBlock>
    ),
    documents: () => (
      <AccordionBlock title={SECTION_LABELS.documents}>
        <StoreProductDocuments productId={product.id} />
      </AccordionBlock>
    ),
    reviews: () => (
      <AccordionBlock title={SECTION_LABELS.reviews} defaultOpen>
        <StoreReviewsSection productId={product.id} workspaceId={product.workspace_id} />
      </AccordionBlock>
    ),
    faq: () =>
      config.faqItems.some((f) => f.active && f.question && f.answer) ? (
        <AccordionBlock title={SECTION_LABELS.faq} defaultOpen>
          <div className="space-y-3">
            {config.faqItems
              .filter((f) => f.active && f.question && f.answer)
              .map((f) => (
                <details key={f.id} className="rounded-md border p-3">
                  <summary className="cursor-pointer text-sm font-medium">{f.question}</summary>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{f.answer}</p>
                </details>
              ))}
          </div>
        </AccordionBlock>
      ) : null,
    relatedProducts: () => (
      <div className="mt-8 space-y-8">
        <StoreBoughtTogether
          workspaceId={product.workspace_id}
          productId={product.id}
          categoryId={product.store_category_id}
          currentPrice={product.base_price}
          currency={product.currency}
        />
        <StoreRelatedProducts
          workspaceId={product.workspace_id}
          productId={product.id}
          categoryId={product.store_category_id}
          workspaceSlug={workspaceSlug}
        />
      </div>
    ),
  };

  return (
    <section className="mt-8" aria-label="Detalhes do produto">
      {getSectionOrder(config).map((key) =>
        isEnabled(key) ? <div key={key}>{renderers[key]?.()}</div> : null,
      )}
    </section>
  );
}
