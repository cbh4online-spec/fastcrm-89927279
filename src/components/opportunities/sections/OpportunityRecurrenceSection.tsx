import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CalendarClock,
  CreditCard,
  DollarSign,
  RefreshCw,
  Settings,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUpdateOpportunityEnhanced } from "@/hooks/useOpportunitiesEnhanced";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { BILLING_FREQUENCY_LABELS, PAYMENT_PROVIDER_LABELS, calculateMRR } from "@/types/subscription";
import type { BillingFrequency, PaymentProvider } from "@/types/subscription";
import { ConvertOpportunityDialog } from "@/components/subscriptions/ConvertOpportunityDialog";
import { ManageSubscriptionSheet } from "@/components/subscriptions/ManageSubscriptionSheet";

interface OpportunityRecurrenceSectionProps {
  opportunity: {
    id: string;
    title: string;
    value: number;
    billing_type?: string | null;
    mrr_amount?: number | null;
    billing_frequency?: string | null;
    contract_months?: number | null;
    tcv_amount?: number | null;
    start_date?: string | null;
    renewal_date?: string | null;
    subscription_status?: string | null;
    last_payment_date?: string | null;
    next_payment_date?: string | null;
    payment_provider?: string | null;
    churn_reason?: string | null;
  };
  onUpdate: (data: { id: string } & Record<string, unknown>) => Promise<void>;
}

const SUBSCRIPTION_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Rascunho", color: "text-muted-foreground", bgColor: "bg-muted" },
  active: { label: "Ativa", color: "text-green-600", bgColor: "bg-green-50" },
  paused: { label: "Pausada", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  past_due: { label: "Em Atraso", color: "text-orange-600", bgColor: "bg-orange-50" },
  canceled: { label: "Cancelada", color: "text-red-600", bgColor: "bg-red-50" },
};

export function OpportunityRecurrenceSection({
  opportunity,
  onUpdate,
}: OpportunityRecurrenceSectionProps) {
  const updateOpportunity = useUpdateOpportunityEnhanced();
  const { data: subscriptions = [] } = useSubscriptions();
  
  const [isRecurring, setIsRecurring] = useState(opportunity.billing_type === "recurring");
  const [mrrAmount, setMrrAmount] = useState(opportunity.mrr_amount || opportunity.value || 0);
  const [frequency, setFrequency] = useState<BillingFrequency>(
    (opportunity.billing_frequency as BillingFrequency) || "monthly"
  );
  const [contractMonths, setContractMonths] = useState(opportunity.contract_months || 12);
  const [startDate, setStartDate] = useState(opportunity.start_date || "");
  const [renewalDate, setRenewalDate] = useState(opportunity.renewal_date || "");
  const [provider, setProvider] = useState<PaymentProvider>(
    (opportunity.payment_provider as PaymentProvider) || "manual"
  );
  
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showManageSheet, setShowManageSheet] = useState(false);

  // Find linked subscription
  const linkedSubscription = useMemo(() => {
    return subscriptions.find((s) => s.opportunity_id === opportunity.id);
  }, [subscriptions, opportunity.id]);

  // Calculate TCV
  const tcvAmount = useMemo(() => {
    const mrr = calculateMRR(mrrAmount, frequency);
    return mrr * contractMonths;
  }, [mrrAmount, frequency, contractMonths]);

  // Calculate MRR from amount
  const calculatedMRR = useMemo(() => {
    return calculateMRR(mrrAmount, frequency);
  }, [mrrAmount, frequency]);

  // Update opportunity when fields change
  const handleSave = async () => {
    await onUpdate({
      id: opportunity.id,
      billing_type: isRecurring ? "recurring" : "one_time",
      mrr_amount: isRecurring ? mrrAmount : null,
      billing_frequency: isRecurring ? frequency : null,
      contract_months: isRecurring ? contractMonths : null,
      tcv_amount: isRecurring ? tcvAmount : null,
      start_date: isRecurring && startDate ? startDate : null,
      renewal_date: isRecurring && renewalDate ? renewalDate : null,
      payment_provider: isRecurring ? provider : null,
    });
  };

  // Auto-save on toggle change
  useEffect(() => {
    if (!isRecurring && opportunity.billing_type === "recurring") {
      handleSave();
    }
  }, [isRecurring]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const subscriptionStatus = opportunity.subscription_status || (linkedSubscription?.status);
  const statusConfig = subscriptionStatus ? SUBSCRIPTION_STATUS_CONFIG[subscriptionStatus] : null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Recorrência
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="billing-toggle" className="text-sm text-muted-foreground">
                Venda Única
              </Label>
              <Switch
                id="billing-toggle"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="billing-toggle" className="text-sm font-medium">
                Recorrente
              </Label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isRecurring ? (
            <>
              {/* Recurring Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor do Contrato (€)</Label>
                  <Input
                    type="number"
                    value={mrrAmount}
                    onChange={(e) => setMrrAmount(Number(e.target.value))}
                    onBlur={handleSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => {
                      setFrequency(v as BillingFrequency);
                      setTimeout(handleSave, 100);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BILLING_FREQUENCY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duração (meses)</Label>
                  <Input
                    type="number"
                    value={contractMonths}
                    onChange={(e) => setContractMonths(Number(e.target.value))}
                    onBlur={handleSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={provider}
                    onValueChange={(v) => {
                      setProvider(v as PaymentProvider);
                      setTimeout(handleSave, 100);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_PROVIDER_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onBlur={handleSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Renovação</Label>
                  <Input
                    type="date"
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    onBlur={handleSave}
                  />
                </div>
              </div>

              {/* Calculated Values */}
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    MRR
                  </span>
                  <span className="font-semibold text-primary">{formatCurrency(calculatedMRR)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ARR</span>
                  <span className="font-medium">{formatCurrency(calculatedMRR * 12)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">TCV (Total Contract Value)</span>
                  <span className="font-medium">{formatCurrency(tcvAmount)}</span>
                </div>
              </div>

              {/* Subscription Status Block */}
              {(subscriptionStatus || linkedSubscription) && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Estado da Subscrição
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Estado:</span>
                      {statusConfig ? (
                        <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
                          {statusConfig.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Não criada</Badge>
                      )}
                    </div>
                    
                    {(opportunity.last_payment_date || linkedSubscription?.last_payment_date) && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarClock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Último pagamento:</span>
                        <span>
                          {format(
                            new Date(opportunity.last_payment_date || linkedSubscription?.last_payment_date!),
                            "dd MMM yyyy",
                            { locale: pt }
                          )}
                        </span>
                      </div>
                    )}
                    
                    {(opportunity.next_payment_date || linkedSubscription?.next_payment_date) && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarClock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Próximo pagamento:</span>
                        <span>
                          {format(
                            new Date(opportunity.next_payment_date || linkedSubscription?.next_payment_date!),
                            "dd MMM yyyy",
                            { locale: pt }
                          )}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {linkedSubscription ? (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowManageSheet(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Gerir Subscrição
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    onClick={() => setShowConvertDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Subscrição
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 p-4 rounded-lg border border-dashed text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Esta oportunidade é uma venda única (one-time).</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convert Dialog */}
      <ConvertOpportunityDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        opportunity={{
          id: opportunity.id,
          title: opportunity.title,
          value: mrrAmount,
        }}
      />

      {/* Manage Subscription Sheet */}
      {linkedSubscription && (
        <ManageSubscriptionSheet
          open={showManageSheet}
          onOpenChange={setShowManageSheet}
          subscription={linkedSubscription}
        />
      )}
    </>
  );
}
