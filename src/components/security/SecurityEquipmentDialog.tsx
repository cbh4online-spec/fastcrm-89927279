import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSecurityEquipmentCatalog } from "@/hooks/security/useSecurityEquipment";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecurityEquipmentDialog({ open, onOpenChange }: Props) {
  const { createItem } = useSecurityEquipmentCatalog();
  const [form, setForm] = useState({
    brand: "",
    model: "",
    reference: "",
    category: "",
    subtype: "",
    compatibility_notes: "",
  });
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const addSpec = () => {
    if (!newSpecKey.trim()) return;
    setSpecs((s) => ({ ...s, [newSpecKey.trim()]: newSpecValue.trim() }));
    setNewSpecKey("");
    setNewSpecValue("");
  };

  const removeSpec = (key: string) => {
    setSpecs((s) => {
      const n = { ...s };
      delete n[key];
      return n;
    });
  };

  const handleSubmit = () => {
    if (!form.brand || !form.model) return;
    const payload: any = { ...form };
    if (Object.keys(specs).length > 0) payload.technical_specs_json = specs;
    createItem.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({ brand: "", model: "", reference: "", category: "", subtype: "", compatibility_notes: "" });
        setSpecs({});
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar ao Catálogo Técnico</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Marca *</Label><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Ex: Hikvision" /></div>
            <div><Label>Modelo *</Label><Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Ex: DS-2CD2143G2-I" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Referência</Label><Input value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="SKU / Part Number" /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="camera">Câmara</SelectItem>
                  <SelectItem value="recorder">Gravador</SelectItem>
                  <SelectItem value="sensor">Sensor</SelectItem>
                  <SelectItem value="detector">Detetor</SelectItem>
                  <SelectItem value="central">Central</SelectItem>
                  <SelectItem value="accessory">Acessório</SelectItem>
                  <SelectItem value="cable">Cablagem</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Subtipo</Label><Input value={form.subtype} onChange={(e) => set("subtype", e.target.value)} placeholder="Ex: Dome, Bullet, Turret..." /></div>

          {/* Specs Section */}
          <div className="border rounded-md p-3 space-y-2">
            <Label className="text-sm font-semibold">Especificações Técnicas</Label>
            {Object.entries(specs).length > 0 && (
              <div className="space-y-1">
                {Object.entries(specs).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                    <span className="font-medium flex-1">{key}</span>
                    <span className="text-muted-foreground flex-1">{val}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSpec(key)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="Parâmetro" value={newSpecKey} onChange={(e) => setNewSpecKey(e.target.value)} className="flex-1 h-8 text-sm" />
              <Input placeholder="Valor" value={newSpecValue} onChange={(e) => setNewSpecValue(e.target.value)} className="flex-1 h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && addSpec()} />
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={addSpec} disabled={!newSpecKey.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Ex: Resolução → 4MP, IP → IP67, IR → 30m, Lente → 2.8mm</p>
          </div>

          <div><Label>Notas de Compatibilidade</Label><Textarea value={form.compatibility_notes} onChange={(e) => set("compatibility_notes", e.target.value)} rows={2} placeholder="Compatível com gravadores série 7600..." /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.brand || !form.model || createItem.isPending}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
