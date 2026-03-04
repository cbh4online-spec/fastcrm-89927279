import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TagInput } from "./TagInput";
import { ContextField, FIELD_LABELS } from "@/hooks/useContextBlocks";
import { Sparkles, User, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  field: ContextField & { origin?: string; origin_details?: any };
  onChange: (fieldId: string, value: any) => void;
}

function OriginBadge({ origin, details }: { origin?: string; details?: any }) {
  if (!origin || origin === 'manual') return null;

  const config = {
    ai: { icon: Sparkles, label: "IA", className: "text-gold bg-gold/10 border-gold/20" },
    imported: { icon: Download, label: "Importado", className: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    brief: { icon: Sparkles, label: "Brief", className: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  }[origin] || null;

  if (!config) return null;
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border", config.className)}
      title={details?.reasoning || `Origem: ${origin}`}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}

export function ContextFieldEditor({ field, onChange }: Props) {
  const label = FIELD_LABELS[field.field_key] || field.field_key;
  const getValue = () => field.field_value;

  const labelRow = (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <OriginBadge origin={(field as any).origin} details={(field as any).origin_details} />
    </div>
  );

  switch (field.field_type) {
    case 'text':
      return (
        <div className="space-y-1.5">
          {labelRow}
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
          {labelRow}
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
          {labelRow}
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
          {labelRow}
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
          {labelRow}
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
          {labelRow}
          <Input
            value={getValue() ?? ''}
            onChange={e => onChange(field.id, e.target.value)}
            className="bg-background/50 border-border/50 text-sm"
          />
        </div>
      );
  }
}
