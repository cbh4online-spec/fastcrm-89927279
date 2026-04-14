import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useUpdateRenewalContract } from "@/hooks/useRenewals";
import type { RenewalContract, RenewalBillingType, RenewalIntervalType, RenewalContractStatus } from "@/types/renewal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: RenewalContract;
}

export function EditRenewalContractDialog({ open, onOpenChange, contract }: Props) {
  const updateContract = useUpdateRenewalContract();

  const [billingType, setBillingType] = useState<RenewalBillingType>(contract.billing_type);
  const [interval, setInterval] = useState<RenewalIntervalType>(contract.renewal_interval);
  const [status, setStatus] = useState<RenewalContractStatus>(contract.status);
  const [autoRenew, setAutoRenew] = useState(contract.auto_renew);
  const [currency, setCurrency] = useState(contract.currency);
  const [paymentTerms, setPaymentTerms] = useState(String(contract.payment_terms_days || "30"));
  const [startDate, setStartDate] = useState<Date>(new Date(contract.start_date));
  const [nextRenewalDate, setNextRenewalDate] = useState<Date | undefined>(
    contract.next_renewal_date ? new Date(contract.next_renewal_date) : undefined
  );
  const [notes, setNotes] = useState(contract.notes || "");
  const [healthScore, setHealthScore] = useState(String(contract.health_score));

  useEffect(() => {
    setBillingType(contract.billing_type);
    setInterval(contract.renewal_interval);
    setStatus(contract.status);
    setAutoRenew(contract.auto_renew);
    setCurrency(contract.currency);
    setPaymentTerms(String(contract.payment_terms_days || "30"));
    setStartDate(new Date(contract.start_date));
    setNextRenewalDate(contract.next_renewal_date ? new Date(contract.next_renewal_date) : undefined);
    setNotes(contract.notes || "");
    setHealthScore(String(contract.health_score));
  }, [contract]);

  const handleSave = () => {
    updateContract.mutate(
      {
        id: contract.id,
        billing_type: billingType,
        renewal_interval: interval,
        status,
        auto_renew: autoRenew,
        currency,
        payment_terms_days: Number(paymentTerms) || 30,
        start_date: startDate.toISOString().split("T")[0],
        next_renewal_date: nextRenewalDate ? nextRenewalDate.toISOString().split("T")[0] : null,
        notes: notes || null,
        health_score: Math.min(100, Math.max(0, Number(healthScore) || 0)),
      } as any,
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contrato de Renovação</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as RenewalContractStatus)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sistema de Pagamento</Label>
              <Select value={billingType} onValueChange={(v) => setBillingType(v as RenewalBillingType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Fatura Manual</SelectItem>
                  <SelectItem value="stripe">Stripe (Automático)</SelectItem>
                  <SelectItem value="external">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Interval + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Periodicidade</Label>
              <Select value={interval} onValueChange={(v) => setInterval(v as RenewalIntervalType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semi_annual">Semestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-9 justify-start text-left font-normal text-sm">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(startDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    className={cn("p-3 pointer-events-auto")}
                    locale={pt}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Próxima Renovação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal text-sm", !nextRenewalDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {nextRenewalDate ? format(nextRenewalDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={nextRenewalDate}
                    onSelect={setNextRenewalDate}
                    className={cn("p-3 pointer-events-auto")}
                    locale={pt}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Payment terms + Health */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Prazo de Pagamento (dias)</Label>
              <Input
                type="number"
                min={0}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Health Score (0-100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={healthScore}
                onChange={(e) => setHealthScore(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Auto-renew */}
          <div className="flex items-center justify-between border rounded-md px-3 py-2">
            <Label className="text-sm">Auto-renew</Label>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas internas sobre este contrato..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateContract.isPending}>
            {updateContract.isPending ? "A guardar..." : "Guardar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
