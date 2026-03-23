import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag } from "lucide-react";
import { useProductTags, useWorkspaceTags } from "@/hooks/useProductTags";
import { Separator } from "@/components/ui/separator";

interface ProductTagsEditorProps {
  productId: string;
}

const TAG_COLORS: Record<string, string> = {
  novo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  promo: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  destaque: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  outlet: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  bestseller: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function getTagColor(tag: string): string {
  return TAG_COLORS[tag] || "bg-muted text-muted-foreground";
}

export function ProductTagsEditor({ productId }: ProductTagsEditorProps) {
  const { tags, isLoading, addTag, removeTag } = useProductTags(productId);
  const { data: workspaceTags } = useWorkspaceTags();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const existingTagNames = tags.map((t) => t.tag);
  const suggestions = ((workspaceTags || []) as string[]).filter(
    (t: string) =>
      !existingTagNames.includes(t) &&
      t.includes(inputValue.toLowerCase()) &&
      inputValue.length > 0
  );

  const handleAdd = (tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (!clean) return;
    addTag.mutate(clean);
    setInputValue("");
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleAdd(inputValue);
    }
  };

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Tags</p>
      </div>

      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Badge
            key={t.id}
            variant="secondary"
            className={`gap-1 pr-1 ${getTagColor(t.tag)}`}
          >
            {t.tag}
            <button
              onClick={() => removeTag.mutate(t.id)}
              className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {tags.length === 0 && !isLoading && (
          <span className="text-xs text-muted-foreground">Sem tags</span>
        )}
      </div>

      {/* Add tag input */}
      <div className="relative">
        <div className="flex gap-1.5">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Adicionar tag..."
            className="h-7 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={!inputValue.trim() || addTag.isPending}
            onClick={() => handleAdd(inputValue)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Autocomplete suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-8 left-0 right-10 bg-popover border rounded-md shadow-md max-h-32 overflow-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAdd(s);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick-add common tags */}
      {tags.length === 0 && (
        <div className="flex flex-wrap gap-1">
          {["novo", "promo", "destaque", "outlet", "bestseller"].map((tag) => (
            <Button
              key={tag}
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => handleAdd(tag)}
            >
              + {tag}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
