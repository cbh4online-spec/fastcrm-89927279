import { useMemo, useState } from "react";
import { OfferOptionStep } from "./OfferOptionStep";
import type { OfferPageConfig } from "./offerPageTypes";
import { usePublicProductVariants, type ProductVariant } from "@/hooks/useProductVariants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface OfferSelectionState {
  variantId?: string;
  quantity: number;
  mode: string; // e.g. "one_time" | "subscription" for cosmetics; free-form for other presets
  bundleId?: string;
  sectorSelections: Record<string, string>;
}

interface Props {
  config: OfferPageConfig;
  product: any;
  selection: OfferSelectionState;
  onChange: (s: OfferSelectionState) => void;
}

/**
 * Renders the numbered decision steps according to the active preset.
 * Empty/irrelevant steps are hidden automatically.
 */
export function OfferDecisionPanel({ config, product, selection, onChange }: Props) {
  const { data: variants = [] } = usePublicProductVariants(product?.id);
  const hasVariants = variants.length > 0;

  // Determine which steps this preset renders and only number visible ones.
  const steps: React.ReactNode[] = [];

  switch (config.preset) {
    case "cosmetics": {
      if (hasVariants) {
        steps.push(
          <VariantSelector
            key="variant"
            step={steps.length + 1}
            variants={variants}
            value={selection.variantId}
            onChange={(v) => onChange({ ...selection, variantId: v })}
          />,
        );
      }
      steps.push(
        <QuantityStep
          key="qty"
          step={steps.length + 1}
          value={selection.quantity}
          onChange={(q) => onChange({ ...selection, quantity: q })}
        />,
      );
      break;
    }
    case "training": {
      const modalities = extractSectorList(config, "modalities", [
        "Presencial",
        "Online",
        "Híbrido",
      ]);
      if (modalities.length > 0) {
        steps.push(
          <SectorChoiceStep
            key="mod"
            step={steps.length + 1}
            title="Escolha a modalidade"
            options={modalities}
            value={selection.sectorSelections.modality}
            onChange={(v) =>
              onChange({
                ...selection,
                sectorSelections: { ...selection.sectorSelections, modality: v },
              })
            }
          />,
        );
      }
      if (hasVariants) {
        steps.push(
          <VariantSelector
            key="edition"
            step={steps.length + 1}
            title="Escolha a edição"
            variants={variants}
            value={selection.variantId}
            onChange={(v) => onChange({ ...selection, variantId: v })}
          />,
        );
      }
      break;
    }
    case "security": {
      steps.push(
        <SectorChoiceStep
          key="space"
          step={steps.length + 1}
          title="Tipo de espaço"
          options={extractSectorList(config, "spaces", [
            "Habitação",
            "Loja",
            "Escritório",
            "Armazém",
            "Indústria",
            "Condomínio",
            "Obra",
          ])}
          value={selection.sectorSelections.space}
          onChange={(v) =>
            onChange({
              ...selection,
              sectorSelections: { ...selection.sectorSelections, space: v },
            })
          }
        />,
      );
      steps.push(
        <SectorChoiceStep
          key="need"
          step={steps.length + 1}
          title="Necessidade"
          options={extractSectorList(config, "needs", [
            "Intrusão",
            "Videovigilância",
            "Controlo de acessos",
            "Incêndio",
            "Manutenção",
            "Monitorização",
          ])}
          value={selection.sectorSelections.need}
          onChange={(v) =>
            onChange({
              ...selection,
              sectorSelections: { ...selection.sectorSelections, need: v },
            })
          }
        />,
      );
      if (hasVariants) {
        steps.push(
          <VariantSelector
            key="solution"
            step={steps.length + 1}
            title="Tipo de solução"
            variants={variants}
            value={selection.variantId}
            onChange={(v) => onChange({ ...selection, variantId: v })}
          />,
        );
      }
      break;
    }
    case "dropshipping": {
      if (hasVariants) {
        steps.push(
          <VariantSelector
            key="variant"
            step={steps.length + 1}
            variants={variants}
            value={selection.variantId}
            onChange={(v) => onChange({ ...selection, variantId: v })}
          />,
        );
      }
      steps.push(
        <QuantityStep
          key="qty"
          step={steps.length + 1}
          value={selection.quantity}
          onChange={(q) => onChange({ ...selection, quantity: q })}
        />,
      );
      break;
    }
    default: {
      if (hasVariants) {
        steps.push(
          <VariantSelector
            key="variant"
            step={steps.length + 1}
            variants={variants}
            value={selection.variantId}
            onChange={(v) => onChange({ ...selection, variantId: v })}
          />,
        );
      }
      steps.push(
        <QuantityStep
          key="qty"
          step={steps.length + 1}
          value={selection.quantity}
          onChange={(q) => onChange({ ...selection, quantity: q })}
        />,
      );
    }
  }

  if (steps.length === 0) return null;
  return <div className="space-y-5">{steps}</div>;
}

/* ────────── inner steps ────────── */

function VariantSelector({
  step,
  variants,
  value,
  onChange,
  title = "Escolha a opção",
}: {
  step: number;
  variants: ProductVariant[];
  value?: string;
  onChange: (v: string) => void;
  title?: string;
}) {
  return (
    <OfferOptionStep step={step} title={title}>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const active = value === v.id;
          const oos = v.track_stock && v.stock_quantity - v.stock_reserved <= 0;
          return (
            <button
              key={v.id}
              type="button"
              disabled={oos}
              onClick={() => onChange(v.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                active ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted",
                oos && "cursor-not-allowed opacity-50 line-through",
              )}
              aria-pressed={active}
            >
              {v.name}
            </button>
          );
        })}
      </div>
    </OfferOptionStep>
  );
}

function SectorChoiceStep({
  step,
  title,
  options,
  value,
  onChange,
}: {
  step: number;
  title: string;
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  if (!options.length) return null;
  return (
    <OfferOptionStep step={step} title={title}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary bg-primary/5 font-medium text-primary"
                  : "border-border hover:bg-muted",
              )}
              aria-pressed={active}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </OfferOptionStep>
  );
}

function QuantityStep({
  step,
  value,
  onChange,
}: {
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <OfferOptionStep step={step} title="Escolha a quantidade">
      <div className="inline-flex items-center rounded-lg border">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(Math.max(1, value - 1))}
          aria-label="Diminuir"
          className="h-9 w-9"
        >
          −
        </Button>
        <span className="w-10 text-center text-sm font-medium">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(value + 1)}
          aria-label="Aumentar"
          className="h-9 w-9"
        >
          +
        </Button>
      </div>
    </OfferOptionStep>
  );
}

/* ────────── helpers ────────── */

function extractSectorList(
  config: OfferPageConfig,
  key: string,
  defaults: string[],
): string[] {
  const raw = (config.sectorConfig || {})[key];
  if (Array.isArray(raw) && raw.every((x) => typeof x === "string")) {
    return raw as string[];
  }
  return defaults;
}
