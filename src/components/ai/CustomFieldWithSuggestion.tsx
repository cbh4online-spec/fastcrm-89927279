import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Sparkles, Check, X, Edit3, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FieldSuggestion } from "@/hooks/useFieldSuggestions";
import { CustomField } from "@/hooks/useCustomFields";

const CONFIDENCE_THRESHOLD = 0.5;

interface CustomFieldWithSuggestionProps {
  field: CustomField;
  value: unknown;
  onChange: (value: unknown) => void;
  suggestion?: FieldSuggestion;
  onAcceptSuggestion?: (value: unknown) => Promise<void>;
  onRejectSuggestion?: () => void;
  isAcceptingSuggestion?: boolean;
  isEditing?: boolean;
}

export function CustomFieldWithSuggestion({
  field,
  value,
  onChange,
  suggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  isAcceptingSuggestion = false,
  isEditing = false,
}: CustomFieldWithSuggestionProps) {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editedValue, setEditedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const hasValue = value !== undefined && value !== null && value !== "";
  const showSuggestion = !hasValue && suggestion && suggestion.confidence >= CONFIDENCE_THRESHOLD;

  const handleStartEdit = () => {
    const displayValue = typeof suggestion?.suggested_value === "object" 
      ? JSON.stringify(suggestion.suggested_value)
      : String(suggestion?.suggested_value ?? "");
    setEditedValue(displayValue);
    setIsEditingValue(true);
  };

  const handleAccept = async () => {
    if (!onAcceptSuggestion || !suggestion) return;
    
    let valueToAccept = isEditingValue ? editedValue : suggestion.suggested_value;
    
    // Convert value based on field type
    if (field.field_type === "number" && typeof valueToAccept === "string") {
      valueToAccept = Number(valueToAccept);
    } else if (field.field_type === "boolean" && typeof valueToAccept === "string") {
      valueToAccept = valueToAccept === "true";
    }
    
    await onAcceptSuggestion(valueToAccept);
    setIsEditingValue(false);
    setIsOpen(false);
  };

  const handleReject = () => {
    if (onRejectSuggestion) {
      onRejectSuggestion();
    }
    setIsEditingValue(false);
    setIsOpen(false);
  };

  // Format display value based on field type
  const formatValue = (val: unknown): string => {
    if (val === undefined || val === null || val === "") return "—";
    switch (field.field_type) {
      case "boolean":
        return val ? "Sim" : "Não";
      case "date":
        return format(new Date(val as string), "dd/MM/yyyy");
      case "number":
        return String(val);
      default:
        return String(val);
    }
  };

  const confidenceColor = suggestion && suggestion.confidence >= 0.8 
    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
    : "bg-amber-500/10 text-amber-700 border-amber-500/30";

  const confidenceLabel = suggestion && suggestion.confidence >= 0.8 ? "Alta" : "Média";

  // If in edit mode, show the editable input
  if (isEditing) {
    return <CustomFieldInput field={field} value={value} onChange={onChange} />;
  }

  return (
    <div className="flex items-start py-3 border-b border-border/50 last:border-0">
      <div className="w-32 flex-shrink-0 text-sm text-muted-foreground">
        {field.name}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </div>
      <div className="flex-1 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(!hasValue && "text-muted-foreground")}>
            {hasValue ? formatValue(value) : "—"}
          </span>
          
          {/* Show AI suggestion badge for empty fields */}
          {showSuggestion && onAcceptSuggestion && onRejectSuggestion && (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                    "bg-primary/10 text-primary border border-primary/20",
                    "hover:bg-primary/20 transition-colors cursor-pointer"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  IA sugerida
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start" side="bottom">
                <div className="p-3 border-b bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Sugestão IA</span>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", confidenceColor)}>
                      Confiança {confidenceLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {suggestion.explanation}
                  </p>
                  {field.field_type === "select" && (
                    <p className="text-xs text-muted-foreground/80 mt-1 italic">
                      Campo de seleção: apenas valores permitidos
                    </p>
                  )}
                </div>

                <div className="p-3 space-y-3">
                  {/* Suggested Value */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Valor sugerido
                    </label>
                    {isEditingValue ? (
                      <SuggestionEditInput 
                        field={field} 
                        value={editedValue} 
                        onChange={setEditedValue} 
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-background rounded-md px-3 py-2 border text-sm font-medium">
                          {formatValue(suggestion.suggested_value)}
                        </div>
                        {field.field_type !== "select" && field.field_type !== "boolean" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={handleStartEdit}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar antes de aceitar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={handleReject}
                      disabled={isAcceptingSuggestion}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Ignorar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleAccept}
                      disabled={isAcceptingSuggestion}
                    >
                      {isAcceptingSuggestion ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                          A aplicar...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Aceitar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for editing suggestion value
function SuggestionEditInput({ 
  field, 
  value, 
  onChange 
}: { 
  field: CustomField; 
  value: string; 
  onChange: (value: string) => void;
}) {
  switch (field.field_type) {
    case "number":
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
          autoFocus
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
          autoFocus
        />
      );
    default:
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
          autoFocus
        />
      );
  }
}

// Editable input component for custom fields (used in edit mode)
function CustomFieldInput({ 
  field, 
  value, 
  onChange 
}: { 
  field: CustomField; 
  value: unknown; 
  onChange: (value: unknown) => void;
}) {
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
              {field.options?.map((option) => (
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

// Helper function to get custom field suggestion
export function getCustomFieldSuggestion(
  suggestions: FieldSuggestion[],
  customFieldId: string
): FieldSuggestion | undefined {
  return suggestions.find(
    s => s.field_type === "custom" && 
         s.custom_field_id === customFieldId &&
         s.confidence >= CONFIDENCE_THRESHOLD
  );
}
