import { Opportunity, PipelineStage, OPPORTUNITY_SOURCES } from "@/types/opportunity";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, DollarSign, Layers, User } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useTranslation } from "react-i18next";

interface OpportunityHighlightsCardsProps {
  opportunity: Opportunity;
  stages: PipelineStage[];
  ownerName?: string;
}

export function OpportunityHighlightsCards({ opportunity, stages, ownerName }: OpportunityHighlightsCardsProps) {
  const { t } = useTranslation("crm");
  const currentStage = stages.find(s => s.id === opportunity.stage_id);
  const companyName = opportunity.company?.name;
  const sourceLabel = OPPORTUNITY_SOURCES.find(s => s.value === opportunity.source)?.label;

  const cards = [
    {
      label: t("oppDetail_dealStage"),
      value: currentStage?.name || "—",
      icon: <Layers className="w-4 h-4" />,
      color: currentStage?.color || "hsl(var(--primary))",
      type: "stage" as const,
    },
    {
      label: t("oppDetail_dealOwner"),
      value: ownerName || "—",
      icon: <User className="w-4 h-4" />,
      type: "owner" as const,
    },
    {
      label: t("oppDetail_associatedCompany"),
      value: companyName || "—",
      icon: <Building2 className="w-4 h-4" />,
      type: "company" as const,
    },
    {
      label: t("oppDetail_dealValue"),
      value: formatCurrency(Number(opportunity.value) || 0, opportunity.currency || "EUR"),
      icon: <DollarSign className="w-4 h-4" />,
      type: "value" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.type}
          className="group relative rounded-xl border border-border/60 bg-card p-4 hover:border-border transition-colors"
        >
          {card.type === "stage" && card.color && (
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" 
              style={{ backgroundColor: card.color }} 
            />
          )}
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            {card.icon}
            <span className="text-xs font-medium uppercase tracking-wider">{card.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {card.type === "owner" && card.value !== "—" && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {card.value.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            {card.type === "company" && card.value !== "—" && (
              <Avatar className="h-6 w-6 rounded-md">
                <AvatarFallback className="text-[10px] rounded-md bg-primary text-primary-foreground">
                  {card.value.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="text-sm font-semibold truncate">{card.value}</span>
            {card.type === "stage" && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {opportunity.probability}%
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
