import { useState, useEffect, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Pencil, X, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNifLookup, NifLookupResult } from "@/hooks/useNifLookup";
import { toast } from "sonner";

export interface InlineNifFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => Promise<void>;
  onDataReceived?: (data: NifLookupResult) => void;
  icon?: ReactNode;
  placeholder?: string;
}

export function InlineNifField({
  label,
  value,
  onChange,
  onDataReceived,
  icon,
  placeholder = "Digite o NIF...",
}: InlineNifFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState<string>(value || "");
  const [isSaving, setIsSaving] = useState(false);
  
  const { lookup, isLoading: isSearching } = useNifLookup({
    showToasts: true,
    onSuccess: (data) => {
      onDataReceived?.(data);
    },
  });

  useEffect(() => {
    setEditedValue(value || "");
  }, [value]);

  const hasValue = value !== undefined && value !== null && value !== "";

  const handleStartEdit = () => {
    setEditedValue(value || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedValue(value || "");
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

  const handleSearch = async () => {
    const cleanNif = editedValue.replace(/\s/g, '');
    if (cleanNif.length !== 9) {
      toast.error("NIF deve ter 9 dígitos");
      return;
    }
    await lookup(cleanNif);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Format NIF for display (with spaces)
  const formatNif = (nif: string | null | undefined): string => {
    if (!nif) return "—";
    const clean = nif.replace(/\s/g, '');
    if (clean.length !== 9) return nif;
    return clean;
  };

  return (
    <div className="flex items-start py-3 border-b border-border/50 last:border-0 group">
      <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="flex-1 text-sm">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                type="text"
                value={editedValue}
                onChange={(e) => {
                  // Allow only digits
                  const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                  setEditedValue(val);
                }}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm font-mono"
                autoFocus
                placeholder={placeholder}
                maxLength={9}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 gap-1.5"
                onClick={handleSearch}
                disabled={isSearching || editedValue.length !== 9}
                title="Pesquisar dados pelo NIF"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Pesquisar
              </Button>
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
          <div className="flex items-center gap-2">
            <span 
              className={cn(
                "cursor-pointer hover:text-primary transition-colors font-mono",
                !hasValue && "text-muted-foreground"
              )}
              onClick={handleStartEdit}
            >
              {formatNif(value)}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              onClick={handleStartEdit}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
