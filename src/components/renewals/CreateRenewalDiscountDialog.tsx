import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { useCreateRenewalDiscount } from "@/hooks/useRenewalDiscounts";
import type { RenewalItem, RenewalDiscountType } from "@/types/renewal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  items: RenewalItem[];
}

const DISCOUNT_REASONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "retention", label: "Retenção" },
  { value: "upgrade", label: "Upgrade / Upsell" },
  { value: "campaign", label: "Campanha" },
  { value: "negotiation", label: "Negociação comercial" },
  { value: "loyalty", label: "Fidelização" },
  { value: "other", label: "Outro" },
] as const;

const PRESETS = [
  { label: "10%", type: "percentage" as const, value: 10 },
  { label: "25%", type: "percentage" as const, value: 25 },
  { label: "50%", type: "percentage" as const, value: 50 },
  { label: "1º mês grátis", type: "percentage" as const, value: 100, cycles: 1 },
];

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
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Calculate current MRR from items
  const currentMRR = useMemo(() => {
    if (itemId === "all") {
      return items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);
    }
    const item = items.find((i) => i.id === itemId);
    return item ? item.unit_price * item.qty : 0;
  }, [items, itemId]);

  // Calculate discounted MRR
  const discountedMRR = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (val <= 0) return currentMRR;
    if (discountType === "percentage") {
      return currentMRR * (1 - Math.min(val, 100) / 100);
    }
    return Math.max(0, currentMRR - val);
  }, [currentMRR, discountType, discountValue]);

  const savings = currentMRR - discountedMRR;

  // Validation
  const valueNum = Number(discountValue) || 0;
  const valueError = useMemo(() => {
    if (!discountValue) return null;
    if (valueNum <= 0) return "O valor deve ser maior que 0";
    if (discountType === "percentage" && valueNum > 100) return "Percentagem máxima: 100%";
    if (discountType === "fixed_amount" && valueNum > currentMRR) return `Valor máximo: ${currentMRR.toFixed(2)}€`;
    return null;
  }, [discountValue, discountType, valueNum, currentMRR]);

  const isValid = name.trim() && discountValue && valueNum > 0 && !valueError && reason;

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setDiscountType(preset.type);
    setDiscountValue(String(preset.value));
    if (preset.cycles) setMaxCycles(String(preset.cycles));
    if (!name && preset.label) {
      setName(`Desconto ${preset.label}`);
    }
  };

  const handleSubmit = () => {
    if (!isValid) return;

    const fullNotes = [
      reason ? `Motivo: ${DISCOUNT_REASONS.find(r => r.value === reason)?.label || reason}` : "",
      notes,
    ].filter(Boolean).join("\n");

    createDiscount.mutate({
      contract_id: contractId,
      renewal_item_id: itemId === "all" ? null : itemId,
      name: name.trim(),
      discount_type: discountType,
      discount_value: valueNum,
      start_date: startDate,
      end_date: endDate || null,
      max_cycles: maxCycles ? Number(maxCycles) : null,
      notes: fullNotes || null,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Adicionar Desconto / Promoção
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {!showConfirm ? (
            <div className="space-y-5 pb-4">
              {/* Presets */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Presets rápidos</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <Button
                      key={p.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => applyPreset(p)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Name */}
              <div>
                <Label>Nome da promoção <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Ex: Desconto Onboarding 50%"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Reason */}
              <div>
                <Label>Motivo <span className="text-destructive">*</span></Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type + Value */}
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
                  <Label>Valor <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    max={discountType === "percentage" ? 100 : undefined}
                    step="0.01"
                    placeholder={discountType === "percentage" ? "50" : "63.50"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                  {valueError && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {valueError}
                    </p>
                  )}
                </div>
              </div>

              {/* Apply to */}
              <div>
                <Label>Aplicar a</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Contrato inteiro</SelectItem>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({formatCurrency(item.unit_price * item.qty)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data início</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Data fim <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
                </div>
              </div>

              {/* Max cycles */}
              <div>
                <Label>Nº máximo de ciclos <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 3"
                  value={maxCycles}
                  onChange={(e) => setMaxCycles(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Deixe vazio para desconto permanente (ou até data fim)</p>
              </div>

              {/* Notes */}
              <div>
                <Label>Notas <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Textarea
                  placeholder="Contexto ou condições do desconto..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>

              {/* Impact Preview */}
              {valueNum > 0 && !valueError && (
                <>
                  <Separator />
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Impacto estimado</Label>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Atual</p>
                        <p className="font-semibold">{formatCurrency(currentMRR)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Com desconto</p>
                        <p className="font-semibold text-primary">{formatCurrency(discountedMRR)}</p>
                      </div>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        -{formatCurrency(savings)}/ciclo
                      </Badge>
                    </div>
                    {maxCycles && (
                      <p className="text-xs text-muted-foreground">
                        Economia total estimada: <span className="font-medium">{formatCurrency(savings * Number(maxCycles))}</span> em {maxCycles} ciclo{Number(maxCycles) !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Confirmation screen */
            <div className="space-y-4 pb-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h4 className="font-semibold text-sm">Resumo do desconto</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Nome</span>
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground">Motivo</span>
                  <span className="font-medium">{DISCOUNT_REASONS.find(r => r.value === reason)?.label}</span>
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="font-medium">
                    {discountType === "percentage" ? `${discountValue}%` : formatCurrency(valueNum)}
                  </span>
                  <span className="text-muted-foreground">Aplicar a</span>
                  <span className="font-medium">
                    {itemId === "all" ? "Contrato inteiro" : items.find(i => i.id === itemId)?.name}
                  </span>
                  <span className="text-muted-foreground">Período</span>
                  <span className="font-medium">
                    {startDate}{endDate ? ` → ${endDate}` : " → Sem fim"}
                  </span>
                  {maxCycles && (
                    <>
                      <span className="text-muted-foreground">Ciclos máx.</span>
                      <span className="font-medium">{maxCycles}</span>
                    </>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Impacto por ciclo</span>
                  <span className="font-semibold text-primary">-{formatCurrency(savings)}</span>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          {!showConfirm ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => setShowConfirm(true)} disabled={!isValid}>
                Rever e Confirmar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Voltar</Button>
              <Button onClick={handleSubmit} disabled={createDiscount.isPending}>
                {createDiscount.isPending ? "A criar..." : "Confirmar Desconto"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
