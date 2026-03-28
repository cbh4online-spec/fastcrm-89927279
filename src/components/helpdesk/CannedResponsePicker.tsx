import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Zap, Search } from "lucide-react";
import { useHelpdeskCannedResponses } from "@/hooks/useHelpdeskCannedResponses";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CannedResponsePickerProps {
  onSelect: (content: string) => void;
}

export function CannedResponsePicker({ onSelect }: CannedResponsePickerProps) {
  const { responses } = useHelpdeskCannedResponses();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = responses.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.shortcut && r.shortcut.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs">
          <Zap className="h-3 w-3" />
          Macros
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar macros..."
            className="pl-7 h-8 text-xs"
          />
        </div>
        <ScrollArea className="max-h-60">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Sem macros encontradas</p>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r.content);
                setOpen(false);
                setSearch("");
              }}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-sm transition-colors"
            >
              <div className="font-medium text-xs">{r.title}</div>
              {r.shortcut && (
                <span className="text-[10px] text-muted-foreground font-mono">{r.shortcut}</span>
              )}
            </button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
