import { useState } from "react";
import { CoreObjectField } from "@/hooks/useCoreObjectFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Props {
  fields: CoreObjectField[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending?: boolean;
  initialData?: Record<string, unknown>;
  submitLabel?: string;
}

export function DynamicRecordForm({ fields, onSubmit, isPending, initialData, submitLabel = "Salvar" }: Props) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData || {});

  const setValue = (slug: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [slug]: value }));
  };

  const handleSubmit = () => {
    // Validate required fields
    for (const f of fields) {
      if (f.is_required && !formData[f.slug]) return;
    }
    onSubmit(formData);
  };

  const renderField = (field: CoreObjectField) => {
    const val = formData[field.slug];

    switch (field.field_type) {
      case "boolean":
        return (
          <div className="flex items-center gap-2" key={field.id}>
            <Switch checked={!!val} onCheckedChange={(v) => setValue(field.slug, v)} />
            <Label>{field.name}{field.is_required && " *"}</Label>
          </div>
        );

      case "select": {
        const options = (field.options as any)?.options || [];
        return (
          <div key={field.id}>
            <Label>{field.name}{field.is_required && " *"}</Label>
            <Select value={(val as string) || ""} onValueChange={(v) => setValue(field.slug, v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      }

      case "number":
        return (
          <div key={field.id}>
            <Label>{field.name}{field.is_required && " *"}</Label>
            <Input type="number" value={(val as number) ?? ""} onChange={(e) => setValue(field.slug, e.target.value ? Number(e.target.value) : null)} placeholder={field.name} />
          </div>
        );

      case "date":
        return (
          <div key={field.id}>
            <Label>{field.name}{field.is_required && " *"}</Label>
            <Input type="date" value={(val as string) || ""} onChange={(e) => setValue(field.slug, e.target.value)} />
          </div>
        );

      case "email":
        return (
          <div key={field.id}>
            <Label>{field.name}{field.is_required && " *"}</Label>
            <Input type="email" value={(val as string) || ""} onChange={(e) => setValue(field.slug, e.target.value)} placeholder={field.name} />
          </div>
        );

      case "url":
        return (
          <div key={field.id}>
            <Label>{field.name}{field.is_required && " *"}</Label>
            <Input type="url" value={(val as string) || ""} onChange={(e) => setValue(field.slug, e.target.value)} placeholder="https://..." />
          </div>
        );

      default: // text
        return (
          <div key={field.id}>
            <Label>{field.name}{field.is_required && " *"}</Label>
            <Input value={(val as string) || ""} onChange={(e) => setValue(field.slug, e.target.value)} placeholder={field.name} />
          </div>
        );
    }
  };

  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={(formData.name as string) || ""} onChange={(e) => setValue("name", e.target.value)} placeholder="Nome do registro" />
          </div>
          <div>
            <Label>Notas</Label>
            <Input value={(formData.notes as string) || ""} onChange={(e) => setValue("notes", e.target.value)} placeholder="Notas opcionais" />
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {submitLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        {fields.map(renderField)}
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          {submitLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
