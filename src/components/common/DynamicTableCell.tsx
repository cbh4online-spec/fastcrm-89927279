import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Check, X, ExternalLink, Flame, ThermometerSun, Snowflake, Clock, AlertTriangle, Zap, Sparkles, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// Format currency values
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value}`;
};

// Format date values
const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: pt });
  } catch {
    return dateStr;
  }
};

// Format percentage values
const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return `${value}%`;
};

// Temperature display component
const temperatureConfig = {
  cold: { emoji: "❄️", label: "Frio", color: "text-blue-500", bg: "bg-blue-500/10" },
  warm: { emoji: "🟡", label: "Morno", color: "text-amber-500", bg: "bg-amber-500/10" },
  hot: { emoji: "🔥", label: "Quente", color: "text-red-500", bg: "bg-red-500/10" },
};

const contactTypeLabels: Record<string, { label: string; color: string }> = {
  decision_maker: { label: "Decisor", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  influencer: { label: "Influenciador", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  champion: { label: "Champion", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  blocker: { label: "Blocker", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  end_user: { label: "Utilizador", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  unknown: { label: "Desconhecido", color: "bg-muted text-muted-foreground" },
};

interface DynamicTableCellProps {
  columnId: string;
  entity: Record<string, any>;
  entityType: "contact" | "lead" | "company";
}

export function DynamicTableCell({ columnId, entity, entityType }: DynamicTableCellProps) {
  // Map column IDs to actual entity properties
  const getValue = () => {
    switch (columnId) {
      // AI mappings
      case "temperature":
        return entity.ai_temperature;
      case "score":
        return entityType === "contact" ? entity.contact_score : 
               entityType === "lead" ? entity.lead_score : entity.company_score;
      case "type":
        return entity.ai_contact_type || entity.ai_lead_type || entity.ai_company_type;
      case "next_action":
        return entity.ai_next_action;
      case "insight":
        return entity.ai_insight;
      case "ai_analyzed_at":
        return entity.ai_analyzed_at;
      case "conversion_prob":
        return entity.conversion_probability;
      case "automation":
        return entity.automation_active;
      case "sla":
        return entity.hoursSinceLastContact;
      default:
        return entity[columnId];
    }
  };

  const value = getValue();

  // Handle specific column types
  switch (columnId) {
    case "temperature": {
      const temp = temperatureConfig[value as keyof typeof temperatureConfig];
      if (!temp) return <span className="text-muted-foreground">—</span>;
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", temp.bg, temp.color)}>
          <span>{temp.emoji}</span>
          <span>{temp.label}</span>
        </div>
      );
    }

    case "score": {
      const score = typeof value === "number" ? value : 0;
      return (
        <div className="flex items-center gap-2">
          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                score >= 70 ? "bg-emerald-500" :
                score >= 40 ? "bg-amber-500" : "bg-muted-foreground"
              )}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className={cn(
            "text-sm font-medium tabular-nums",
            score >= 70 ? "text-emerald-600" :
            score >= 40 ? "text-amber-600" : "text-muted-foreground"
          )}>
            {score}
          </span>
        </div>
      );
    }

    case "type": {
      const typeConfig = contactTypeLabels[value || "unknown"];
      return (
        <Badge variant="outline" className={cn("text-xs", typeConfig.color)}>
          <UserCheck className="w-3 h-3 mr-1" />
          {typeConfig.label}
        </Badge>
      );
    }

    case "sla": {
      const hours = value;
      const slaBreach = entity.slaBreach;
      const formatSLA = () => {
        if (hours === null || hours === undefined) return "—";
        if (hours < 1) return "Agora";
        if (hours < 24) return `${Math.round(hours)}h`;
        return `${Math.round(hours / 24)}d`;
      };
      return (
        <div className={cn("flex items-center gap-1 text-xs", slaBreach && "text-destructive font-medium")}>
          {slaBreach && <AlertTriangle className="w-3 h-3" />}
          <Clock className="w-3 h-3 text-muted-foreground" />
          {formatSLA()}
        </div>
      );
    }

    case "automation": {
      if (value) {
        return (
          <Badge variant="outline" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
            <Zap className="w-3 h-3" />
            Ativa
          </Badge>
        );
      }
      return <span className="text-xs text-muted-foreground">—</span>;
    }

    case "next_action": {
      if (!value) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs max-w-[140px]">
                <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="text-muted-foreground truncate">{value}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">{value}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    case "insight": {
      if (!value) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[180px]">
                <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="truncate">{value}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[250px]">{value}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Currency columns
    case "estimated_value":
    case "credit_limit":
    case "average_ticket":
    case "total_revenue":
    case "sales_2023":
    case "sales_2024":
    case "sales_2025":
    case "sales_2026":
    case "capital_social":
      return <span className="text-sm font-medium text-emerald-600">{formatCurrency(value)}</span>;

    // Percentage columns
    case "conversion_prob":
    case "conversion_probability":
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${value || 0}%` }} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{formatPercent(value)}</span>
        </div>
      );

    // Date columns
    case "created_at":
    case "updated_at":
    case "ai_analyzed_at":
    case "last_contact_at":
    case "last_purchase_date":
    case "activity_start_date":
    case "client_since":
    case "founding_date":
      return <span className="text-xs text-muted-foreground">{formatDate(value)}</span>;

    // Boolean columns
    case "has_whatsapp":
    case "credit_active":
    case "automation_active":
    case "is_primary_contact":
    case "is_fiscal_address":
      return value ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground/30" />
      );

    // URL columns
    case "linkedin_url":
    case "facebook_url":
    case "instagram_url":
    case "twitter_url":
    case "website":
      if (!value) return <span className="text-muted-foreground">—</span>;
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-primary hover:underline flex items-center gap-1 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          Link
        </a>
      );

    // Array columns (tags, services, etc.)
    case "tags":
    case "services":
    case "cae_codes":
      if (!value || !Array.isArray(value) || value.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {value.slice(0, 2).map((item: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {item}
            </Badge>
          ))}
          {value.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{value.length - 2}
            </Badge>
          )}
        </div>
      );

    // Number columns (rating, reviews count, etc.)
    case "rating":
      if (!value) return <span className="text-muted-foreground">—</span>;
      return <span className="text-sm">⭐ {value.toFixed(1)}</span>;

    case "reviews_count":
    case "price_level":
      if (!value) return <span className="text-muted-foreground">—</span>;
      return <span className="text-sm text-muted-foreground">{value}</span>;

    // Default text handling
    default:
      if (value === null || value === undefined || value === "") {
        return <span className="text-muted-foreground">—</span>;
      }
      if (typeof value === "object") {
        return <span className="text-xs text-muted-foreground">{JSON.stringify(value)}</span>;
      }
      return <span className="text-sm truncate max-w-[150px]">{String(value)}</span>;
  }
}
