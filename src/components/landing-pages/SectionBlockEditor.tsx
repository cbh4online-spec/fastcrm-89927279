import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, GripVertical, Plus, Figma } from "lucide-react";
import type { BuilderBlock, BuilderBlockType } from "@/lib/figmaSectionMapper";
import { BLOCK_TYPE_LABELS, BLOCK_TYPE_ICONS } from "@/lib/figmaSectionMapper";

interface SectionBlockEditorProps {
  section: BuilderBlock;
  onSave: (id: string, content: Record<string, unknown>, sectionName?: string) => void;
  onDelete: (id: string) => void;
  isSaving?: boolean;
}

export function SectionBlockEditor({ section, onSave, onDelete, isSaving }: SectionBlockEditorProps) {
  const [content, setContent] = useState<Record<string, unknown>>(section.content || {});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setContent(section.content || {});
    setDirty(false);
  }, [section.id, section.updated_at]);

  const update = useCallback((key: string, value: unknown) => {
    setContent(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const updateItem = useCallback((key: string, index: number, field: string, value: string) => {
    setContent(prev => {
      const items = [...((prev[key] as Array<Record<string, string>>) || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [key]: items };
    });
    setDirty(true);
  }, []);

  const addItem = useCallback((key: string, template: Record<string, string>) => {
    setContent(prev => {
      const items = [...((prev[key] as Array<Record<string, string>>) || []), template];
      return { ...prev, [key]: items };
    });
    setDirty(true);
  }, []);

  const removeItem = useCallback((key: string, index: number) => {
    setContent(prev => {
      const items = ((prev[key] as Array<Record<string, string>>) || []).filter((_, i) => i !== index);
      return { ...prev, [key]: items };
    });
    setDirty(true);
  }, []);

  const icon = BLOCK_TYPE_ICONS[section.block_type as BuilderBlockType] || "📋";
  const label = BLOCK_TYPE_LABELS[section.block_type as BuilderBlockType] || section.block_type;

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <span className="text-lg">{icon}</span>
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            {section.section_name && (
              <span className="text-xs text-muted-foreground">— {section.section_name}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {section.auto_generated && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Figma className="h-3 w-3" />
                Auto-gerado
              </Badge>
            )}
            {section.mapping_confidence === "low" && (
              <Badge variant="secondary" className="text-[10px]">Fallback</Badge>
            )}
            {dirty && (
              <Button size="sm" variant="ghost" onClick={() => onSave(section.id, content)} disabled={isSaving}>
                <Save className="h-3.5 w-3.5 mr-1" />
                Guardar
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(section.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {renderBlockFields(section.block_type as BuilderBlockType, content, update, updateItem, addItem, removeItem)}
      </CardContent>
    </Card>
  );
}

function renderBlockFields(
  blockType: BuilderBlockType,
  content: Record<string, unknown>,
  update: (key: string, value: unknown) => void,
  updateItem: (key: string, index: number, field: string, value: string) => void,
  addItem: (key: string, template: Record<string, string>) => void,
  removeItem: (key: string, index: number) => void,
) {
  switch (blockType) {
    case "hero":
      return (
        <div className="space-y-3">
          <Field label="Headline" value={content.headline as string} onChange={v => update("headline", v)} />
          <Field label="Subheadline" value={content.subheadline as string} onChange={v => update("subheadline", v)} multiline />
          <Field label="CTA Principal" value={(content.primary_cta as Record<string, string>)?.label || ""} onChange={v => update("primary_cta", { ...(content.primary_cta as Record<string, string> || {}), label: v })} />
          <Field label="Media URL" value={content.media as string} onChange={v => update("media", v)} />
        </div>
      );
    case "features_grid":
      return (
        <div className="space-y-3">
          <Field label="Título da Secção" value={content.title as string} onChange={v => update("title", v)} />
          <ItemList
            label="Features"
            items={(content.items as Array<Record<string, string>>) || []}
            fields={["title", "description"]}
            onUpdate={(i, f, v) => updateItem("items", i, f, v)}
            onAdd={() => addItem("items", { title: "", description: "" })}
            onRemove={i => removeItem("items", i)}
          />
        </div>
      );
    case "cta_banner":
      return (
        <div className="space-y-3">
          <Field label="Headline" value={content.headline as string} onChange={v => update("headline", v)} />
          <Field label="Texto de suporte" value={content.supporting_text as string} onChange={v => update("supporting_text", v)} multiline />
          <Field label="Texto do botão" value={content.button_label as string} onChange={v => update("button_label", v)} />
          <Field label="Link do botão" value={content.button_link as string} onChange={v => update("button_link", v)} />
        </div>
      );
    case "testimonials":
      return (
        <div className="space-y-3">
          <Field label="Título" value={content.title as string} onChange={v => update("title", v)} />
          <ItemList
            label="Testemunhos"
            items={(content.items as Array<Record<string, string>>) || []}
            fields={["name", "role", "quote"]}
            onUpdate={(i, f, v) => updateItem("items", i, f, v)}
            onAdd={() => addItem("items", { name: "", role: "", quote: "" })}
            onRemove={i => removeItem("items", i)}
          />
        </div>
      );
    case "faq_accordion":
      return (
        <div className="space-y-3">
          <Field label="Título" value={content.title as string} onChange={v => update("title", v)} />
          <ItemList
            label="Perguntas"
            items={(content.items as Array<Record<string, string>>) || []}
            fields={["question", "answer"]}
            onUpdate={(i, f, v) => updateItem("items", i, f, v)}
            onAdd={() => addItem("items", { question: "", answer: "" })}
            onRemove={i => removeItem("items", i)}
          />
        </div>
      );
    case "pricing_cards":
      return (
        <div className="space-y-3">
          <Field label="Título" value={content.title as string} onChange={v => update("title", v)} />
          <ItemList
            label="Planos"
            items={(content.plans as Array<Record<string, string>>) || []}
            fields={["name", "price", "cta"]}
            onUpdate={(i, f, v) => updateItem("plans", i, f, v)}
            onAdd={() => addItem("plans", { name: "", price: "", cta: "Select" })}
            onRemove={i => removeItem("plans", i)}
          />
        </div>
      );
    case "lead_form":
      return (
        <div className="space-y-3">
          <Field label="Título" value={content.title as string} onChange={v => update("title", v)} />
          <Field label="Descrição" value={content.description as string} onChange={v => update("description", v)} multiline />
          <Field label="Texto do botão" value={content.cta as string} onChange={v => update("cta", v)} />
        </div>
      );
    case "split_content":
      return (
        <div className="space-y-3">
          <Field label="Headline" value={content.headline as string} onChange={v => update("headline", v)} />
          <Field label="Corpo" value={content.body as string} onChange={v => update("body", v)} multiline />
          <Field label="Media URL" value={content.media as string} onChange={v => update("media", v)} />
        </div>
      );
    case "logo_strip":
      return (
        <div className="space-y-3">
          <Field label="Título" value={content.title as string} onChange={v => update("title", v)} />
        </div>
      );
    case "rich_text":
    default:
      return (
        <div className="space-y-3">
          <Field label="Título" value={content.title as string} onChange={v => update("title", v)} />
          <Field label="Corpo" value={content.body as string} onChange={v => update("body", v)} multiline />
        </div>
      );
  }
}

function Field({ label, value, onChange, multiline }: { label: string; value: string | undefined; onChange: (v: string) => void; multiline?: boolean }) {
  const Component = multiline ? Textarea : Input;
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Component
        value={value || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)}
        className="text-sm"
        {...(multiline ? { rows: 2 } : {})}
      />
    </div>
  );
}

function ItemList({
  label,
  items,
  fields,
  onUpdate,
  onAdd,
  onRemove,
}: {
  label: string;
  items: Array<Record<string, string>>;
  fields: string[];
  onUpdate: (index: number, field: string, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="border rounded-md p-2 space-y-1.5 relative">
          {fields.map(f => (
            <Input
              key={f}
              placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
              value={item[f] || ""}
              onChange={e => onUpdate(i, f, e.target.value)}
              className="text-xs h-8"
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0 text-destructive"
            onClick={() => onRemove(i)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
