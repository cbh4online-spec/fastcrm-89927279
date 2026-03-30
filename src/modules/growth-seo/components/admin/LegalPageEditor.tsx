import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Plus, Trash2, ArrowUp, ArrowDown, Info } from "lucide-react";
import { useLegalPageContent, type LegalPageKey, type LegalPageData, type LegalSection, LEGAL_PAGE_LABELS } from "../../hooks/useLegalPageContent";
import { DEFAULT_LEGAL_PAGES } from "./legalPageDefaults";

interface LegalPageEditorProps {
  pageKey: LegalPageKey;
}

export function LegalPageEditor({ pageKey }: LegalPageEditorProps) {
  const { pageData, isLoading, savePageData } = useLegalPageContent(pageKey);
  const defaults = DEFAULT_LEGAL_PAGES[pageKey];

  const [form, setForm] = useState<LegalPageData>(defaults);

  useEffect(() => {
    if (pageData) {
      setForm(pageData);
    } else if (defaults) {
      setForm(defaults);
    }
  }, [pageData]);

  const handleMetaChange = (field: keyof Omit<LegalPageData, 'sections'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSectionChange = (index: number, field: keyof LegalSection, value: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const addSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, { title: "", content: "" }],
    }));
  };

  const removeSection = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= form.sections.length) return;
    setForm((prev) => {
      const sections = [...prev.sections];
      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      return { ...prev, sections };
    });
  };

  const handleSave = () => {
    savePageData.mutate(form);
  };

  const handleReset = () => {
    setForm(defaults);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metadados — {LEGAL_PAGE_LABELS[pageKey]}</CardTitle>
          <CardDescription>Título, descrição SEO e data de atualização.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título da Página</Label>
            <Input value={form.title} onChange={(e) => handleMetaChange("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Meta Description (SEO)</Label>
            <Input value={form.description} onChange={(e) => handleMetaChange("description", e.target.value)} />
          </div>
          <div className="space-y-2 md:w-1/3">
            <Label>Última Atualização</Label>
            <Input value={form.lastUpdated} onChange={(e) => handleMetaChange("lastUpdated", e.target.value)} placeholder="Ex: 30 de março de 2026" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 px-1 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>
          Variáveis disponíveis: <code className="bg-muted px-1 rounded">{"{{company_name}}"}</code>{" "}
          <code className="bg-muted px-1 rounded">{"{{email_dpo}}"}</code>{" "}
          <code className="bg-muted px-1 rounded">{"{{email_general}}"}</code>{" "}
          <code className="bg-muted px-1 rounded">{"{{address}}"}</code>{" "}
          <code className="bg-muted px-1 rounded">{"{{nif}}"}</code>{" "}
          <code className="bg-muted px-1 rounded">{"{{phone}}"}</code>
        </span>
      </div>

      {form.sections.map((section, index) => (
        <Card key={index}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-8">#{index + 1}</span>
              <Input
                className="font-medium"
                value={section.title}
                onChange={(e) => handleSectionChange(index, "title", e.target.value)}
                placeholder="Título da secção"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => moveSection(index, 1)} disabled={index === form.sections.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => removeSection(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <Textarea
              value={section.content}
              onChange={(e) => handleSectionChange(index, "content", e.target.value)}
              placeholder="Conteúdo HTML da secção..."
              rows={8}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={addSection}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Secção
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
          Repor conteúdo original
        </Button>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t">
        <Button onClick={handleSave} disabled={savePageData.isPending}>
          {savePageData.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Página
        </Button>
        <p className="text-xs text-muted-foreground">
          As alterações são refletidas imediatamente na página pública.
        </p>
      </div>
    </div>
  );
}
