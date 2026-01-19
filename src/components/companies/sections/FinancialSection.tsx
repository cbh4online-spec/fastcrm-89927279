import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Clock } from "lucide-react";
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

interface FinancialSectionProps {
  company: Company;
  onFieldChange: (field: keyof Company, value: unknown) => Promise<void>;
}

export function FinancialSection({ company, onFieldChange }: FinancialSectionProps) {
  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-card dark:from-purple-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-500/10">
            <Wallet className="h-4 w-4 text-purple-500" />
          </div>
          Financeiro & Pagamentos
        </CardTitle>
        <CardDescription>
          Condições de pagamento da empresa
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
      </CardContent>
    </Card>
  );
}
