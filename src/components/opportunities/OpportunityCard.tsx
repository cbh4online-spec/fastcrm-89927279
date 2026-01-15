import { Opportunity } from "@/types/opportunity";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GripVertical, 
  DollarSign, 
  User, 
  Building2, 
  Calendar,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface OpportunityCardProps {
  opportunity: Opportunity;
  isDragging?: boolean;
  onClick?: () => void;
}

export function OpportunityCard({ opportunity, isDragging, onClick }: OpportunityCardProps) {
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

  return (
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition-all",
        isDragging && "opacity-50 rotate-2 shadow-lg",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title and AI Badge */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-foreground line-clamp-2 text-sm">
                {opportunity.title}
              </h4>
              {opportunity.ai_temperature && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs flex-shrink-0", getTemperatureColor(opportunity.ai_temperature))}
                >
                  {getTemperatureLabel(opportunity.ai_temperature)}
                </Badge>
              )}
            </div>

            {/* Contact/Lead */}
            {contactName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span className="truncate">{contactName}</span>
              </div>
            )}

            {/* Company */}
            {companyName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{companyName}</span>
              </div>
            )}

            {/* Value and Probability */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                <DollarSign className="w-3.5 h-3.5" />
                {formatCurrency(Number(opportunity.value), opportunity.currency)}
              </div>
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                {opportunity.probability}%
              </Badge>
            </div>

            {/* Expected Close Date */}
            {opportunity.expected_close_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>
                  {format(new Date(opportunity.expected_close_date), "d MMM", { locale: pt })}
                </span>
              </div>
            )}

            {/* AI Next Action */}
            {opportunity.ai_next_action && (
              <div className="flex items-start gap-1 pt-1 text-xs text-muted-foreground bg-muted/50 rounded p-1.5">
                <Sparkles className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{opportunity.ai_next_action}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
