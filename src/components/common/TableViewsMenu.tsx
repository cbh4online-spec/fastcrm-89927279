import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bookmark, Save, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { safeRandomId, safeStorageGet, safeStorageSet } from "@/lib/browser/safeBrowser";
import { parseViews, upsertView, cleanFilters, type SavedTableView, type TableViewState } from "@/lib/tableViews/tableViews";

interface TableViewsMenuProps {
  storageKey: string;
  getState: () => TableViewState;
  onApply: (view: SavedTableView) => void;
}

export function TableViewsMenu({ storageKey, getState, onApply }: TableViewsMenuProps) {
  const key = `${storageKey}-saved-views`;
  const [views, setViews] = useState<SavedTableView[]>(() => parseViews(safeStorageGet("local", key)));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const persist = (next: SavedTableView[]) => {
    setViews(next);
    safeStorageSet("local", key, JSON.stringify(next));
  };

  const handleSave = () => {
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return;
    const state = getState();
    const view: SavedTableView = {
      ...state,
      filters: cleanFilters(state.filters),
      id: safeRandomId(),
      name: trimmed,
      createdAt: new Date().toISOString(),
    };
    persist(upsertView(views, view));
    setActiveId(view.id);
    setOpen(false);
    setName("");
    toast.success(`Vista «${trimmed}» guardada`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Vistas</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Vistas guardadas</DropdownMenuLabel>
          {views.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">Ainda não há vistas guardadas.</p>
          )}
          {views.map((v) => (
            <DropdownMenuItem key={v.id} onSelect={() => { onApply(v); setActiveId(v.id); toast.success(`Vista «${v.name}» aplicada`); }} className="flex items-center gap-2">
              <Check className={`h-4 w-4 ${activeId === v.id ? "opacity-100" : "opacity-0"}`} />
              <span className="flex-1 truncate">{v.name}</span>
              <button
                type="button"
                aria-label={`Apagar vista ${v.name}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); persist(views.filter((x) => x.id !== v.id)); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setOpen(true)} className="gap-2">
            <Save className="h-4 w-4" /> Guardar vista atual…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar vista</DialogTitle>
            <DialogDescription>Guarda as colunas, a ordem, os filtros e a ordenação atuais.</DialogDescription>
          </DialogHeader>
          <Input autoFocus maxLength={60} placeholder="Ex.: Leads quentes" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
