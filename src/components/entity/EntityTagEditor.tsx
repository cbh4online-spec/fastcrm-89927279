import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useWorkspaceTags, useCreateWorkspaceTag } from "@/hooks/useWorkspaceTags";
import { cn } from "@/lib/utils";

interface EntityTagEditorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TAG_COLORS: Record<string, string> = {
  red: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  green: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  yellow: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  purple: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  pink: "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/20",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
};

const DEFAULT_TAG_CLASS = "bg-primary/10 text-primary border-primary/20";

function getTagClass(color: string | null) {
  if (!color) return DEFAULT_TAG_CLASS;
  return TAG_COLORS[color] || DEFAULT_TAG_CLASS;
}

export function EntityTagEditor({ value, onChange, placeholder }: EntityTagEditorProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: workspaceTags = [] } = useWorkspaceTags();
  const createTag = useCreateWorkspaceTag();

  const normalizedInput = input.trim().toLowerCase();

  const suggestions = workspaceTags.filter(
    (t) =>
      t.name.includes(normalizedInput) &&
      !value.map((v) => v.toLowerCase()).includes(t.name)
  );

  const exactMatch = workspaceTags.some((t) => t.name === normalizedInput);
  const showCreate = normalizedInput.length > 0 && !exactMatch && !value.map((v) => v.toLowerCase()).includes(normalizedInput);

  const allOptions = [
    ...suggestions.map((s) => ({ type: "existing" as const, tag: s })),
    ...(showCreate ? [{ type: "create" as const, tag: { id: "__new__", name: normalizedInput, color: null, created_at: "" } }] : []),
  ];

  useEffect(() => {
    setHighlightIdx(-1);
  }, [input]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addTag = async (name: string) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized || value.map((v) => v.toLowerCase()).includes(normalized)) return;

    // Create in workspace_tags if it doesn't exist
    const exists = workspaceTags.some((t) => t.name === normalized);
    if (!exists) {
      createTag.mutate({ name: normalized });
    }

    onChange([...value, normalized]);
    setInput("");
    inputRef.current?.focus();
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, allOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < allOptions.length) {
        addTag(allOptions[highlightIdx].tag.name);
      } else if (normalizedInput) {
        addTag(normalizedInput);
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const getColorForTag = (tagName: string) => {
    const wt = workspaceTags.find((t) => t.name === tagName.toLowerCase());
    return getTagClass(wt?.color ?? null);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((tag, i) => (
          <Badge
            key={i}
            variant="outline"
            className={cn("text-xs gap-1 pr-1", getColorForTag(tag))}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-0.5 hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Input
        ref={inputRef}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Adicionar etiqueta..."}
        className="h-8 text-sm"
      />

      {open && allOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {allOptions.map((opt, i) => (
            <button
              key={opt.tag.id}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors",
                highlightIdx === i && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(opt.tag.name);
              }}
            >
              {opt.type === "create" ? (
                <>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Criar "<strong>{opt.tag.name}</strong>"</span>
                </>
              ) : (
                <>
                  <span
                    className={cn("w-2.5 h-2.5 rounded-full", opt.tag.color ? `bg-${opt.tag.color}-500` : "bg-primary")}
                    style={opt.tag.color ? { backgroundColor: `var(--${opt.tag.color}, currentColor)` } : undefined}
                  />
                  <span>{opt.tag.name}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
