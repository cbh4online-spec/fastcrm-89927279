import { useState } from "react";
import { Opportunity, PipelineStage } from "@/types/opportunity";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Layers, User, DollarSign, Sparkles, Plus, GripVertical, Settings, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEFAULT_HIGHLIGHTS } from "@/hooks/useOpportunityLayoutPreferences";

interface OpportunityHighlightsCardsProps {
  opportunity: Opportunity;
  stages: PipelineStage[];
  ownerName?: string;
  visibleHighlights?: string[];
  highlightsOrder?: string[];
  onOpenConfig?: () => void;
}

function HighlightCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        "relative group rounded-lg border border-border/50 bg-card p-3 space-y-2 transition-all hover:border-border hover:shadow-sm",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 z-10">
          <button className="p-0.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-muted-foreground">
            <GripVertical className="w-3 h-3" />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

export function OpportunityHighlightsCards({
  opportunity,
  stages,
  ownerName,
  visibleHighlights,
  highlightsOrder,
  onOpenConfig,
}: OpportunityHighlightsCardsProps) {
  const { t } = useTranslation("crm");
  const currentStage = stages.find(s => s.id === opportunity.stage_id);
  const companyName = opportunity.company?.name;
  const stageIndex = stages.findIndex(s => s.id === opportunity.stage_id);
  const stageProgress = stages.length > 0 ? ((stageIndex + 1) / stages.length) * 100 : 0;

  const visible = visibleHighlights ?? DEFAULT_HIGHLIGHTS;
  const order = highlightsOrder ?? DEFAULT_HIGHLIGHTS;
  const orderedVisible = order.filter(id => visible.includes(id));

  const widgetCount = orderedVisible.length;
  const maxWidgets = 6;

  const cardRenderers: Record<string, () => React.ReactNode> = {
    stage: () => (
      <HighlightCard key="stage">
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
      </HighlightCard>
    ),
    owner: () => (
      <HighlightCard key="owner">
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
      </HighlightCard>
    ),
    company: () => (
      <HighlightCard key="company">
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
      </HighlightCard>
    ),
    documents: () => (
      <HighlightCard key="documents">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
            <FileText className="w-3.5 h-3.5" />
            {t("oppDetail_documents")}
          </div>
          <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
            PandaDoc
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground italic">{t("oppDetail_noDocuments")}</p>
      </HighlightCard>
    ),
    value: () => (
      <HighlightCard key="value" className="col-span-full">
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
      </HighlightCard>
    ),
  };

  // Separate value card (full width) from grid cards
  const gridCards = orderedVisible.filter(id => id !== 'value');
  const showValue = orderedVisible.includes('value');

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Highlights
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={onOpenConfig}
            title={t("oppLayout_configureLayout")}
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30"
            onClick={() => toast.info(t("oppDetail_addWidgetSoon"))}
          >
            <Plus className="w-3 h-3" />
            {t("oppDetail_addWidget")} ({widgetCount}/{maxWidgets})
          </Button>
        </div>
      </div>

      {/* Grid cards */}
      {gridCards.length > 0 && (
        <div className={cn("grid gap-3", gridCards.length === 1 ? "grid-cols-1" : gridCards.length === 2 ? "grid-cols-2" : gridCards.length === 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4")}>
          {gridCards.map(id => cardRenderers[id]?.())}
        </div>
      )}

      {/* Value card (full width) */}
      {showValue && cardRenderers.value?.()}
    </div>
  );
}
