import React from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PricingRulesPanelProps {
  pricingMode: string;
  onPricingModeChange: (mode: string) => void;
  globalDiscount: number | undefined;
  onGlobalDiscountChange: (v: number | undefined) => void;
  marginPercent: number | undefined;
  onMarginPercentChange: (v: number | undefined) => void;
  basePriceField: string;
  onBasePriceFieldChange: (v: string) => void;
  priceIsPerPack: boolean;
  onPriceIsPerPackChange: (v: boolean) => void;
}

const PRICING_MODES = [
  { value: "NET_PRICE_ONLY", label: "Preço Net (custo)" },
  { value: "RRP_ONLY", label: "PVP / Preço Recomendado" },
  { value: "NET_AND_RRP", label: "Net + PVP" },
  { value: "DISCOUNT_GLOBAL", label: "Desconto Global %" },
  { value: "DISCOUNT_BY_CATEGORY", label: "Desconto por Categoria" },
  { value: "MARGIN_RULE", label: "Regra de Margem" },
];

export function PricingRulesPanel({
  pricingMode, onPricingModeChange,
  globalDiscount, onGlobalDiscountChange,
  marginPercent, onMarginPercentChange,
  basePriceField, onBasePriceFieldChange,
  priceIsPerPack, onPriceIsPerPackChange,
}: PricingRulesPanelProps) {
  const showDiscount = ["RRP_ONLY", "DISCOUNT_GLOBAL", "DISCOUNT_BY_CATEGORY"].includes(pricingMode);
  const showMargin = pricingMode === "MARGIN_RULE";
  const showBaseField = ["DISCOUNT_GLOBAL", "DISCOUNT_BY_CATEGORY"].includes(pricingMode);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <Label className="text-sm font-medium">Tipo de Tabela de Preços</Label>
        <Select value={pricingMode} onValueChange={onPricingModeChange}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRICING_MODES.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showDiscount && (
        <div>
          <Label className="text-sm">Desconto Global (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={globalDiscount ?? ""}
            onChange={e => onGlobalDiscountChange(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="Ex: 35"
            className="mt-1"
          />
        </div>
      )}

      {showMargin && (
        <div>
          <Label className="text-sm">Margem (%)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={marginPercent ?? ""}
            onChange={e => onMarginPercentChange(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="Ex: 40"
            className="mt-1"
          />
        </div>
      )}

      {showBaseField && (
        <div>
          <Label className="text-sm">Campo base do preço</Label>
          <Select value={basePriceField} onValueChange={onBasePriceFieldChange}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="net_price">Preço Net</SelectItem>
              <SelectItem value="rrp_price">PVP / RRP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch checked={priceIsPerPack} onCheckedChange={onPriceIsPerPackChange} />
        <Label className="text-sm">Preço é por pack/caixa (dividir por pack_size)</Label>
      </div>
    </div>
  );
}
