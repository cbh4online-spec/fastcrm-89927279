import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, FileText, Clock, Sparkles } from "lucide-react";
import { PAYMENT_CONDITIONS, VALIDITY_DAYS_OPTIONS, type PaymentConditionValue } from "./proposalConstants";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { SectionAIAssistButton } from "./SectionAIAssistButton";
import { AISuggestionIndicator } from "@/components/ai/AIConfidenceDisplay";

export interface ConditionsData {
  paymentConditions: string;
  customPaymentConditions: string;
  validityDays: number;
  notes: string;
  isAIGenerated?: boolean;
}

interface ProposalConditionsSectionProps {
  data: ConditionsData;
  onChange: (data: ConditionsData) => void;
  createdAt?: string | Date;
  disabled?: boolean;
  onGenerateWithAI?: () => void;
  isGenerating?: boolean;
}

export function ProposalConditionsSection({
  data,
  onChange,
  createdAt,
  disabled = false,
  onGenerateWithAI,
  isGenerating = false,
}: ProposalConditionsSectionProps) {
  // Calculate expiry date
  const expiryDate = useMemo(() => {
    const baseDate = createdAt ? new Date(createdAt) : new Date();
    return addDays(baseDate, data.validityDays);
  }, [createdAt, data.validityDays]);

  const isCustomPayment = data.paymentConditions === "custom";

  const handlePaymentConditionChange = (value: string) => {
    onChange({
      ...data,
      paymentConditions: value,
      // Clear custom conditions when switching to predefined
      customPaymentConditions: value === "custom" ? data.customPaymentConditions : "",
    });
  };

  const getPaymentLabel = (value: string) => {
    if (value === "custom") return data.customPaymentConditions || "Personalizado";
    return PAYMENT_CONDITIONS.find((p) => p.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      {/* AI Suggest Button */}
      {onGenerateWithAI && !disabled && (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Sugerir condições de pagamento</span>
          </div>
          <SectionAIAssistButton
            onClick={onGenerateWithAI}
            isLoading={isGenerating}
            label="Sugerir com IA"
            tooltip="A IA irá sugerir condições baseadas no valor e tipo de cliente"
          />
        </div>
      )}

      {/* AI Generated Badge */}
      {data.isAIGenerated && (
        <AISuggestionIndicator isAIGenerated={true} />
      )}
      {/* Payment Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Condições de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Prazo de Pagamento</Label>
            <Select
              value={data.paymentConditions}
              onValueChange={handlePaymentConditionChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar condição..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_CONDITIONS.map((condition) => (
                  <SelectItem key={condition.value} value={condition.value}>
                    {condition.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCustomPayment && (
            <div className="space-y-2">
              <Label htmlFor="custom-payment">Condições Personalizadas</Label>
              <Input
                id="custom-payment"
                value={data.customPaymentConditions}
                onChange={(e) =>
                  onChange({ ...data, customPaymentConditions: e.target.value })
                }
                placeholder="Ex: 50% adiantamento, 50% na entrega"
                disabled={disabled}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validity Period */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Validade da Proposta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dias de Validade</Label>
              <Select
                value={data.validityDays.toString()}
                onValueChange={(v) => onChange({ ...data, validityDays: parseInt(v, 10) })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {VALIDITY_DAYS_OPTIONS.map((days) => (
                    <SelectItem key={days} value={days.toString()}>
                      {days} dias
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Válida até</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {format(expiryDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {data.validityDays} dias
            </Badge>
            <span className="text-sm text-muted-foreground">
              A proposta expira automaticamente após este período
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Observações e Termos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionais</Label>
            <Textarea
              id="notes"
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              placeholder="Termos legais, observações importantes, condições especiais..."
              rows={4}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Estas notas aparecerão no rodapé da proposta
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
