import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Percent, Coins, FileText } from "lucide-react";
import { Opportunity } from "@/types/opportunity";
import { toast } from "sonner";

interface OpportunityCommissionSectionProps {
  opportunity: Opportunity;
  onUpdate: (updates: { id: string } & Record<string, unknown>) => Promise<void>;
}

export function OpportunityCommissionSection({
  opportunity,
  onUpdate,
}: OpportunityCommissionSectionProps) {
  const handleFieldChange = async (field: string, value: unknown) => {
    try {
      await onUpdate({ id: opportunity.id, [field]: value });
      toast.success("Comissão atualizada");
    } catch (error) {
      console.error("Error updating commission:", error);
      toast.error("Erro ao atualizar comissão");
    }
  };

  // Calculate commission value from percentage
  const calculatedCommission = opportunity.commission_percentage 
    ? (opportunity.value * opportunity.commission_percentage / 100)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          Comissão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 divide-y divide-border/30">
        <InlineEditableField
          label="Percentagem (%)"
          fieldId="commission_percentage"
          fieldType="number"
          value={opportunity.commission_percentage ?? ""}
          onChange={(value) => handleFieldChange("commission_percentage", value || null)}
          icon={<Percent className="h-3.5 w-3.5" />}
          placeholder="0"
        />
        <InlineEditableField
          label="Valor Fixo (€)"
          fieldId="commission_amount"
          fieldType="currency"
          value={opportunity.commission_amount ?? ""}
          onChange={(value) => handleFieldChange("commission_amount", value || null)}
          icon={<Coins className="h-3.5 w-3.5" />}
          placeholder="0.00"
        />
        {calculatedCommission !== null && calculatedCommission > 0 && (
          <div className="flex items-center justify-between py-2.5 px-1">
            <span className="text-sm text-muted-foreground">Comissão Calculada</span>
            <span className="text-sm font-medium text-primary">
              {calculatedCommission.toLocaleString("pt-PT", {
                style: "currency",
                currency: opportunity.currency || "EUR",
              })}
            </span>
          </div>
        )}
        <InlineEditableField
          label="Notas"
          fieldId="commission_notes"
          fieldType="textarea"
          value={opportunity.commission_notes ?? ""}
          onChange={(value) => handleFieldChange("commission_notes", value || null)}
          icon={<FileText className="h-3.5 w-3.5" />}
          placeholder="Notas sobre comissão..."
        />
      </CardContent>
    </Card>
  );
}
