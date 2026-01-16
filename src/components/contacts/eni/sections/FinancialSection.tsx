import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Euro, Clock, Lock } from "lucide-react";
import { ENIContact, PAYMENT_CONDITIONS, PAYMENT_METHODS } from "../ENIContactTypes";
import { useContactPermissions } from "../useContactPermissions";

interface FinancialSectionProps {
  contact: ENIContact;
  isEditing: boolean;
  editedData: Partial<ENIContact>;
  onFieldChange: (field: keyof ENIContact, value: unknown) => void;
}

export function FinancialSection({ 
  contact, 
  isEditing, 
  editedData, 
  onFieldChange 
}: FinancialSectionProps) {
  const { canView, canEdit } = useContactPermissions();

  // Check permissions
  if (!canView("financial")) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            Financeiro & Pagamentos
          </CardTitle>
          <CardDescription>
            <Badge variant="outline" className="text-xs">Acesso restrito</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Não tem permissões para ver esta secção.
          </p>
        </CardContent>
      </Card>
    );
  }

  const canEditSection = canEdit("financial");
  const effectiveIsEditing = isEditing && canEditSection;

  const getValue = <K extends keyof ENIContact>(field: K): ENIContact[K] => {
    return effectiveIsEditing && field in editedData ? editedData[field] as ENIContact[K] : contact[field];
  };

  return (
    <Card className="border-blue-200/50 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-800/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Financeiro & Pagamentos
            </CardTitle>
            <CardDescription>Condições financeiras e métodos de pagamento.</CardDescription>
          </div>
          {!canEditSection && (
            <Badge variant="outline" className="text-xs gap-1">
              <Lock className="h-3 w-3" />
              Só leitura
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Conditions */}
        <div className="space-y-2">
          <Label htmlFor="payment_conditions" className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Condições de Pagamento
          </Label>
          {effectiveIsEditing ? (
            <Select
              value={getValue('payment_conditions') || ''}
              onValueChange={(value) => onFieldChange('payment_conditions', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione as condições" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_CONDITIONS.map((condition) => (
                  <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">{getValue('payment_conditions') || '—'}</p>
          )}
        </div>

        {/* Preferred Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="preferred_payment_method">Forma de Pagamento Preferida</Label>
          {effectiveIsEditing ? (
            <Select
              value={getValue('preferred_payment_method') || ''}
              onValueChange={(value) => onFieldChange('preferred_payment_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">{getValue('preferred_payment_method') || '—'}</p>
          )}
        </div>

        {/* Credit Limit */}
        <div className="space-y-2">
          <Label htmlFor="credit_limit" className="flex items-center gap-2">
            <Euro className="h-3.5 w-3.5" />
            Plafond de Crédito
          </Label>
          {effectiveIsEditing ? (
            <Input
              id="credit_limit"
              type="number"
              min="0"
              step="100"
              value={getValue('credit_limit') || ''}
              onChange={(e) => onFieldChange('credit_limit', parseFloat(e.target.value) || null)}
              placeholder="0.00"
            />
          ) : (
            <p className="text-sm">
              {getValue('credit_limit') 
                ? `€ ${Number(getValue('credit_limit')).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`
                : '—'}
            </p>
          )}
        </div>

        {/* Credit Active */}
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="credit_active">Plafond Ativo</Label>
            <p className="text-xs text-muted-foreground">
              Ativar limite de crédito para este cliente
            </p>
          </div>
          <Switch
            id="credit_active"
            checked={getValue('credit_active') || false}
            onCheckedChange={(checked) => onFieldChange('credit_active', checked)}
            disabled={!effectiveIsEditing}
          />
        </div>
      </CardContent>
    </Card>
  );
}
