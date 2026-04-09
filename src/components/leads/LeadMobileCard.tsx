import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SmartLead } from "@/hooks/useSmartLeads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Flame,
  Snowflake,
  ThermometerSun,
  Sparkles,
  AlertTriangle,
  MoreHorizontal,
  Reply,
  Target,
  Settings2,
  Archive,
  Clock,
  Building2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadMobileCardProps {
  lead: SmartLead;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
  onClick: () => void;
  duplicateCount?: number;
  onShowDuplicates?: () => void;
}

const temperatureConfig = {
  cold: { emoji: "❄️", label: "Frio", color: "text-blue-500", bg: "bg-blue-500/10" },
  warm: { emoji: "🟡", label: "Morno", color: "text-amber-500", bg: "bg-amber-500/10" },
  hot: { emoji: "🔥", label: "Quente", color: "text-red-500", bg: "bg-red-500/10" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Novo", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { label: "Em Progresso", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  completed: { label: "Qualificado", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

export function LeadMobileCard({
  lead,
  isSelected,
  onToggleSelect,
  onAnalyze,
  isAnalyzing,
  onClick,
  duplicateCount,
  onShowDuplicates,
}: LeadMobileCardProps) {
  const { t } = useTranslation("crm");

  const initials = lead.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const temp = temperatureConfig[lead.ai_temperature];
  const status = statusLabels[lead.status] || statusLabels.new;

  const formatSLA = () => {
    if (lead.hoursSinceLastContact === null) return "—";
    if (lead.hoursSinceLastContact < 1) return "agora";
    if (lead.hoursSinceLastContact < 24) return `${Math.round(lead.hoursSinceLastContact)}h`;
    return `${Math.round(lead.hoursSinceLastContact / 24)}d`;
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 transition-all active:scale-[0.98]",
        isSelected && "ring-2 ring-primary border-primary/40",
        lead.slaBreach && "border-destructive/30 bg-destructive/5"
      )}
      onClick={onClick}
    >
      {/* Row 1: Checkbox + Avatar + Name + Actions */}
      <div className="flex items-start gap-2.5">
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="h-5 w-5"
          />
        </div>

        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm text-foreground truncate">
              {lead.name}
            </span>
            {duplicateCount && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 border-warning/40 bg-warning/10 text-warning shrink-0"
                onClick={(e) => { e.stopPropagation(); onShowDuplicates?.(); }}
              >
                <Copy className="h-2.5 w-2.5 mr-0.5" />
                {duplicateCount}
              </Badge>
            )}
          </div>
          {(lead as any).company_name && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{(lead as any).company_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onAnalyze}
            disabled={isAnalyzing}
          >
            <Sparkles className={cn("w-4 h-4", isAnalyzing && "animate-pulse")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              <DropdownMenuItem asChild>
                <Link to={`/dashboard/leads/${lead.id}`}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t("openDetail")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Reply className="w-4 h-4 mr-2" />
                {t("sendMessage")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Target className="w-4 h-4 mr-2" />
                {t("createOpportunity")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings2 className="w-4 h-4 mr-2" />
                {t("activateAutomation")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Archive className="w-4 h-4 mr-2" />
                {t("archive")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 2: Metadata chips */}
      <div className="flex items-center gap-1.5 mt-2.5 ml-[46px] flex-wrap">
        {/* Status */}
        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", status.color)}>
          {status.label}
        </Badge>

        {/* Temperature */}
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full", temp.bg, temp.color)}>
          {temp.emoji} {temp.label}
        </span>

        {/* Score */}
        <span className={cn(
          "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
          lead.lead_score >= 70 ? "bg-emerald-500/10 text-emerald-600" :
          lead.lead_score >= 40 ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"
        )}>
          {lead.lead_score}pts
        </span>

        {/* SLA */}
        <span className={cn(
          "inline-flex items-center gap-0.5 text-[10px] text-muted-foreground",
          lead.slaBreach && "text-destructive font-medium"
        )}>
          {lead.slaBreach && <AlertTriangle className="w-3 h-3" />}
          <Clock className="w-3 h-3" />
          {formatSLA()}
        </span>
      </div>
    </div>
  );
}
