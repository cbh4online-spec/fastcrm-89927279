import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateRenewalDiscount } from "@/hooks/useRenewalDiscounts";
import type { RenewalItem, RenewalDiscountType } from "@/types/renewal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  items: RenewalItem[];
}

export function CreateRenewalDiscountDialog({ open, onOpenChange, contractId, items }: Props) {
  const createDiscount = useCreateRenewalDiscount();
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<RenewalDiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [maxCycles, setMaxCycles] = useState("");
  const [itemId, setItemId] = useState<string>("all");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!name || !discountValue || Number(discountValue) <= 0) return;

    createDiscount.mutate({
      contract_id: contractId,
      renewal_item_id: itemId === "all" ? null : itemId,
      name,
      discount_type: discountType,
      discount_value: Number(discountValue),
      start_date: startDate,
      end_date: endDate || null,
      max_cycles: maxCycles ? Number(maxCycles) : null,
      notes: notes || null,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Desconto / Promoção</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da promoção</Label>
            <Input placeholder="Ex: Desconto Onboarding 50%" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as RenewalDiscountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentagem (%)</SelectItem>
                  <SelectItem value="fixed_amount">Valor Fixo (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={discountType === "percentage" ? "50" : "63.50"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Aplicar a</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Contrato inteiro</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Data fim (opcional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Nº máximo de ciclos (opcional)</Label>
            <Input
              type="number"
              min="1"
              placeholder="Ex: 3"
              value={maxCycles}
              onChange={(e) => setMaxCycles(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Deixe vazio para desconto permanente (ou até data fim)</p>
          </div>
          <div>
            <Label>Notas (opcional)</Label>
            <Textarea placeholder="Contexto ou condições do desconto..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name || !discountValue || createDiscount.isPending}>
            {createDiscount.isPending ? "A criar..." : "Criar Desconto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
