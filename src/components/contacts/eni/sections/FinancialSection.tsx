import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, CreditCard, Clock, AlertCircle, Lock } from "lucide-react";
import { ENIContact, PAYMENT_CONDITIONS, PAYMENT_METHODS } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { useContactPermissions } from "../useContactPermissions";
import { cn } from "@/lib/utils";

interface FinancialSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
}

export function FinancialSection({ 
  contact, 
  onFieldChange,
}: FinancialSectionProps) {
  const { canEdit } = useContactPermissions();
  const canEditFinancial = canEdit('financial');

  // If user can't view financial data, show restricted message
  if (!canEditFinancial) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10">
              <Wallet className="h-4 w-4 text-purple-500" />
            </div>
            Financeiro & Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
            <Lock className="h-5 w-5" />
            <p className="text-sm">Acesso restrito à equipa financeira</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-card dark:from-purple-950/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10">
              <Wallet className="h-4 w-4 text-purple-500" />
            </div>
            Financeiro & Pagamentos
          </CardTitle>
          {contact.credit_active && (
            <Badge 
              variant="outline" 
              className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Crédito Ativo
            </Badge>
          )}
        </div>
        <CardDescription>Condições de pagamento e crédito.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/50">
        {/* Payment Conditions */}
        <InlineEditableField
          label="Condições Pagamento"
          fieldId="payment_conditions"
          fieldType="select"
          value={contact.payment_conditions || ''}
          onChange={(value) => onFieldChange('payment_conditions', value)}
          options={PAYMENT_CONDITIONS}
          icon={<Clock className="h-3.5 w-3.5" />}
        />

        {/* Preferred Payment Method */}
        <InlineEditableField
          label="Forma de Pagamento"
          fieldId="preferred_payment_method"
          fieldType="select"
          value={contact.preferred_payment_method || ''}
          onChange={(value) => onFieldChange('preferred_payment_method', value)}
          options={PAYMENT_METHODS}
          icon={<CreditCard className="h-3.5 w-3.5" />}
        />

        {/* Credit Limit */}
        <InlineEditableField
          label="Plafond de Crédito"
          fieldId="credit_limit"
          fieldType="currency"
          value={contact.credit_limit}
          onChange={(value) => onFieldChange('credit_limit', value)}
          placeholder="0.00"
        />

        {/* Credit Active */}
        <InlineEditableField
          label="Plafond Ativo"
          fieldId="credit_active"
          fieldType="boolean"
          value={contact.credit_active || false}
          onChange={(value) => onFieldChange('credit_active', value)}
        />
      </CardContent>
    </Card>
  );
}
