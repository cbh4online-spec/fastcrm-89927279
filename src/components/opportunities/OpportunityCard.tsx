import { Opportunity } from "@/types/opportunity";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  GripVertical, 
  DollarSign, 
  Building2, 
  Calendar,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { DealScore, getCategoryColors, getCategoryLabel } from "@/hooks/useDealScores";
import { DealHealthBadge } from "@/components/intelligence/DealHealthBadge";
import type { CompactDealIntelligence } from "@/types/dealIntelligence";


interface OpportunityCardProps {
  opportunity: Opportunity;
  isDragging?: boolean;
  onClick?: () => void;
  dealScore?: DealScore;
  healthIntelligence?: CompactDealIntelligence;
}


export function OpportunityCard({ opportunity, isDragging, onClick, dealScore, healthIntelligence }: OpportunityCardProps) {
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
      case "hot": return "Quente";
      case "warm": return "Morno";
      case "cold": return "Frio";
      default: return null;
    }
  };

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const contactName = opportunity.contact?.name || opportunity.lead?.name;
  const companyName = opportunity.company?.name || opportunity.contact?.company;

  const cardContent = (
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition-all",
        isDragging && "opacity-50 rotate-2 shadow-lg",
        onClick && "cursor-pointer",
        dealScore?.urgency === "critical" && "border-red-300/60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          
          {/* Title */}
          <h4 className="font-medium text-foreground text-xs truncate flex-1 min-w-0">
            {opportunity.title}
          </h4>

          {/* Company inline */}
          {companyName && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
              <Building2 className="w-2.5 h-2.5" />
              <span className="truncate max-w-[60px]">{companyName}</span>
            </div>
          )}

          {/* Value */}
          <div className="flex items-center gap-0.5 text-xs font-semibold text-primary flex-shrink-0">
            <DollarSign className="w-3 h-3" />
            {formatCurrency(Number(opportunity.value), opportunity.currency)}
          </div>

          {/* Deal Score Badge */}
          {dealScore ? (
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 h-4 flex-shrink-0 font-semibold", getCategoryColors(dealScore.category))}
            >
              {Math.round(dealScore.close_score)} {getCategoryLabel(dealScore.category)}
            </Badge>
          ) : (
            /* Fallback: probability */
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
              {opportunity.probability}%
            </Badge>
          )}

          {/* Deal Health Badge */}
          <DealHealthBadge intelligence={healthIntelligence} />

          {/* Temperature Badge (ai_temperature) */}
          {opportunity.ai_temperature && (
            <Badge 
              variant="outline" 
              className={cn("text-[10px] px-1.5 py-0 h-4 flex-shrink-0", getTemperatureColor(opportunity.ai_temperature))}
            >
              {getTemperatureLabel(opportunity.ai_temperature)}
            </Badge>
          )}

          {/* Critical urgency icon */}
          {dealScore?.urgency === "critical" && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          )}

          {/* Hot icon */}
          {dealScore?.urgency === "high" && (
            <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          )}

          {/* Close Date */}
          {opportunity.expected_close_date && (
            <div className="hidden md:flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
              <Calendar className="w-2.5 h-2.5" />
              <span>{format(new Date(opportunity.expected_close_date), "d MMM", { locale: pt })}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Wrap in tooltip if there's a next_action
  if (dealScore?.next_action) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          <span className="font-medium">Próxima Ação:</span> {dealScore.next_action}
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}
