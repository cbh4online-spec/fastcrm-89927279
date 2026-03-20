import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Keyboard } from "lucide-react";
import { KEYBOARD_SHORTCUTS, ShortcutGroup, ShortcutItem } from "@/data/keyboard-shortcuts";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function KeyBadge({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-border bg-muted text-[11px] font-mono font-medium text-foreground shadow-sm">
      {k}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const filteredGroups: ShortcutGroup[] = KEYBOARD_SHORTCUTS
    .map((group) => ({
      ...group,
      shortcuts: group.shortcuts.filter(
        (s) =>
          s.description.toLowerCase().includes(query) ||
          s.keys.join(" ").toLowerCase().includes(query)
      ),
    }))
    .filter((g) => g.shortcuts.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] max-h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Keyboard className="h-4 w-4 text-primary" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar atalhos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="px-4 pb-4 space-y-5">
            {filteredGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{group.icon}</span>
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {group.shortcuts.map((shortcut, idx) => (
                    <ShortcutRow key={idx} shortcut={shortcut} />
                  ))}
                </div>
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum atalho encontrado para "{search}"
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="px-4 py-2.5 border-t bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            Dica: usa <KeyBadge k="⌘K" /> ou <KeyBadge k="Ctrl+K" /> para pesquisar qualquer coisa na plataforma
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ shortcut }: { shortcut: ShortcutItem }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
      <span className="text-xs text-foreground">{shortcut.description}</span>
      <div className="flex items-center gap-1 shrink-0 ml-4">
        {shortcut.keys.map((k, i) => (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && <span className="text-[10px] text-muted-foreground mx-0.5">+</span>}
            <KeyBadge k={k} />
          </span>
        ))}
      </div>
    </div>
  );
}
