import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X } from "lucide-react";
import { EntityTagEditor } from "./EntityTagEditor";
import { useWorkspaceTags } from "@/hooks/useWorkspaceTags";
import { cn } from "@/lib/utils";

const TAG_COLORS: Record<string, string> = {
  red: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  green: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  yellow: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  purple: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  pink: "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/20",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
};
const DEFAULT_TAG = "bg-primary/10 text-primary border-primary/20";

interface InlineHeaderTagsProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function InlineHeaderTags({ tags, onTagsChange }: InlineHeaderTagsProps) {
  const [open, setOpen] = useState(false);
  const { data: workspaceTags = [] } = useWorkspaceTags();

  const getColor = (tagName: string) => {
    const wt = workspaceTags.find((t) => t.name === tagName.toLowerCase());
    return wt?.color ? TAG_COLORS[wt.color] || DEFAULT_TAG : DEFAULT_TAG;
  };

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tags.map((tag, i) => (
        <Badge
          key={`${tag}-${i}`}
          variant="outline"
          title={tag}
          className={cn("h-6 shrink-0 gap-1 pr-1 text-xs", getColor(tag))}
        >
          <span className="max-w-[140px] truncate md:max-w-[220px]">{tag}</span>
          <button
            type="button"
            onClick={() => onTagsChange(tags.filter((_, j) => j !== i))}
            className="ml-0.5 hover:opacity-70"
            aria-label={`Remover etiqueta ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Adicionar etiqueta"
            className="flex h-6 shrink-0 items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">Tag</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <EntityTagEditor
            value={tags}
            onChange={(newTags) => onTagsChange(newTags)}
            placeholder="Adicionar etiqueta..."
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
