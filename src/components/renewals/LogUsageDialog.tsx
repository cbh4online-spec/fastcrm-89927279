import { useState } from "react";
import { useLogRenewalUsage } from "@/hooks/useRenewalUsage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RenewalItem } from "@/types/renewal";

interface LogUsageDialogProps {
  contractId: string;
  items: RenewalItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogUsageDialog({ contractId, items, open, onOpenChange }: LogUsageDialogProps) {
  const logUsage = useLogRenewalUsage();
  const [itemId, setItemId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("manual");

  // Filter to usage-trackable items
  const usageItems = items.filter((i) => ["hours_pack", "retainer", "subscription"].includes(i.item_type));

  const handleSubmit = () => {
    if (!itemId || !amount) return;
    logUsage.mutate(
      {
        contract_id: contractId,
        renewal_item_id: itemId,
        amount: parseFloat(amount),
        source_type: sourceType,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setItemId("");
          setAmount("");
          setDescription("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registar Consumo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger>
              <SelectContent>
                {usageItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 2.5"
              />
            </div>
            <div>
              <Label>Fonte</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="task">Tarefa</SelectItem>
                  <SelectItem value="call">Chamada</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que foi feito..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={logUsage.isPending || !itemId || !amount}>
              {logUsage.isPending ? "A registar..." : "Registar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
