import { FilterCondition, FilterableField, getOperatorsForFieldType, operatorNeedsValue } from "@/hooks/useFilterEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  fields: FilterableField[];
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  className?: string;
}

export function AdvancedFilterBuilder({ fields, conditions, onChange, className }: Props) {
  const addCondition = () => {
    const firstField = fields[0];
    if (!firstField) return;
    const operators = getOperatorsForFieldType(firstField.field_type);
    onChange([...conditions, { field: firstField.slug, operator: operators[0]?.value || "eq", value: "" }]);
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    const newConditions = conditions.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onChange(newConditions);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, fieldSlug: string) => {
    const field = fields.find((f) => f.slug === fieldSlug);
    if (!field) return;
    const operators = getOperatorsForFieldType(field.field_type);
    updateCondition(index, { field: fieldSlug, operator: operators[0]?.value || "eq", value: "" });
  };

  if (conditions.length === 0) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1.5 px-2" onClick={addCondition}>
          <Filter className="h-3 w-3" />
          Adicionar filtro
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 mb-1">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros (AND)</span>
      </div>
      {conditions.map((condition, index) => {
        const field = fields.find((f) => f.slug === condition.field);
        const fieldType = field?.field_type || "text";
        const operators = getOperatorsForFieldType(fieldType);
        const needsValue = operatorNeedsValue(condition.operator);

        return (
          <div key={index} className="flex items-center gap-2 flex-wrap">
            {index > 0 && (
              <span className="text-xs text-muted-foreground font-medium w-6 text-center">E</span>
            )}

            {/* Field selector */}
            <Select value={condition.field} onValueChange={(v) => handleFieldChange(index, v)}>
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {fields.map((f) => (
                  <SelectItem key={f.slug} value={f.slug} className="text-xs">
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator selector */}
            <Select value={condition.operator} onValueChange={(v) => updateCondition(index, { operator: v, value: "" })}>
              <SelectTrigger className="h-7 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value} className="text-xs">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value input */}
            {needsValue && (
              <FilterValueInput
                fieldType={fieldType}
                field={field}
                value={condition.value}
                onChange={(v) => updateCondition(index, { value: v })}
              />
            )}

            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(index)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}

      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1.5 px-2" onClick={addCondition}>
        <Plus className="h-3 w-3" />
        Adicionar condição
      </Button>
    </div>
  );
}

function FilterValueInput({
  fieldType,
  field,
  value,
  onChange,
}: {
  fieldType: string;
  field?: FilterableField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (fieldType === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={value === true || value === "true"} onCheckedChange={(v) => onChange(v)} />
        <span className="text-xs text-muted-foreground">{value === true || value === "true" ? "Sim" : "Não"}</span>
      </div>
    );
  }

  if (fieldType === "select" || fieldType === "multi_select") {
    const selectOptions = (field?.options as any)?.options as string[] | undefined;
    if (selectOptions && selectOptions.length > 0) {
      return (
        <Select value={String(value || "")} onValueChange={onChange}>
          <SelectTrigger className="h-7 w-[160px] text-xs">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {selectOptions.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-xs">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  }

  if (fieldType === "number" || fieldType === "currency") {
    return (
      <Input
        type="number"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        className="h-7 w-[120px] text-xs"
        placeholder="Valor"
      />
    );
  }

  if (fieldType === "date") {
    return (
      <Input
        type="date"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-[150px] text-xs"
      />
    );
  }

  return (
    <Input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-[160px] text-xs"
      placeholder="Valor"
    />
  );
}
