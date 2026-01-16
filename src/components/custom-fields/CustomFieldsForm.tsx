import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  useCustomFields,
  useCustomFieldValues,
  useSetCustomFieldValue,
  CustomField,
  CustomFieldEntityType,
} from "@/hooks/useCustomFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ==================== Edit Mode (existing entity) ====================
interface CustomFieldsFormProps {
  entityType: CustomFieldEntityType;
  entityId: string;
  className?: string;
}

export function CustomFieldsForm({ entityType, entityId, className }: CustomFieldsFormProps) {
  const { data: fields = [] } = useCustomFields(entityType);
  const { data: existingValues = [] } = useCustomFieldValues(entityId);
  const setFieldValue = useSetCustomFieldValue();

  const [values, setValues] = useState<Record<string, unknown>>({});

  // Initialize values from existing data
  useEffect(() => {
    const initial: Record<string, unknown> = {};
    for (const v of existingValues) {
      initial[v.custom_field_id] = v.value;
    }
    setValues(initial);
  }, [existingValues]);

  const handleValueChange = async (field: CustomField, value: unknown) => {
    setValues((prev) => ({ ...prev, [field.id]: value }));
    
    // Save the value with uniqueness validation
    await setFieldValue.mutateAsync({
      customFieldId: field.id,
      entityId,
      value,
      fieldName: field.name,
      isUnique: field.is_unique,
    });
  };

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h4 className="text-sm font-medium text-muted-foreground">Campos Personalizados</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <CustomFieldInput
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(value) => handleValueChange(field, value)}
          />
        ))}
      </div>
    </div>
  );
}

// ==================== Create Mode (new entity, save later) ====================
export interface CustomFieldsFormCreateRef {
  saveCustomFields: (entityId: string) => Promise<void>;
  getValues: () => Record<string, unknown>;
}

interface CustomFieldsFormCreateProps {
  entityType: CustomFieldEntityType;
  className?: string;
  /** Filter fields by position: 'primary' (0-1), 'secondary' (>1), 'all' (default) */
  positionFilter?: 'primary' | 'secondary' | 'all';
  /** Hide the "Campos Personalizados" label */
  hideLabel?: boolean;
}

export const CustomFieldsFormCreate = forwardRef<CustomFieldsFormCreateRef, CustomFieldsFormCreateProps>(
  function CustomFieldsFormCreate({ entityType, className, positionFilter = 'all', hideLabel = false }, ref) {
    const { data: allFields = [] } = useCustomFields(entityType);
    const setFieldValue = useSetCustomFieldValue();

    const [values, setValues] = useState<Record<string, unknown>>({});

    // Filter fields based on position
    const fields = allFields.filter((field) => {
      if (positionFilter === 'primary') return field.position <= 1;
      if (positionFilter === 'secondary') return field.position > 1;
      return true;
    });

    // Expose methods to parent - uses allFields to save all values
    useImperativeHandle(ref, () => ({
      saveCustomFields: async (entityId: string) => {
        // Save all field values (only those managed by this instance)
        for (const field of fields) {
          const value = values[field.id];
          if (value !== undefined && value !== null && value !== "") {
            await setFieldValue.mutateAsync({
              customFieldId: field.id,
              entityId,
              value,
              fieldName: field.name,
              isUnique: field.is_unique,
            });
          }
        }
      },
      getValues: () => values,
    }));

    const handleValueChange = (field: CustomField, value: unknown) => {
      setValues((prev) => ({ ...prev, [field.id]: value }));
    };

    if (fields.length === 0) {
      return null;
    }

    return (
      <div className={cn("space-y-4", className)}>
        {!hideLabel && (
          <h4 className="text-sm font-medium text-muted-foreground">Campos Personalizados</h4>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <CustomFieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(value) => handleValueChange(field, value)}
            />
          ))}
        </div>
      </div>
    );
  }
);

// ==================== Field Input Component ====================
interface CustomFieldInputProps {
  field: CustomField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  const fieldId = `custom-field-${field.id}`;

  switch (field.field_type) {
    case "text":
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId}>
            {field.name}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Introduza ${field.name.toLowerCase()}`}
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId}>
            {field.name}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder="0"
          />
        </div>
      );

    case "date":
      const dateValue = value ? new Date(value as string) : undefined;
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId}>
            {field.name}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "PPP", { locale: pt }) : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => onChange(date?.toISOString() || null)}
                locale={pt}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between space-y-0 rounded-lg border p-3">
          <Label htmlFor={fieldId} className="cursor-pointer">
            {field.name}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Switch
            id={fieldId}
            checked={(value as boolean) || false}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );

    case "select":
      // Ensure options is always an array
      const options = Array.isArray(field.options) ? field.options : [];
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId}>
            {field.name}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Select
            value={(value as string) || ""}
            onValueChange={(v) => onChange(v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecionar ${field.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    default:
      return null;
  }
}

// ==================== Display Component (read-only) ====================
interface CustomFieldsDisplayProps {
  entityType: CustomFieldEntityType;
  entityId: string;
  className?: string;
}

export function CustomFieldsDisplay({ entityType, entityId, className }: CustomFieldsDisplayProps) {
  const { data: fields = [] } = useCustomFields(entityType);
  const { data: existingValues = [] } = useCustomFieldValues(entityId);

  const valuesMap = new Map(existingValues.map((v) => [v.custom_field_id, v.value]));

  if (fields.length === 0 || existingValues.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="text-sm font-medium text-muted-foreground">Campos Personalizados</h4>
      <div className="grid gap-2">
        {fields.map((field) => {
          const value = valuesMap.get(field.id);
          if (value === undefined || value === null) return null;

          return (
            <div key={field.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{field.name}</span>
              <span className="text-sm font-medium">
                {formatFieldValue(field, value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatFieldValue(field: CustomField, value: unknown): string {
  switch (field.field_type) {
    case "boolean":
      return value ? "Sim" : "Não";
    case "date":
      return value ? format(new Date(value as string), "dd/MM/yyyy") : "—";
    case "number":
      return value?.toString() || "—";
    default:
      return (value as string) || "—";
  }
}
