import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Clock, CreditCard, Banknote } from "lucide-react";
import { Company } from "@/hooks/useCompanies";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";

const PAYMENT_CONDITIONS = [
  'Pronto Pagamento',
  '15 dias',
  '30 dias',
  '45 dias',
  '60 dias',
  '90 dias',
];

const PAYMENT_METHODS = [
  'Transferência Bancária',
  'Multibanco',
  'MB Way',
  'Cartão de Crédito',
  'Débito Direto',
  'Cheque',
  'Numerário',
];

interface FinancialSectionProps {
  company: Company;
  onFieldChange: (field: keyof Company, value: unknown) => Promise<void>;
}

export function FinancialSection({ company, onFieldChange }: FinancialSectionProps) {
  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-card dark:from-purple-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10">
              <Wallet className="h-4 w-4 text-purple-500" />
            </div>
            Financeiro & Pagamentos
          </CardTitle>
          {company.credit_active && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              Crédito Ativo
            </Badge>
          )}
        </div>
        <CardDescription>
          Condições de pagamento e crédito da empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/50">
        <InlineEditableField
          label="Condições de Pagamento"
          fieldId="payment_conditions"
          fieldType="select"
          value={company.payment_conditions || ''}
          onChange={(value) => onFieldChange('payment_conditions', value)}
          options={PAYMENT_CONDITIONS}
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <InlineEditableField
          label="Forma de Pagamento Preferida"
          fieldId="preferred_payment_method"
          fieldType="select"
          value={company.preferred_payment_method || ''}
          onChange={(value) => onFieldChange('preferred_payment_method', value)}
          options={PAYMENT_METHODS}
          icon={<CreditCard className="h-3.5 w-3.5" />}
        />
        <InlineEditableField
          label="Limite de Crédito"
          fieldId="credit_limit"
          fieldType="currency"
          value={company.credit_limit}
          onChange={(value) => onFieldChange('credit_limit', value)}
          icon={<Banknote className="h-3.5 w-3.5" />}
        />
        <InlineEditableField
          label="Crédito Ativo"
          fieldId="credit_active"
          fieldType="boolean"
          value={company.credit_active || false}
          onChange={(value) => onFieldChange('credit_active', value)}
          icon={<Wallet className="h-3.5 w-3.5" />}
        />
      </CardContent>
    </Card>
  );
}
