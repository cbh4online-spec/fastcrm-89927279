import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Save, Sparkles, FileText, BookOpen, ListChecks, Stethoscope } from "lucide-react";
import {
  useProductContentSections,
  SECTION_LABELS,
  SECTION_ORDER,
  type ProductSectionKey,
} from "@/hooks/products/useProductContentSections";
import { SECTION_FIELDS, getKnownKeys, type SectionField } from "./sections/sectionFieldsSchema";

const SECTION_ICONS: Record<ProductSectionKey, any> = {
  overview: FileText,
  how_to_use: BookOpen,
  specifications: ListChecks,
  clinical: Stethoscope,
};

const SECTION_HINTS: Record<ProductSectionKey, string> = {
  overview: "Resumo comercial: indicação, contraindicação resumida, público-alvo.",
  how_to_use: "Passos de uso, dose, frequência e advertências de aplicação.",
  specifications: "Ingredientes-chave e atributos técnicos (INCI, volume, pH…).",
  clinical: "Contraindicações detalhadas, advertências, precauções e interacções.",
};

interface Props {
  productId: string;
}

export function ProductContentSectionsEditor({ productId }: Props) {
  const { sections, isLoading, upsert } = useProductContentSections(productId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conteúdo estruturado</CardTitle>
        <CardDescription>
          Secções consultáveis individualmente pelo Copilot B2B. Cada campo é guardado de forma estruturada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4">
            {SECTION_ORDER.map((key) => {
              const Icon = SECTION_ICONS[key];
              const filled =
                !!sections[key]?.body_markdown ||
                Object.keys(sections[key]?.attributes || {}).length > 0;
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{SECTION_LABELS[key]}</span>
                  {filled && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">✓</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SECTION_ORDER.map((key) => (
            <TabsContent key={key} value={key} className="mt-6">
              <SectionEditor
                sectionKey={key}
                hint={SECTION_HINTS[key]}
                initialBody={sections[key]?.body_markdown || ""}
                initialAttributes={sections[key]?.attributes || {}}
                source={sections[key]?.source}
                onSave={(body, attributes) =>
                  upsert.mutate({ sectionKey: key, bodyMarkdown: body || null, attributes })
                }
                saving={upsert.isPending}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface SectionEditorProps {
  sectionKey: ProductSectionKey;
  hint: string;
  initialBody: string;
  initialAttributes: Record<string, any>;
  source?: string;
  onSave: (body: string, attributes: Record<string, any>) => void;
  saving: boolean;
}

/** Normaliza um valor vindo do jsonb para o formato esperado pelo input. */
function toFieldValue(field: SectionField, raw: any): string | string[] {
  if (field.type === "list") {
    if (Array.isArray(raw)) return raw.map((v) => String(v));
    if (typeof raw === "string" && raw.trim()) {
      // tolera valores antigos guardados como string com vírgulas ou newlines
      return raw.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }
  if (raw === undefined || raw === null) return "";
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}

function SectionEditor({
  sectionKey,
  hint,
  initialBody,
  initialAttributes,
  source,
  onSave,
  saving,
}: SectionEditorProps) {
  const fields = SECTION_FIELDS[sectionKey];
  const knownKeys = getKnownKeys(sectionKey);

  const [body, setBody] = useState(initialBody);
  const [knownValues, setKnownValues] = useState<Record<string, string | string[]>>({});
  const [extras, setExtras] = useState<Array<{ key: string; value: string }>>([]);

  useEffect(() => {
    setBody(initialBody);

    const next: Record<string, string | string[]> = {};
    fields.forEach((f) => {
      next[f.key] = toFieldValue(f, initialAttributes[f.key]);
    });
    setKnownValues(next);

    const extraEntries = Object.entries(initialAttributes)
      .filter(([k]) => !knownKeys.has(k))
      .map(([k, v]) => ({
        key: k,
        value: typeof v === "string" ? v : JSON.stringify(v),
      }));
    setExtras(extraEntries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBody, initialAttributes, sectionKey]);

  const updateKnown = (key: string, value: string | string[]) => {
    setKnownValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const cleanAttrs: Record<string, any> = {};

    fields.forEach((f) => {
      const v = knownValues[f.key];
      if (f.type === "list") {
        const arr = (Array.isArray(v) ? v : []).map((s) => s.trim()).filter(Boolean);
        if (arr.length) cleanAttrs[f.key] = arr;
      } else {
        const s = typeof v === "string" ? v.trim() : "";
        if (s) cleanAttrs[f.key] = s;
      }
    });

    extras.forEach((a) => {
      const k = a.key.trim();
      if (k) cleanAttrs[k] = a.value;
    });

    onSave(body, cleanAttrs);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{hint}</p>
        {source && source !== "manual" && (
          <Badge variant="outline" className="gap-1 shrink-0">
            {source === "ai_autofill" && <Sparkles className="h-3 w-3" />}
            {source}
          </Badge>
        )}
      </div>

      {/* Campos estruturados conhecidos */}
      <div className="space-y-4">
        {fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={knownValues[field.key] ?? (field.type === "list" ? [] : "")}
            onChange={(v) => updateKnown(field.key, v)}
          />
        ))}
      </div>

      {/* Texto livre (markdown) */}
      <div>
        <Label>Notas adicionais (markdown)</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Descrição livre opcional…"
          className="font-mono text-sm"
        />
      </div>

      {/* Atributos extra (chave/valor genéricos) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label>Atributos extra</Label>
            <p className="text-xs text-muted-foreground">
              Chaves personalizadas adicionais (ex: volume_ml, ph, INCI…).
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setExtras([...extras, { key: "", value: "" }])}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {extras.map((a, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                placeholder="chave"
                value={a.key}
                onChange={(e) => {
                  const next = [...extras];
                  next[idx] = { ...next[idx], key: e.target.value };
                  setExtras(next);
                }}
                className="max-w-[220px]"
              />
              <Input
                placeholder="valor"
                value={a.value}
                onChange={(e) => {
                  const next = [...extras];
                  next[idx] = { ...next[idx], value: e.target.value };
                  setExtras(next);
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setExtras(extras.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar secção
        </Button>
      </div>
    </div>
  );
}

interface FieldInputProps {
  field: SectionField;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  if (field.type === "list") {
    const items = Array.isArray(value) ? value : [];
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>{field.label}</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange([...items, ""])}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
        {field.hint && <p className="text-xs text-muted-foreground mb-2">{field.hint}</p>}
        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Sem entradas.</p>
          )}
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={item}
                placeholder={field.placeholder}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = e.target.value;
                  onChange(next);
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <Label>{field.label}</Label>
        {field.hint && <p className="text-xs text-muted-foreground mb-1">{field.hint}</p>}
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={field.placeholder}
        />
      </div>
    );
  }

  return (
    <div>
      <Label>{field.label}</Label>
      {field.hint && <p className="text-xs text-muted-foreground mb-1">{field.hint}</p>}
      <Input
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    </div>
  );
}
