import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const IMPORTABLE_FIELDS = [
  { key: "supplier_sku", label: "SKU Fornecedor", required: false },
  { key: "barcode", label: "Barcode / EAN", required: false },
  { key: "product_name", label: "Nome do Produto", required: true },
  { key: "net_price", label: "Preço Net", required: false },
  { key: "rrp_price", label: "PVP / RRP", required: false },
  { key: "discount_percent", label: "Desconto %", required: false },
  { key: "pack_size", label: "Pack Size", required: false },
  { key: "min_order_qty", label: "Qtd. Mínima", required: false },
  { key: "lead_time_days", label: "Prazo Entrega (dias)", required: false },
  { key: "category", label: "Categoria", required: false },
  { key: "notes", label: "Notas", required: false },
];

interface ImportColumnMapperProps {
  columns: string[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  sampleRows: Record<string, unknown>[];
}

export function ImportColumnMapper({ columns, mapping, onMappingChange, sampleRows }: ImportColumnMapperProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Mapeamento de Colunas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Associe as colunas do ficheiro aos campos do sistema. Campos com * são recomendados.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {IMPORTABLE_FIELDS.map(field => (
            <div key={field.key} className="flex items-center gap-3">
              <Label className="text-sm min-w-[140px] flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={mapping[field.key] || "__none__"}
                onValueChange={v => onMappingChange({ ...mapping, [field.key]: v === "__none__" ? "" : v })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="— Ignorar —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Ignorar —</SelectItem>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          <Badge variant="outline">{columns.length} colunas detetadas</Badge>
          <Badge variant="outline">{Object.values(mapping).filter(Boolean).length} mapeadas</Badge>
        </div>

        {/* Sample rows */}
        {sampleRows.length > 0 && (
          <div className="mt-4">
            <Label className="text-sm mb-2 block">Amostra (primeiras 5 linhas)</Label>
            <div className="border rounded overflow-auto max-h-48 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted">
                    {columns.map(col => (
                      <th key={col} className="px-2 py-1 text-left font-medium whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {columns.map(col => (
                        <td key={col} className="px-2 py-1 truncate max-w-[120px]">{String((row as any)[col] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
