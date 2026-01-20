import { useMemo } from "react";
import { Opportunity, PipelineStage, OPPORTUNITY_SOURCES } from "@/types/opportunity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Target,
  Layers,
  Globe,
  Coins,
} from "lucide-react";
import { toast } from "sonner";

interface OpportunityDetailsSectionProps {
  opportunity: Opportunity;
  stages: PipelineStage[];
  onUpdate: (updates: { id: string } & Record<string, unknown>) => Promise<void>;
}

export function OpportunityDetailsSection({
  opportunity,
  stages,
  onUpdate,
}: OpportunityDetailsSectionProps) {
  const handleFieldChange = async (field: string, value: unknown) => {
    try {
      await onUpdate({ id: opportunity.id, [field]: value });
      toast.success("Campo atualizado");
    } catch (error) {
      console.error("Error updating field:", error);
      toast.error("Erro ao atualizar campo");
      throw error;
    }
  };

  const stageOptions = useMemo(() => stages.map((s) => s.name), [stages]);
  const currentStageName = stages.find((s) => s.id === opportunity.stage_id)?.name || "";

  const handleStageChange = async (stageName: unknown) => {
    const stage = stages.find((s) => s.name === stageName);
    if (stage) {
      await onUpdate({
        id: opportunity.id,
        stage_id: stage.id,
        probability: stage.probability,
      });
      toast.success("Etapa atualizada");
    }
  };

  const sourceOptions = OPPORTUNITY_SOURCES.map((s) => s.label);
  const currentSourceLabel = OPPORTUNITY_SOURCES.find((s) => s.value === opportunity.source)?.label || opportunity.source || "";

  const handleSourceChange = async (sourceLabel: unknown) => {
    const source = OPPORTUNITY_SOURCES.find((s) => s.label === sourceLabel);
    if (source) {
      await handleFieldChange("source", source.value);
    }
  };

  const currencyOptions = ["EUR", "USD", "GBP", "BRL"];

  // Calculate weighted value
  const weightedValue = (Number(opportunity.value) * (opportunity.probability || 50)) / 100;

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Financial Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Informação Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 divide-y divide-border/30">
          <InlineEditableField
            label="Título"
            fieldId="title"
            fieldType="text"
            value={opportunity.title}
            onChange={(v) => handleFieldChange("title", v)}
            icon={<Target className="w-4 h-4" />}
            required
          />
          <InlineEditableField
            label="Valor"
            fieldId="value"
            fieldType="currency"
            value={opportunity.value}
            onChange={(v) => handleFieldChange("value", v)}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <InlineEditableField
            label="Moeda"
            fieldId="currency"
            fieldType="select"
            value={opportunity.currency || "EUR"}
            onChange={(v) => handleFieldChange("currency", v)}
            options={currencyOptions}
            icon={<Coins className="w-4 h-4" />}
          />
          <InlineEditableField
            label="Probabilidade"
            fieldId="probability"
            fieldType="number"
            value={opportunity.probability}
            onChange={(v) => handleFieldChange("probability", v)}
            icon={<TrendingUp className="w-4 h-4" />}
            placeholder="%"
          />
          <div className="flex items-center justify-between py-2.5 px-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>Valor Ponderado</span>
            </div>
            <span className="font-medium text-primary">
              {formatCurrency(weightedValue, opportunity.currency || "EUR")}
            </span>
          </div>
          <InlineEditableField
            label="Data Prevista de Fecho"
            fieldId="expected_close_date"
            fieldType="date"
            value={opportunity.expected_close_date}
            onChange={(v) => handleFieldChange("expected_close_date", v)}
            icon={<Calendar className="w-4 h-4" />}
          />
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Classificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 divide-y divide-border/30">
          <InlineEditableField
            label="Etapa"
            fieldId="stage"
            fieldType="select"
            value={currentStageName}
            onChange={handleStageChange}
            options={stageOptions}
            icon={<Layers className="w-4 h-4" />}
          />
          <InlineEditableField
            label="Origem"
            fieldId="source"
            fieldType="select"
            value={currentSourceLabel}
            onChange={handleSourceChange}
            options={sourceOptions}
            icon={<Globe className="w-4 h-4" />}
          />
        </CardContent>
      </Card>
    </div>
  );
}
