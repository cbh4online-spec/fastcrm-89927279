import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import { ShortcutCombo } from "./KbdKey";
import { SHORTCUT_GROUPS, ALL_SHORTCUTS, type ShortcutKey } from "@/data/keyboard-shortcuts";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useIsMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function formatKeys(keys: ShortcutKey, isMac: boolean): string[] {
  return isMac ? keys.mac : keys.win;
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const isMac = useIsMac();
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setSearch("");
      setActiveGroup(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (search.trim().length === 0) return null;
    const q = search.toLowerCase();
    return ALL_SHORTCUTS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.groupTitle.toLowerCase().includes(q)
    );
  }, [search]);

  const groupsToShow = filtered
    ? null
    : activeGroup
      ? SHORTCUT_GROUPS.filter((g) => g.id === activeGroup)
      : SHORTCUT_GROUPS;

  const totalShortcuts = SHORTCUT_GROUPS.reduce((acc, g) => acc + g.shortcuts.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[80vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <span className="text-base">⌨️</span>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Pesquisar atalhos..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveGroup(null); }}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
            {isMac ? "🍎 macOS" : "🪟 Windows"}
          </span>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Fechar <ShortcutCombo keys={["Esc"]} size="sm" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0" style={{ height: "calc(80vh - 110px)" }}>
          {/* Sidebar tabs — hidden when searching */}
          {!filtered && (
            <div className="w-[160px] border-r bg-muted/20 p-2 shrink-0 overflow-y-auto">
              <button
                onClick={() => setActiveGroup(null)}
                className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs mb-0.5 transition-colors ${
                  activeGroup === null ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                ✦ Todos
              </button>
              {SHORTCUT_GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs mb-0.5 transition-colors ${
                    activeGroup === group.id ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {group.icon} {group.title}
                </button>
              ))}
            </div>
          )}

          {/* Shortcut list */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Search results */}
              {filtered && (
                filtered.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhum atalho encontrado para "{search}"
                  </p>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                    </p>
                    {filtered.map((s) => (
                      <ShortcutRow
                        key={s.id}
                        label={s.label}
                        description={s.description}
                        keys={formatKeys(s.keys, isMac)}
                        groupLabel={s.groupTitle}
                        searchQuery={search}
                      />
                    ))}
                  </>
                )
              )}

              {/* Grouped view */}
              {!filtered && groupsToShow?.map((group) => (
                <div key={group.id}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>{group.icon}</span>
                    {group.title}
                  </h3>
                  <div className="space-y-0">
                    {group.shortcuts.map((s) => (
                      <ShortcutRow
                        key={s.id}
                        label={s.label}
                        description={s.description}
                        keys={formatKeys(s.keys, isMac)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
          <span className="text-[10px] text-muted-foreground">
            Pressiona <ShortcutCombo keys={["?"]} size="sm" /> em qualquer momento para ver esta lista
          </span>
          <span className="text-[10px] text-muted-foreground">
            {totalShortcuts} atalhos disponíveis
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Shortcut Row ── */

function ShortcutRow({
  label,
  description,
  keys,
  groupLabel,
  searchQuery,
}: {
  label: string;
  description?: string;
  keys: string[];
  groupLabel?: string;
  searchQuery?: string;
}) {
  const highlight = (text: string) => {
    if (!searchQuery) return text;
    const idx = text.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-primary/20 text-primary font-medium rounded px-0.5">
          {text.slice(idx, idx + searchQuery.length)}
        </span>
        {text.slice(idx + searchQuery.length)}
      </>
    );
  };

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-foreground truncate">{highlight(label)}</span>
        {description && (
          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">— {description}</span>
        )}
        {groupLabel && (
          <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
            {groupLabel}
          </span>
        )}
      </div>
      <ShortcutCombo keys={keys} size="sm" />
    </div>
  );
}
