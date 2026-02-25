import { Opportunity, PipelineStage } from "@/types/opportunity";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DollarSign,
  Building2,
  Calendar,
  AlertTriangle,
  Zap,
  User,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { DealScore, getCategoryColors } from "@/hooks/useDealScores";
import { DealHealthBadge } from "@/components/intelligence/DealHealthBadge";
import type { CompactDealIntelligence } from "@/types/dealIntelligence";
import { useTranslation } from "react-i18next";
import type { WorkspaceMember } from "@/hooks/useWorkspaceMembers";

interface OpportunityCardProps {
  opportunity: Opportunity;
  isDragging?: boolean;
  onClick?: () => void;
  dealScore?: DealScore;
  healthIntelligence?: CompactDealIntelligence;
  stages?: PipelineStage[];
  ownerProfile?: WorkspaceMember["profile"];
}

const sourceColors: Record<string, string> = {
  website: "bg-green-100 text-green-700 border-green-200",
  referral: "bg-purple-100 text-purple-700 border-purple-200",
  email: "bg-blue-100 text-blue-700 border-blue-200",
  social: "bg-pink-100 text-pink-700 border-pink-200",
  phone: "bg-amber-100 text-amber-700 border-amber-200",
  event: "bg-indigo-100 text-indigo-700 border-indigo-200",
  advertising: "bg-cyan-100 text-cyan-700 border-cyan-200",
  partner: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-muted text-muted-foreground",
};

export function OpportunityCard({
  opportunity,
  isDragging,
  onClick,
  dealScore,
  healthIntelligence,
  stages,
  ownerProfile,
}: OpportunityCardProps) {
  const { t } = useTranslation("crm");

  const getTemperatureColor = (temp: string | null) => {
    switch (temp) {
      case "hot": return "bg-red-100 text-red-700 border-red-200";
      case "warm": return "bg-amber-100 text-amber-700 border-amber-200";
      case "cold": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTemperatureLabel = (temp: string | null) => {
    switch (temp) {
      case "hot": return t("temperatureHot");
      case "warm": return t("temperatureWarm");
      case "cold": return t("temperatureCold");
      default: return null;
    }
  };

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const contactName = opportunity.contact?.name || opportunity.lead?.name;
  const companyName = opportunity.company?.name || opportunity.contact?.company;
  const daysAge = differenceInDays(new Date(), new Date(opportunity.created_at));

  // Stage progress dots
  const currentStageIndex = stages?.findIndex((s) => s.id === opportunity.stage_id) ?? -1;
  const totalStages = stages?.length ?? 0;

  const cardContent = (
    <motion.div
      animate={isDragging ? {
        scale: 1.05,
        rotate: 2,
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
        opacity: 0.8,
      } : {
        scale: 1,
        rotate: 0,
        boxShadow: "0 0px 0px 0px rgba(0,0,0,0)",
        opacity: 1,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition-colors group/card",
        onClick && "cursor-pointer",
        dealScore?.urgency === "critical" && "border-red-300/60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Row 1: Title + badges */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-foreground text-sm leading-tight flex-1 min-w-0 truncate">
            {opportunity.title}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            <DealHealthBadge intelligence={healthIntelligence} />
            {opportunity.ai_temperature && (
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4", getTemperatureColor(opportunity.ai_temperature))}
              >
                {getTemperatureLabel(opportunity.ai_temperature)}
              </Badge>
            )}
            {dealScore?.urgency === "critical" && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
            {dealScore?.urgency === "high" && <Zap className="w-3.5 h-3.5 text-amber-500" />}
          </div>
        </div>

        {/* Row 2: Company */}
        {companyName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{companyName}</span>
          </div>
        )}

        {/* Row 3: Stage progress dots */}
        {totalStages > 0 && currentStageIndex >= 0 && (
          <div className="flex items-center gap-0.5">
            {stages!.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-colors",
                  i <= currentStageIndex
                    ? "bg-primary"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
        )}

        {/* Row 4: Value */}
        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="font-semibold text-sm text-foreground">
            {formatCurrency(Number(opportunity.value), opportunity.currency)}
          </span>
          {dealScore && (
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 h-4 font-semibold ml-auto", getCategoryColors(dealScore.category))}
            >
              {Math.round(dealScore.close_score)}
            </Badge>
          )}
        </div>

        {/* Row 5: Contact */}
        {contactName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{contactName}</span>
          </div>
        )}

        {/* Row 6: Source badge */}
        {opportunity.source && (
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 h-4", sourceColors[opportunity.source] || sourceColors.other)}
            >
              {t(`source${opportunity.source.charAt(0).toUpperCase() + opportunity.source.slice(1)}` as any, opportunity.source)}
            </Badge>
          </div>
        )}

        {/* Row 7: Footer — owner + close date + age */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            {ownerProfile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={ownerProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-muted">
                      {(ownerProfile.full_name || ownerProfile.email || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {ownerProfile.full_name || ownerProfile.email}
                </TooltipContent>
              </Tooltip>
            )}
            {opportunity.expected_close_date && (
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Calendar className="w-2.5 h-2.5" />
                <span>{format(new Date(opportunity.expected_close_date), "d MMM", { locale: pt })}</span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {t("kanbanDaysAgo", { days: daysAge })}
          </span>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );

  if (dealScore?.next_action) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          <span className="font-medium">{t("kanbanNextAction")}</span> {dealScore.next_action}
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}
