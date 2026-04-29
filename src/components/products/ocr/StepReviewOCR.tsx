import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConfidenceBadge, OriginBadge } from "./ConfidenceBadge";
import type { OCRDocument, OCRStructuredData } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  doc: OCRDocument;
  data: OCRStructuredData;
  onChange: (data: OCRStructuredData) => void;
}

const SECTIONS = [
  { key: "general", title: "Informação geral", fields: ["name", "commercial_name", "brand", "product_line", "product_type", "category", "subcategory"] },
  { key: "identification", title: "Identificação", fields: ["ean", "sku", "volume", "unit", "origin_country", "distributor"] },
  { key: "description", title: "Descrição", fields: ["short", "long"] },
  { key: "usage", title: "Modo de uso e precauções", fields: ["instructions", "precautions"] },
  { key: "composition", title: "Composição", fields: ["ingredients"] },
  { key: "commercial", title: "Notas comerciais", fields: ["positioning", "ideal_customer", "sensory_notes", "olfactory_notes"] },
] as const;

const FIELD_LABELS: Record<string, string> = {
  name: "Nome", commercial_name: "Nome comercial", brand: "Marca", product_line: "Linha",
  product_type: "Tipo", category: "Categoria", subcategory: "Subcategoria",
  ean: "EAN", sku: "SKU", volume: "Volume/peso", unit: "Unidade",
  origin_country: "País de origem", distributor: "Distribuidor",
  short: "Descrição curta", long: "Descrição longa",
  instructions: "Instruções de uso", precautions: "Precauções",
  ingredients: "Ingredientes",
  positioning: "Posicionamento", ideal_customer: "Cliente ideal",
  sensory_notes: "Notas sensoriais", olfactory_notes: "Notas olfativas",
};

export function StepReviewOCR({ doc, data, onChange }: Props) {
  const updateField = (section: string, field: string, value: string) => {
    onChange({
      ...data,
      [section]: {
        ...((data as Record<string, Record<string, unknown>>)[section] ?? {}),
        [field]: value,
      },
    } as OCRStructuredData);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Passo 2 — Revisão da extração</CardTitle>
          <CardDescription>Edita qualquer campo. Marca de confiança baseada na leitura da IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {SECTIONS.map((sec) => (
            <div key={sec.key}>
              <h3 className="font-semibold text-sm mb-3 pb-1 border-b">{sec.title}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {sec.fields.map((f) => {
                  const sectionData = (data as Record<string, Record<string, unknown>>)[sec.key] ?? {};
                  const value = (sectionData[f] as string | null | undefined) ?? "";
                  const conf = doc.field_confidence?.[f];
                  const isLong = ["long", "instructions", "precautions", "ingredients", "positioning"].includes(f);
                  return (
                    <div key={f} className={isLong ? "sm:col-span-2" : ""}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Label className="text-xs">{FIELD_LABELS[f] ?? f}</Label>
                        <div className="flex gap-1">
                          <OriginBadge origin={value ? "document" : "pending"} />
                          <ConfidenceBadge level={conf} />
                        </div>
                      </div>
                      {isLong ? (
                        <Textarea
                          rows={3}
                          value={value}
                          onChange={(e) => updateField(sec.key, f, e.target.value)}
                          placeholder="Pendente de validação"
                        />
                      ) : (
                        <Input
                          value={value}
                          onChange={(e) => updateField(sec.key, f, e.target.value)}
                          placeholder="Pendente de validação"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Texto OCR bruto</CardTitle>
          <CardDescription>
            Confiança geral: <strong>{doc.ocr_confidence != null ? `${Number(doc.ocr_confidence)}%` : "—"}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] rounded border bg-muted/20 p-3">
            <pre className="text-xs whitespace-pre-wrap font-mono">{data.ocr_raw_text || "—"}</pre>
          </ScrollArea>
          {data.notes && (
            <p className="text-xs text-muted-foreground mt-3 italic">Notas IA: {data.notes}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
