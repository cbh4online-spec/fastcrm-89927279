import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BulkCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onComplete: () => void;
}

export function BulkCostDialog({ open, onOpenChange, selectedIds, onComplete }: BulkCostDialogProps) {
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleApply = async () => {
    const value = parseFloat(cost);
    if (isNaN(value) || value < 0) {
      toast.error("Introduz um valor de custo válido.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("products")
      .update({ direct_cost: value })
      .in("id", selectedIds);

    setLoading(false);

    if (error) {
      toast.error("Erro ao atualizar custo: " + error.message);
      return;
    }

    toast.success(`Custo atualizado em ${selectedIds.length} produto${selectedIds.length !== 1 ? "s" : ""}.`);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setCost("");
    onOpenChange(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); setCost(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Definir Preço de Custo</DialogTitle>
          <DialogDescription>
            Aplicar a {selectedIds.length} produto{selectedIds.length !== 1 ? "s" : ""} selecionado{selectedIds.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="bulk-cost">Custo direto (€)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            <Input
              id="bulk-cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="pl-8"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setCost(""); }} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={loading || !cost}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
