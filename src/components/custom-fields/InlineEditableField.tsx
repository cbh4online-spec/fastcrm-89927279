import { useState, useEffect, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Check, Pencil, X, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FieldSuggestion } from "@/hooks/useFieldSuggestions";
import { InlineFieldSuggestion } from "@/components/ai/InlineFieldSuggestion";

export interface InlineEditableFieldProps {
  label: string;
  fieldId: string;
  fieldType: "text" | "email" | "phone" | "number" | "currency" | "date" | "boolean" | "select" | "textarea" | "tags";
  value: unknown;
  onChange: (value: unknown) => Promise<void>;
  icon?: ReactNode;
  required?: boolean;
  options?: string[];
  isLink?: boolean;
  linkType?: "email" | "phone" | "url";
  suggestion?: FieldSuggestion;
  onAcceptSuggestion?: (value: unknown) => Promise<void>;
  onRejectSuggestion?: () => void;
  isAcceptingSuggestion?: boolean;
  placeholder?: string;
}

export function InlineEditableField({
  label,
  fieldId,
  fieldType,
  value,
  onChange,
  icon,
  required = false,
  options = [],
  isLink = false,
  linkType = "url",
  suggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  isAcceptingSuggestion = false,
  placeholder,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState<unknown>(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedValue(value);
  }, [value]);

  const hasValue = value !== undefined && value !== null && value !== "" && 
    !(Array.isArray(value) && value.length === 0);
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

  // Handle Enter key for text inputs
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && fieldType !== "textarea") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Format currency value for display
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Format display value based on field type
  const formatValue = (val: unknown): ReactNode => {
    if (val === undefined || val === null || val === "") return "—";
    
    switch (fieldType) {
      case "boolean":
        return val ? "Sim" : "Não";
      case "date":
        try {
          return format(new Date(val as string), "dd/MM/yyyy");
        } catch {
          return String(val);
        }
      case "number":
        return new Intl.NumberFormat('pt-PT').format(Number(val));
      case "currency":
        return formatCurrency(Number(val));
      case "tags":
        if (Array.isArray(val) && val.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {val.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          );
        }
        return "—";
      default:
        return String(val);
    }
  };

  const getHref = () => {
    if (!value || typeof value !== 'string') return '#';
    if (linkType === "email") return `mailto:${value}`;
    if (linkType === "phone") return `tel:${value}`;
    return value.startsWith('http') ? value : `https://${value}`;
  };

  const renderEditInput = () => {
    switch (fieldType) {
      case "text":
      case "email":
      case "phone":
        return (
          <Input
            type={fieldType === "email" ? "email" : fieldType === "phone" ? "tel" : "text"}
            value={(editedValue as string) || ""}
            onChange={(e) => setEditedValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
            autoFocus
            placeholder={placeholder || `Introduza ${label.toLowerCase()}`}
          />
        );

      case "number":
      case "currency":
        return (
          <Input
            type="number"
            step={fieldType === "currency" ? "0.01" : "1"}
            value={(editedValue as number) ?? ""}
            onChange={(e) => setEditedValue(e.target.value ? Number(e.target.value) : null)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
            autoFocus
            placeholder={placeholder || (fieldType === "currency" ? "0.00" : "0")}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={(editedValue as string) || ""}
            onChange={(e) => setEditedValue(e.target.value)}
            className="min-h-[80px] text-sm"
            autoFocus
            placeholder={placeholder || `Introduza ${label.toLowerCase()}`}
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
                onSelect={(date) => {
                  setEditedValue(date?.toISOString() || null);
                }}
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
            onCheckedChange={(checked) => {
              setEditedValue(checked);
              // Auto-save for boolean
              setIsSaving(true);
              onChange(checked).then(() => {
                setIsEditing(false);
              }).finally(() => {
                setIsSaving(false);
              });
            }}
          />
        );

      case "select":
        return (
          <Select
            value={(editedValue as string) || ""}
            onValueChange={(v) => setEditedValue(v || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={placeholder || `Selecionar ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "tags":
        const tagsValue = Array.isArray(editedValue) ? editedValue.join(", ") : "";
        return (
          <Input
            value={tagsValue}
            onChange={(e) => {
              const tags = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
              setEditedValue(tags);
            }}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
            autoFocus
            placeholder={placeholder || "tag1, tag2, tag3"}
          />
        );

      default:
        return null;
    }
  };

  const displayValue = formatValue(value);

  return (
    <div className="flex items-start py-3 border-b border-border/50 last:border-0 group">
      <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
        {required && <span className="text-destructive">*</span>}
      </div>
      <div className="flex-1 text-sm">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              {renderEditInput()}
            </div>
            {fieldType !== "boolean" && (
              <>
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
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {isLink && hasValue && typeof value === 'string' ? (
              <a 
                href={getHref()}
                target={linkType === "url" ? "_blank" : undefined}
                rel={linkType === "url" ? "noopener noreferrer" : undefined}
                className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                {value}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span 
                className={cn(
                  "cursor-pointer hover:text-primary transition-colors",
                  !hasValue && "text-muted-foreground"
                )}
                onClick={handleStartEdit}
              >
                {displayValue}
              </span>
            )}
            
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
