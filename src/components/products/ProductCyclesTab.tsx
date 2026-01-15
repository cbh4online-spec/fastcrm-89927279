import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Clock, Zap, Loader2 } from "lucide-react";
import {
  useProductCycles,
  useCreateProductCycle,
  useUpdateProductCycle,
  useDeleteProductCycle,
} from "@/hooks/useProductCycles";
import {
  cycleTriggerLabels,
  cycleActionLabels,
  type CycleTriggerType,
  type CycleActionType,
  type Product,
} from "@/types/product";

interface ProductCyclesTabProps {
  product: Product;
}

export function ProductCyclesTab({ product }: ProductCyclesTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<CycleTriggerType>("days_after_purchase");
  const [triggerValue, setTriggerValue] = useState("30");
  const [actionType, setActionType] = useState<CycleActionType>("create_task");

  const { data: cycles, isLoading } = useProductCycles(product.id);
  const createCycle = useCreateProductCycle();
  const updateCycle = useUpdateProductCycle();
  const deleteCycle = useDeleteProductCycle();

  const handleCreate = async () => {
    await createCycle.mutateAsync({
      productId: product.id,
      name,
      triggerType,
      triggerValue: parseInt(triggerValue) || 30,
      actionType,
    });
    setCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setTriggerType("days_after_purchase");
    setTriggerValue("30");
    setActionType("create_task");
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    await updateCycle.mutateAsync({
      id,
      productId: product.id,
      isActive: !currentValue,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteCycle.mutateAsync({ id, productId: product.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ciclos automáticos para este produto
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Ciclo
        </Button>
      </div>

      {cycles && cycles.length > 0 ? (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <Card key={cycle.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-primary" />
                    <p className="font-medium">{cycle.name}</p>
                    <Badge
                      variant={cycle.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleActive(cycle.id, cycle.is_active)}
                    >
                      {cycle.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Gatilho:</span>{" "}
                    {cycleTriggerLabels[cycle.trigger_type]} = {cycle.trigger_value}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Ação:</span>{" "}
                    {cycleActionLabels[cycle.action_type]}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(cycle.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>Nenhum ciclo configurado.</p>
          <p className="text-sm">
            Ciclos criam tarefas e comunicações automaticamente.
          </p>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Ciclo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do ciclo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Follow-up 30 dias"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gatilho</Label>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as CycleTriggerType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(cycleTriggerLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  min="1"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as CycleActionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(cycleActionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!name || createCycle.isPending}>
              {createCycle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
