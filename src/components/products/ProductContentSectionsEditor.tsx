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

const SECTION_ICONS: Record<ProductSectionKey, any> = {
  overview: FileText,
  how_to_use: BookOpen,
  specifications: ListChecks,
  clinical: Stethoscope,
};

const SECTION_HINTS: Record<ProductSectionKey, string> = {
  overview: "Resumo comercial: para que serve, benefícios principais, posicionamento.",
  how_to_use: "Instruções passo a passo, frequência, posologia ou modo de aplicação.",
  specifications: "Atributos técnicos: ingredientes, dimensões, capacidade, INCI, etc.",
  clinical: "Contraindicações, interacções, precauções, evidência clínica.",
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
          Secções consultáveis individualmente pelo Copilot B2B. Cada secção tem texto e atributos chave/valor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4">
            {SECTION_ORDER.map((key) => {
              const Icon = SECTION_ICONS[key];
              const filled = !!sections[key]?.body_markdown || Object.keys(sections[key]?.attributes || {}).length > 0;
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

function SectionEditor({ hint, initialBody, initialAttributes, source, onSave, saving }: SectionEditorProps) {
  const [body, setBody] = useState(initialBody);
  const [attrs, setAttrs] = useState<Array<{ key: string; value: string }>>(
    Object.entries(initialAttributes).map(([k, v]) => ({
      key: k,
      value: typeof v === "string" ? v : JSON.stringify(v),
    })),
  );

  // Reset quando muda de produto/secção
  useEffect(() => {
    setBody(initialBody);
    setAttrs(
      Object.entries(initialAttributes).map(([k, v]) => ({
        key: k,
        value: typeof v === "string" ? v : JSON.stringify(v),
      })),
    );
  }, [initialBody, initialAttributes]);

  const handleSave = () => {
    const cleanAttrs: Record<string, any> = {};
    attrs.forEach((a) => {
      const k = a.key.trim();
      if (k) cleanAttrs[k] = a.value;
    });
    onSave(body, cleanAttrs);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{hint}</p>
        {source && source !== "manual" && (
          <Badge variant="outline" className="gap-1 shrink-0">
            {source === "ai_autofill" && <Sparkles className="h-3 w-3" />}
            {source}
          </Badge>
        )}
      </div>

      <div>
        <Label>Texto (markdown)</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Descreva esta secção em markdown…"
          className="font-mono text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Atributos estruturados</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAttrs([...attrs, { key: "", value: "" }])}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
        {attrs.length === 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            Ex: ingrediente_principal: ácido hialurónico · volume_ml: 30 · ph: 5.5
          </p>
        )}
        <div className="space-y-2">
          {attrs.map((a, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                placeholder="chave"
                value={a.key}
                onChange={(e) => {
                  const next = [...attrs];
                  next[idx] = { ...next[idx], key: e.target.value };
                  setAttrs(next);
                }}
                className="max-w-[200px]"
              />
              <Input
                placeholder="valor"
                value={a.value}
                onChange={(e) => {
                  const next = [...attrs];
                  next[idx] = { ...next[idx], value: e.target.value };
                  setAttrs(next);
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setAttrs(attrs.filter((_, i) => i !== idx))}
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
