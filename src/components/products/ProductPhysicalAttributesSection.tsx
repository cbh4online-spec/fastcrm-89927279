import { useState } from "react";
import { Package, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type VolumeUnit = "ml" | "L" | "g" | "kg" | "oz";

export interface PhysicalAttributesValue {
  weightNet: string;
  weightGross: string;
  volumeValue: string;
  volumeUnit: VolumeUnit | "";
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  packageType: string;
}

export const EMPTY_PHYSICAL: PhysicalAttributesValue = {
  weightNet: "",
  weightGross: "",
  volumeValue: "",
  volumeUnit: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  packageType: "",
};

const PACKAGE_TYPES = [
  { value: "frasco", label: "Frasco" },
  { value: "bisnaga", label: "Bisnaga / Tubo" },
  { value: "ampola", label: "Ampola" },
  { value: "spray", label: "Spray / Aerossol" },
  { value: "saqueta", label: "Saqueta" },
  { value: "blister", label: "Blister" },
  { value: "caixa", label: "Caixa" },
  { value: "balde", label: "Balde / Garrafão" },
  { value: "outro", label: "Outro" },
];

interface Props {
  value: PhysicalAttributesValue;
  onChange: (next: PhysicalAttributesValue) => void;
  /** Por defeito a secção começa fechada quando vazia, aberta quando há dados. */
  defaultOpen?: boolean;
}

export function ProductPhysicalAttributesSection({ value, onChange, defaultOpen }: Props) {
  const hasData =
    !!value.weightNet ||
    !!value.weightGross ||
    !!value.volumeValue ||
    !!value.lengthCm ||
    !!value.widthCm ||
    !!value.heightCm ||
    !!value.packageType;

  const [open, setOpen] = useState<boolean>(defaultOpen ?? hasData);

  const update = (patch: Partial<PhysicalAttributesValue>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
          <span className="text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4" />
            Atributos físicos (frascos, peso, dimensões)
            {hasData && (
              <span className="text-xs text-primary font-medium ml-1">• preenchidos</span>
            )}
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 pt-4">
        <Alert className="bg-muted/40">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Útil para frascos líquidos, ficha técnica e cálculo de portes. Para várias capacidades
            do mesmo produto (ex.: 100 ml, 250 ml, 500 ml) podes usar variantes ou criar produtos
            separados — esta secção descreve a embalagem deste produto.
          </AlertDescription>
        </Alert>

        {/* Capacidade / Volume */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Capacidade / Conteúdo</Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="Ex.: 250"
                value={value.volumeValue}
                onChange={(e) => update({ volumeValue: e.target.value })}
                aria-label="Valor da capacidade"
              />
            </div>
            <Select
              value={value.volumeUnit || ""}
              onValueChange={(v) => update({ volumeUnit: v as VolumeUnit })}
            >
              <SelectTrigger aria-label="Unidade de capacidade">
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="L">L</SelectItem>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="oz">oz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Exemplo típico: shampoo 250 ml, creme 50 g.
          </p>
        </div>

        {/* Tipo de embalagem */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de embalagem</Label>
          <Select
            value={value.packageType || ""}
            onValueChange={(v) => update({ packageType: v })}
          >
            <SelectTrigger aria-label="Tipo de embalagem">
              <SelectValue placeholder="Selecionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {PACKAGE_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>
                  {pt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pesos */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Peso</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="weight_net" className="text-xs text-muted-foreground">
                Líquido (kg)
              </Label>
              <Input
                id="weight_net"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                placeholder="Ex.: 0.250"
                value={value.weightNet}
                onChange={(e) => update({ weightNet: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="weight_gross" className="text-xs text-muted-foreground">
                Bruto c/ embalagem (kg)
              </Label>
              <Input
                id="weight_gross"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                placeholder="Ex.: 0.310"
                value={value.weightGross}
                onChange={(e) => update({ weightGross: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O peso bruto é usado pelos cálculos de portes.
          </p>
        </div>

        {/* Dimensões */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Dimensões da embalagem (cm)</Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="height_cm" className="text-xs text-muted-foreground">
                Altura
              </Label>
              <Input
                id="height_cm"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="cm"
                value={value.heightCm}
                onChange={(e) => update({ heightCm: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="width_cm" className="text-xs text-muted-foreground">
                Largura
              </Label>
              <Input
                id="width_cm"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="cm"
                value={value.widthCm}
                onChange={(e) => update({ widthCm: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="length_cm" className="text-xs text-muted-foreground">
                Profundidade
              </Label>
              <Input
                id="length_cm"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="cm"
                value={value.lengthCm}
                onChange={(e) => update({ lengthCm: e.target.value })}
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Converte estado UI (strings) para payload tipado para a BD. */
export function physicalToPayload(v: PhysicalAttributesValue) {
  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  return {
    weight_net: num(v.weightNet),
    weight_gross: num(v.weightGross),
    volume_value: num(v.volumeValue),
    volume_unit: v.volumeUnit ? v.volumeUnit : null,
    length_cm: num(v.lengthCm),
    width_cm: num(v.widthCm),
    height_cm: num(v.heightCm),
    package_type: v.packageType?.trim() ? v.packageType.trim() : null,
  };
}

/** Hidrata estado UI a partir de um produto vindo da BD. */
export function physicalFromProduct(p: Record<string, any> | null | undefined): PhysicalAttributesValue {
  if (!p) return EMPTY_PHYSICAL;
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return {
    weightNet: s(p.weight_net),
    weightGross: s(p.weight_gross),
    volumeValue: s(p.volume_value),
    volumeUnit: (p.volume_unit ?? "") as VolumeUnit | "",
    lengthCm: s(p.length_cm),
    widthCm: s(p.width_cm),
    heightCm: s(p.height_cm),
    packageType: s(p.package_type),
  };
}
