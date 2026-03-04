import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TagInput } from "./TagInput";
import { ContextField, FIELD_LABELS } from "@/hooks/useContextBlocks";

interface Props {
  field: ContextField;
  onChange: (fieldId: string, value: any) => void;
}

export function ContextFieldEditor({ field, onChange }: Props) {
  const label = FIELD_LABELS[field.field_key] || field.field_key;

  const getValue = () => field.field_value;

  switch (field.field_type) {
    case 'text':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Textarea
            value={typeof getValue() === 'string' ? getValue() : getValue() ?? ''}
            onChange={e => onChange(field.id, e.target.value)}
            placeholder={`Preencher ${label.toLowerCase()}...`}
            className="min-h-[60px] bg-background/50 border-border/50 text-sm"
            rows={2}
          />
        </div>
      );
    case 'number':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Input
            type="number"
            value={getValue() ?? ''}
            onChange={e => onChange(field.id, e.target.value ? Number(e.target.value) : null)}
            placeholder="0"
            className="bg-background/50 border-border/50 text-sm"
          />
        </div>
      );
    case 'currency':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
            <Input
              type="number"
              value={getValue() ?? ''}
              onChange={e => onChange(field.id, e.target.value ? Number(e.target.value) : null)}
              placeholder="0"
              className="pl-7 bg-background/50 border-border/50 text-sm"
            />
          </div>
        </div>
      );
    case 'list':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <TagInput
            values={Array.isArray(getValue()) ? getValue() : []}
            onChange={v => onChange(field.id, v)}
            placeholder={`Adicionar ${label.toLowerCase()}...`}
          />
        </div>
      );
    case 'json':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Textarea
            value={typeof getValue() === 'string' ? getValue() : getValue() ? JSON.stringify(getValue(), null, 2) : ''}
            onChange={e => {
              try {
                onChange(field.id, JSON.parse(e.target.value));
              } catch {
                onChange(field.id, e.target.value);
              }
            }}
            placeholder="JSON..."
            className="min-h-[80px] bg-background/50 border-border/50 text-xs font-mono"
            rows={3}
          />
        </div>
      );
    default:
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Input
            value={getValue() ?? ''}
            onChange={e => onChange(field.id, e.target.value)}
            className="bg-background/50 border-border/50 text-sm"
          />
        </div>
      );
  }
}
