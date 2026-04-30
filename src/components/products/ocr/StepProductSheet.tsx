import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Badge } from "@/components/ui/badge";
import type { ConfidenceLevel, ProductSheetData } from "./types";

interface Props {
  sheet: ProductSheetData;
  onChange: (s: ProductSheetData) => void;
  fieldConfidence: Record<string, ConfidenceLevel>;
}

interface FieldProps {
  label: string;
  k: keyof ProductSheetData;
  conf?: string;
  type?: string;
  placeholder?: string;
  sheet: ProductSheetData;
  fieldConfidence: Record<string, ConfidenceLevel>;
  onChange: (s: ProductSheetData) => void;
}

function Field({ label, k, conf, type = "text", placeholder, sheet, fieldConfidence, onChange }: FieldProps) {
  const value = sheet[k];
  const displayValue =
    value === null || value === undefined || typeof value === "boolean" || typeof value === "object"
      ? ""
      : String(value);

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <Label className="text-xs">{label}</Label>
        {conf && <ConfidenceBadge level={fieldConfidence[conf] ?? "pending_validation"} />}
      </div>
      <Input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        step={type === "number" ? "any" : undefined}
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value;
          const next: any = type === "number"
            ? (raw === "" ? null : Number(raw.replace(",", ".")))
            : raw;
          onChange({ ...sheet, [k]: next });
        }}
        placeholder={placeholder ?? "Pendente de validação"}
      />
    </div>
  );
}

export function StepProductSheet({ sheet, onChange, fieldConfidence }: Props) {
  const set = <K extends keyof ProductSheetData>(k: K, v: ProductSheetData[K]) =>
    onChange({ ...sheet, [k]: v });

  const f = (label: string, k: keyof ProductSheetData, conf?: string, type?: string) => (
    <Field
      label={label}
      k={k}
      conf={conf}
      type={type}
      sheet={sheet}
      fieldConfidence={fieldConfidence}
      onChange={onChange}
    />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dados principais</CardTitle>
          <CardDescription>Identificação e classificação do produto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {f("Nome do produto *", "name", "name")}
          {f("Nome comercial", "commercial_name", "commercial_name")}
          {f("Marca", "brand", "brand")}
          {f("Linha", "line", "product_line")}
          {f("Categoria", "category", "category")}
          {f("Subcategoria", "subcategory", "subcategory")}
          {f("Tipo de produto", "product_type", "product_type")}
          {f("Volume / peso", "volume_text", "volume")}
          {f("Unidade de venda", "unit_of_sale", "unit")}
          {f("EAN", "barcode", "ean")}
          {f("SKU interno", "sku", "sku")}
          {f("País de origem", "origin_country", "origin_country")}
          {f("Distribuidor", "distributor", "distributor")}
          <div>
            <Label className="text-xs mb-1 block">Estado</Label>
            <Select value={sheet.status} onValueChange={(v) => set("status", v as ProductSheetData["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="pending_validation">Pendente de validação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados comerciais</CardTitle>
          <CardDescription>Preço, margem, stock e classificações comerciais.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {f("Preço de custo (€)", "direct_cost", undefined, "number")}
          {f("PVP (€)", "base_price", undefined, "number")}
          {f("IVA (%)", "tax_rate_estimate_pct", undefined, "number")}
          {f("Stock inicial", "stock_quantity", undefined, "number")}
          {f("Stock mínimo", "low_stock_threshold", undefined, "number")}

          <div className="sm:col-span-2 mt-2 pt-3 border-t space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Classificações comerciais (sugeridas pela IA — validar manualmente)</p>

            <SugToggle
              label="Produto sazonal"
              checked={sheet.is_seasonal}
              onChange={(v) => set("is_seasonal", v)}
              status={sheet.is_seasonal_validation_status}
              onStatus={(s) => set("is_seasonal_validation_status", s)}
            />
            <SugToggle
              label="Produto de impulso"
              checked={sheet.is_impulse_product}
              onChange={(v) => set("is_impulse_product", v)}
            />
            <SugToggle
              label="Recomendado para venda cruzada"
              checked={sheet.is_cross_sell}
              onChange={(v) => set("is_cross_sell", v)}
              status={sheet.is_cross_sell_validation_status}
              onStatus={(s) => set("is_cross_sell_validation_status", s)}
            />
            <SugToggle
              label="Candidato a kit"
              checked={sheet.is_kit_candidate}
              onChange={(v) => set("is_kit_candidate", v)}
              status={sheet.is_kit_candidate_validation_status}
              onStatus={(s) => set("is_kit_candidate_validation_status", s)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SugToggle({ label, checked, onChange, status, onStatus }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  status?: "pending" | "approved" | "rejected";
  onStatus?: (s: "pending" | "approved" | "rejected") => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30">
      <div className="flex items-center gap-3">
        <Switch checked={checked} onCheckedChange={onChange} />
        <span className="text-sm">{label}</span>
      </div>
      {checked && onStatus && (
        <div className="flex gap-1">
          {(["pending","approved","rejected"] as const).map((s) => (
            <Badge
              key={s}
              variant={status === s ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => onStatus(s)}
            >
              {s === "pending" ? "Pendente" : s === "approved" ? "Aprovado" : "Rejeitado"}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
