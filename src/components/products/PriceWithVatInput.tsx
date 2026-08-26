import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { grossFromNet, netFromGross, round2 } from "@/utils/productPricing";

const PRESET_RATES = ["23", "13", "6", "0"];

export interface PriceWithVatInputProps {
  /** Valor guardado em `base_price` (string do formulário). */
  basePrice: string;
  onBasePriceChange: (value: string) => void;
  /** Se true, `base_price` está com IVA incluído. */
  taxIncluded: boolean;
  onTaxIncludedChange: (value: boolean) => void;
  /** Taxa de IVA em percentagem (string do formulário). */
  vatRate: string;
  onVatRateChange: (value: string) => void;
  currency: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/** Aceita vírgula decimal (pt-PT) e devolve número. */
function parseAmount(raw: string): number {
  const normalized = (raw ?? "").toString().trim().replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value: number): string {
  if (!value) return "";
  return String(round2(value));
}

export function PriceWithVatInput({
  basePrice,
  onBasePriceChange,
  taxIncluded,
  onTaxIncludedChange,
  vatRate,
  onVatRateChange,
  currency,
  label = "Preço",
  required,
  disabled,
  placeholder = "0.00",
}: PriceWithVatInputProps) {
  // Campo em edição: mantém o texto tal como o utilizador o escreveu, para
  // evitar derivas de arredondamento enquanto escreve.
  const [editing, setEditing] = useState<"net" | "gross" | null>(null);
  const [editingText, setEditingText] = useState("");

  const rate = parseAmount(vatRate);
  const stored = parseAmount(basePrice);

  const netValue = taxIncluded ? netFromGross(stored, rate) : stored;
  const grossValue = taxIncluded ? stored : grossFromNet(stored, rate);
  const vatValue = round2(grossValue - netValue);

  const netText = editing === "net" ? editingText : formatAmount(netValue);
  const grossText = editing === "gross" ? editingText : formatAmount(grossValue);

  const handleNetChange = (raw: string) => {
    setEditing("net");
    setEditingText(raw);
    const net = parseAmount(raw);
    if (!raw.trim()) {
      onBasePriceChange("");
      return;
    }
    onBasePriceChange(String(taxIncluded ? round2(grossFromNet(net, rate)) : round2(net)));
  };

  const handleGrossChange = (raw: string) => {
    setEditing("gross");
    setEditingText(raw);
    const gross = parseAmount(raw);
    if (!raw.trim()) {
      onBasePriceChange("");
      return;
    }
    onBasePriceChange(String(taxIncluded ? round2(gross) : round2(netFromGross(gross, rate))));
  };

  const handleTaxIncludedChange = (next: boolean) => {
    setEditing(null);
    // Mantém os valores apresentados: o que muda é apenas qual deles é guardado.
    onBasePriceChange(String(next ? round2(grossValue) : round2(netValue)));
    onTaxIncludedChange(next);
  };

  const handleRateChange = (next: string) => {
    setEditing(null);
    onVatRateChange(next);
    // A taxa nova recalcula o outro lado a partir do valor guardado — o valor
    // introduzido pelo utilizador (base_price) mantém-se intacto.
  };

  const money = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: currency || "EUR" }).format(v);

  const isCustomRate = !PRESET_RATES.includes(vatRate) && vatRate !== "";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-2">
          <Label htmlFor="priceNet">
            {label} sem IVA {required ? "*" : ""}
          </Label>
          <Input
            id="priceNet"
            type="text"
            inputMode="decimal"
            value={netText}
            onChange={(e) => handleNetChange(e.target.value)}
            onBlur={() => setEditing(null)}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2 sm:w-32">
          <Label htmlFor="priceVatRate">IVA</Label>
          {isCustomRate ? (
            <div className="flex gap-1">
              <Input
                id="priceVatRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={vatRate}
                onChange={(e) => handleRateChange(e.target.value)}
                disabled={disabled}
              />
              <span className="self-center text-sm text-muted-foreground">%</span>
            </div>
          ) : (
            <Select value={vatRate || "23"} onValueChange={handleRateChange} disabled={disabled}>
              <SelectTrigger id="priceVatRate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="23">23%</SelectItem>
                <SelectItem value="13">13%</SelectItem>
                <SelectItem value="6">6%</SelectItem>
                <SelectItem value="0">0% / Isento</SelectItem>
                <SelectItem value="__custom__">Outra…</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceGross">{label} com IVA</Label>
          <Input
            id="priceGross"
            type="text"
            inputMode="decimal"
            value={grossText}
            onChange={(e) => handleGrossChange(e.target.value)}
            onBlur={() => setEditing(null)}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {money(netValue)} s/IVA · {money(vatValue)} IVA · <span className="font-medium text-foreground">{money(grossValue)} c/IVA</span>
        </p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={taxIncluded}
            onCheckedChange={handleTaxIncludedChange}
            disabled={disabled}
            aria-label="Preço base inclui IVA"
          />
          Preço base inclui IVA
        </label>
      </div>
    </div>
  );
}

/** Resolve o valor especial "Outra…" do selector de taxa. */
export function resolveVatRateSelection(value: string, currentRate: string): string {
  if (value === "__custom__") {
    // Entra em modo livre com um valor que não coincide com os presets.
    return currentRate && !PRESET_RATES.includes(currentRate) ? currentRate : "23.5";
  }
  return value;
}
