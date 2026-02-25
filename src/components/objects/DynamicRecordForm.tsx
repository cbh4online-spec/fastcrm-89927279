import { useState, useEffect, useRef, useCallback } from "react";
import { CoreObjectField } from "@/hooks/useCoreObjectFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
  fields: CoreObjectField[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending?: boolean;
  initialData?: Record<string, unknown>;
  submitLabel?: string;
  onCancel?: () => void;
}

export function DynamicRecordForm({ fields, onSubmit, isPending, initialData, submitLabel = "Salvar", onCancel }: Props) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData || {});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus first field
    const timer = setTimeout(() => firstInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const setValue = (slug: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [slug]: value }));
  };

  const handleSubmit = useCallback(() => {
    for (const f of fields) {
      if (f.is_required && !formData[f.slug]) return;
    }
    onSubmit(formData);
  }, [fields, formData, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }, [handleSubmit, onCancel]);

  const renderField = (field: CoreObjectField, index: number) => {
    const val = formData[field.slug];
    const isFirst = index === 0;

    switch (field.field_type) {
      case "boolean":
        return (
          <div className="space-y-1.5" key={field.id}>
            <div className="flex items-center gap-2.5">
              <Switch checked={!!val} onCheckedChange={(v) => setValue(field.slug, v)} />
              <Label className="text-sm font-medium">{field.name}{field.is_required && <span className="text-destructive ml-0.5">*</span>}</Label>
            </div>
          </div>
        );

      case "select": {
        const options = (field.options as any)?.options || [];
        return (
          <div className="space-y-1.5" key={field.id}>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {field.name}{field.is_required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Select value={(val as string) || ""} onValueChange={(v) => setValue(field.slug, v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      }

      case "number":
        return (
          <div className="space-y-1.5" key={field.id}>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {field.name}{field.is_required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Input
              ref={isFirst ? firstInputRef : undefined}
              type="number"
              value={(val as number) ?? ""}
              onChange={(e) => setValue(field.slug, e.target.value ? Number(e.target.value) : null)}
              placeholder={field.name}
              className="h-9"
            />
          </div>
        );

      case "date":
        return (
          <div className="space-y-1.5" key={field.id}>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {field.name}{field.is_required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Input
              type="date"
              value={(val as string) || ""}
              onChange={(e) => setValue(field.slug, e.target.value)}
              className="h-9"
            />
          </div>
        );

      case "email":
        return (
          <div className="space-y-1.5" key={field.id}>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {field.name}{field.is_required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Input
              ref={isFirst ? firstInputRef : undefined}
              type="email"
              value={(val as string) || ""}
              onChange={(e) => setValue(field.slug, e.target.value)}
              placeholder={field.name}
              className="h-9"
            />
          </div>
        );

      case "url":
        return (
          <div className="space-y-1.5" key={field.id}>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {field.name}{field.is_required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Input
              ref={isFirst ? firstInputRef : undefined}
              type="url"
              value={(val as string) || ""}
              onChange={(e) => setValue(field.slug, e.target.value)}
              placeholder="https://..."
              className="h-9"
            />
          </div>
        );

      default: // text
        return (
          <div className="space-y-1.5" key={field.id}>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {field.name}{field.is_required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Input
              ref={isFirst ? firstInputRef : undefined}
              value={(val as string) || ""}
              onChange={(e) => setValue(field.slug, e.target.value)}
              placeholder={field.name}
              className="h-9"
            />
          </div>
        );
    }
  };

  const actualFields = fields.length === 0 
    ? [{ id: "_name", slug: "name", name: "Nome", field_type: "text", is_required: true } as CoreObjectField, { id: "_notes", slug: "notes", name: "Notas", field_type: "text", is_required: false } as CoreObjectField]
    : fields;

  return (
    <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border/40" onKeyDown={handleKeyDown}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actualFields.map((f, i) => renderField(f, i))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSubmit} disabled={isPending} className="h-8">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-8 text-muted-foreground">
            Cancelar
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground/60 ml-auto">⌘+Enter para salvar</span>
      </div>
    </div>
  );
}
