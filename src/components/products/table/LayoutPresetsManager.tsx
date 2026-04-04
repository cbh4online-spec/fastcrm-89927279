import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LayoutGrid, Save, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export interface LayoutPreset {
  id: string;
  name: string;
  visibleColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  isBuiltIn?: boolean;
}

interface LayoutPresetsManagerProps {
  visibleColumns: Set<string>;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  onApplyPreset: (preset: LayoutPreset) => void;
  storageKey: string;
}

const BUILT_IN_PRESETS: LayoutPreset[] = [
  {
    id: "complete",
    name: "Vista Completa",
    isBuiltIn: true,
    visibleColumns: ["name", "sku", "product_type", "category", "base_price", "direct_cost", "margin", "billing_type", "status", "store_published", "updated_at"],
    columnOrder: ["name", "sku", "product_type", "category", "base_price", "direct_cost", "margin", "billing_type", "status", "store_published", "updated_at"],
    columnWidths: {},
  },
  {
    id: "financial",
    name: "Vista Financeira",
    isBuiltIn: true,
    visibleColumns: ["name", "base_price", "direct_cost", "operational_cost", "margin", "commission_default", "tax_rate_estimate_pct", "billing_type", "billing_frequency"],
    columnOrder: ["name", "base_price", "direct_cost", "operational_cost", "margin", "commission_default", "tax_rate_estimate_pct", "billing_type", "billing_frequency"],
    columnWidths: {},
  },
  {
    id: "catalog",
    name: "Vista Catálogo",
    isBuiltIn: true,
    visibleColumns: ["name", "sku", "category", "base_price", "status", "store_published", "b2b_published"],
    columnOrder: ["name", "sku", "category", "base_price", "status", "store_published", "b2b_published"],
    columnWidths: {},
  },
];

function loadCustomPresets(storageKey: string): LayoutPreset[] {
  try {
    const raw = localStorage.getItem(`${storageKey}-layout-presets`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomPresets(storageKey: string, presets: LayoutPreset[]) {
  localStorage.setItem(`${storageKey}-layout-presets`, JSON.stringify(presets));
}

export function LayoutPresetsManager({
  visibleColumns, columnOrder, columnWidths, onApplyPreset, storageKey,
}: LayoutPresetsManagerProps) {
  const [customPresets, setCustomPresets] = useState<LayoutPreset[]>(() => loadCustomPresets(storageKey));
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const allPresets = useMemo(() => [...BUILT_IN_PRESETS, ...customPresets], [customPresets]);

  const handleApply = useCallback((preset: LayoutPreset) => {
    onApplyPreset(preset);
    setActivePresetId(preset.id);
    toast.success(`Layout "${preset.name}" aplicado`);
  }, [onApplyPreset]);

  const handleSave = useCallback(() => {
    if (!presetName.trim()) return;
    const newPreset: LayoutPreset = {
      id: `custom_${Date.now()}`,
      name: presetName.trim(),
      visibleColumns: Array.from(visibleColumns),
      columnOrder: [...columnOrder],
      columnWidths: { ...columnWidths },
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    saveCustomPresets(storageKey, updated);
    setActivePresetId(newPreset.id);
    setSaveDialogOpen(false);
    setPresetName("");
    toast.success(`Layout "${newPreset.name}" guardado`);
  }, [presetName, visibleColumns, columnOrder, columnWidths, customPresets, storageKey]);

  const handleDelete = useCallback((id: string) => {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    saveCustomPresets(storageKey, updated);
    if (activePresetId === id) setActivePresetId(null);
    toast.success("Layout eliminado");
  }, [customPresets, storageKey, activePresetId]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Layouts</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {allPresets.map(preset => (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => handleApply(preset)}
              className="flex items-center justify-between"
            >
              <span>{preset.name}</span>
              <div className="flex items-center gap-1">
                {activePresetId === preset.id && <Check className="h-3 w-3 text-primary" />}
                {!preset.isBuiltIn && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(preset.id); }}
                    className="p-0.5 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Guardar vista atual
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Guardar Layout</DialogTitle>
            <DialogDescription>Dê um nome a este layout para o reutilizar mais tarde.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nome do layout..."
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            maxLength={50}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!presetName.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
