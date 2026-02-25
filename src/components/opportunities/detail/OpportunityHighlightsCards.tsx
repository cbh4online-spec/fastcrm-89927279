import { Opportunity, PipelineStage } from "@/types/opportunity";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Building2, Layers, User, DollarSign } from "lucide-react";
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
  const stageIndex = stages.findIndex(s => s.id === opportunity.stage_id);
  const stageProgress = stages.length > 0 ? ((stageIndex + 1) / stages.length) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Main highlights row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Deal Stage */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
            <Layers className="w-3.5 h-3.5" />
            {t("oppDetail_dealStage")}
          </div>
          <p className="text-sm font-semibold">{currentStage?.name || "—"}</p>
          <Progress
            value={stageProgress}
            className="h-1.5"
            style={{ "--progress-color": currentStage?.color || "hsl(var(--primary))" } as React.CSSProperties}
          />
        </div>

        {/* Deal Owner */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
            <User className="w-3.5 h-3.5" />
            {t("oppDetail_dealOwner")}
          </div>
          <div className="flex items-center gap-2">
            {ownerName && ownerName !== "—" ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {ownerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold">{ownerName}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>

        {/* Associated Company */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
            <Building2 className="w-3.5 h-3.5" />
            {t("oppDetail_associatedCompany")}
          </div>
          <div className="flex items-center gap-2">
            {companyName ? (
              <>
                <Avatar className="h-6 w-6 rounded-md">
                  <AvatarFallback className="text-[10px] rounded-md bg-primary text-primary-foreground">
                    {companyName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold">{companyName}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Deal value row */}
      <div className="border-t pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
          <DollarSign className="w-3.5 h-3.5" />
          {t("oppDetail_dealValue")}
        </div>
        {Number(opportunity.value) > 0 ? (
          <p className="text-lg font-bold">
            {formatCurrency(Number(opportunity.value), opportunity.currency || "EUR")}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("oppDetail_noDealValue")}</p>
        )}
      </div>
    </div>
  );
}
