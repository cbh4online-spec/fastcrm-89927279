import { useState, useRef, KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketTagsEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
}

export function TicketTagsEditor({ tags, onChange, readOnly = false }: TicketTagsEditorProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
    if (e.key === "Escape") {
      setEditing(false);
      setInputValue("");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] gap-1 pr-1">
            {tag}
            {!readOnly && (
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        ))}
        {!readOnly && !editing && (
          <button
            onClick={() => {
              setEditing(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-dashed border-border hover:border-primary/50 transition-colors"
          >
            <Plus className="h-2.5 w-2.5" />
            Tag
          </button>
        )}
      </div>
      {editing && !readOnly && (
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue) addTag(inputValue);
            setEditing(false);
          }}
          placeholder="Nova tag + Enter"
          className="h-7 text-xs"
        />
      )}
    </div>
  );
}
