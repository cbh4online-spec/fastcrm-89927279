import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateStockCount, useStockLocations, type StockCountScope } from "@/hooks/useStockCounts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewStockCountDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const createCount = useCreateStockCount();
  const { data: locations = [] } = useStockLocations();

  const defaultName = useMemo(
    () => `Contagem ${new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}`,
    [],
  );

  const [name, setName] = useState(defaultName);
  const [scope, setScope] = useState<StockCountScope>("all");
  const [category, setCategory] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [blind, setBlind] = useState(true);
  const [notes, setNotes] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("workspace_id", currentWorkspace!.id)
        .not("category", "is", null);
      if (error) throw error;
      return Array.from(new Set((data || []).map((r: any) => r.category).filter(Boolean))).sort() as string[];
    },
  });

  const canSubmit =
    name.trim().length >= 3 &&
    (scope !== "category" || !!category) &&
    (scope !== "location" || !!locationId) &&
    !createCount.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const created = await createCount.mutateAsync({
        name,
        scope_type: scope,
        scope_category: category || null,
        location_id: locationId || null,
        blind_count: blind,
        notes,
      });
      toast.success("Contagem criada");
      onOpenChange(false);
      navigate(`/dashboard/stock-counts/${created.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível criar a contagem");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova contagem de stock</DialogTitle>
          <DialogDescription>
            As quantidades atuais ficam congeladas no momento em que a contagem é criada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="count-name">Nome</Label>
            <Input id="count-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label>Âmbito</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as StockCountScope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Inventário total</SelectItem>
                <SelectItem value="category">Por categoria</SelectItem>
                <SelectItem value="location" disabled={locations.length === 0}>
                  Por localização {locations.length === 0 ? "(sem localizações)" : ""}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "category" && (
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Escolher categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(scope === "location" || locations.length > 0) && (
            <div className="space-y-1.5">
              <Label>Localização {scope === "location" ? "" : "(opcional)"}</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder="Escolher localização" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
            <div className="min-w-0">
              <Label htmlFor="blind-count" className="cursor-pointer">Contagem cega</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Esconde a quantidade do sistema durante a contagem, para não enviesar quem conta.
              </p>
            </div>
            <Switch id="blind-count" checked={blind} onCheckedChange={setBlind} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="count-notes">Notas (opcional)</Label>
            <Textarea id="count-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createCount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar contagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
