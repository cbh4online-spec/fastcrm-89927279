import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Check, Pencil, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CustomField } from "@/hooks/useCustomFields";
import { FieldSuggestion } from "@/hooks/useFieldSuggestions";
import { InlineFieldSuggestion } from "@/components/ai/InlineFieldSuggestion";

interface InlineCustomFieldRowProps {
  field: CustomField;
  value: unknown;
  onChange: (value: unknown) => Promise<void>;
  suggestion?: FieldSuggestion;
  onAcceptSuggestion?: (value: unknown) => Promise<void>;
  onRejectSuggestion?: () => void;
  isAcceptingSuggestion?: boolean;
}

export function InlineCustomFieldRow({
  field,
  value,
  onChange,
  suggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  isAcceptingSuggestion = false,
}: InlineCustomFieldRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState<unknown>(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedValue(value);
  }, [value]);

  const hasValue = value !== undefined && value !== null && value !== "";
  const showSuggestion = !hasValue && suggestion && suggestion.confidence >= 0.5;

  const handleStartEdit = () => {
    setEditedValue(value);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedValue(value);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onChange(editedValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving field:", error);
    } finally {
      setIsSaving(false);
    }
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

  const renderEditInput = () => {
    switch (field.field_type) {
      case "text":
        return (
          <Input
            value={(editedValue as string) || ""}
            onChange={(e) => setEditedValue(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            placeholder={`Introduza ${field.name.toLowerCase()}`}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={(editedValue as number) ?? ""}
            onChange={(e) => setEditedValue(e.target.value ? Number(e.target.value) : null)}
            className="h-8 text-sm"
            autoFocus
            placeholder="0"
          />
        );

      case "date":
        const dateValue = editedValue ? new Date(editedValue as string) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start text-left font-normal text-sm",
                  !dateValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {dateValue ? format(dateValue, "dd/MM/yyyy", { locale: pt }) : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => setEditedValue(date?.toISOString() || null)}
                locale={pt}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "boolean":
        return (
          <Switch
            checked={(editedValue as boolean) || false}
            onCheckedChange={(checked) => setEditedValue(checked)}
          />
        );

      case "select":
        return (
          <Select
            value={(editedValue as string) || ""}
            onValueChange={(v) => setEditedValue(v || null)}
          >
            <SelectTrigger className="h-8 text-sm">
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
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-start py-3 border-b border-border/50 last:border-0 group">
      <div className="w-32 flex-shrink-0 text-sm text-muted-foreground">
        {field.name}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </div>
      <div className="flex-1 text-sm">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              {renderEditInput()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className={cn(
                "cursor-pointer hover:text-primary transition-colors",
                !hasValue && "text-muted-foreground"
              )}
              onClick={handleStartEdit}
            >
              {hasValue ? formatValue(value) : "—"}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              onClick={handleStartEdit}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            
            {/* Show AI suggestion badge for empty fields */}
            {showSuggestion && onAcceptSuggestion && onRejectSuggestion && (
              <InlineFieldSuggestion
                suggestion={suggestion}
                onAccept={onAcceptSuggestion}
                onReject={onRejectSuggestion}
                isAccepting={isAcceptingSuggestion}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
