import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Opportunity } from "@/types/opportunity";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MoreHorizontal, 
  User, 
  Building2, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { pt, enUS, es, fr } from "date-fns/locale";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";
import { DealScore, getCategoryColors, getCategoryLabel } from "@/hooks/useDealScores";
import type { CompactDealIntelligence } from "@/types/dealIntelligence";
import { DealHealthBadge } from "@/components/intelligence/DealHealthBadge";

const dateLocales: Record<string, typeof pt> = { pt, en: enUS, es, fr };

interface OpportunityTableViewProps {
  opportunities: Opportunity[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpportunityClick: (opportunity: Opportunity) => void;
  onMarkAsWon: (id: string) => void;
  onMarkAsLost: (id: string) => void;
  scoresMap?: Map<string, DealScore>;
  healthMap?: Map<string, CompactDealIntelligence>;
}


export function OpportunityTableView({
  opportunities,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpportunityClick,
  onMarkAsWon,
  onMarkAsLost,
  scoresMap,
  healthMap,
}: OpportunityTableViewProps) {
  const { t } = useTranslation('crm');
  const locale = dateLocales[i18n.language] || pt;
  const [scoreSortDir, setScoreSortDir] = useState<"asc" | "desc" | null>(null);
  const [healthSortDir, setHealthSortDir] = useState<"asc" | "desc" | null>(null);

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-green-100 text-green-700 border-green-200">{t('oppStatusWon')}</Badge>;
      case "lost":
        return <Badge className="bg-red-100 text-red-700 border-red-200">{t('oppStatusLost')}</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">{t('oppStatusOpen')}</Badge>;
    }
  };

  const getTemperatureColor = (temp: string | null) => {
    switch (temp) {
      case "hot": return "bg-red-500";
      case "warm": return "bg-amber-500";
      case "cold": return "bg-blue-500";
      default: return "bg-muted";
    }
  };

  const healthRank: Record<string, number> = { AT_RISK: 0, WATCH: 1, HEALTHY: 2 };

  const sortedOpportunities = (() => {
    if (healthSortDir && healthMap) {
      return [...opportunities].sort((a, b) => {
        const ha = healthRank[healthMap.get(a.id)?.health_label ?? "HEALTHY"] ?? 2;
        const hb = healthRank[healthMap.get(b.id)?.health_label ?? "HEALTHY"] ?? 2;
        return healthSortDir === "desc" ? ha - hb : hb - ha;
      });
    }
    if (scoreSortDir && scoresMap) {
      return [...opportunities].sort((a, b) => {
        const sa = scoresMap.get(a.id)?.close_score ?? -1;
        const sb = scoresMap.get(b.id)?.close_score ?? -1;
        return scoreSortDir === "desc" ? sb - sa : sa - sb;
      });
    }
    return opportunities;
  })();

  const allSelected = opportunities.length > 0 && selectedIds.length === opportunities.length;

  const handleScoreSort = () => {
    setHealthSortDir(null);
    setScoreSortDir((prev) =>
      prev === null ? "desc" : prev === "desc" ? "asc" : null
    );
  };

  const handleHealthSort = () => {
    setScoreSortDir(null);
    setHealthSortDir((prev) =>
      prev === null ? "desc" : prev === "desc" ? "asc" : null
    );
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>{t('oppTableOpportunity')}</TableHead>
            <TableHead>{t('oppTableContact')}</TableHead>
            <TableHead>{t('oppTableCompany')}</TableHead>
            <TableHead>{t('oppTableStage')}</TableHead>
            <TableHead className="text-right">{t('oppTableValue')}</TableHead>
            <TableHead className="text-center">{t('oppTableProb')}</TableHead>
            <TableHead className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs font-medium gap-1"
                onClick={handleScoreSort}
              >
                <ArrowUpDown className="w-3 h-3" />
                {t('oppTableScore')}
                {scoreSortDir && (
                  <span className="text-primary">{scoreSortDir === "desc" ? "↓" : "↑"}</span>
                )}
              </Button>
            </TableHead>
            <TableHead>{t('oppTableCloseDate')}</TableHead>
            <TableHead className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs font-medium gap-1"
                onClick={handleHealthSort}
              >
                <ArrowUpDown className="w-3 h-3" />
                {t('oppTableHealth')}
                {healthSortDir && (
                  <span className="text-primary">{healthSortDir === "desc" ? "↓" : "↑"}</span>
                )}
              </Button>
            </TableHead>
            <TableHead>{t('oppTableStatus')}</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOpportunities.map((opp) => {
            const score = scoresMap?.get(opp.id);
            return (
              <TableRow
                key={opp.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  selectedIds.includes(opp.id) && "bg-muted/30"
                )}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(opp.id)}
                    onCheckedChange={() => onSelect(opp.id)}
                  />
                </TableCell>
                <TableCell 
                  className="font-medium" 
                  onClick={() => onOpportunityClick(opp)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", getTemperatureColor(opp.ai_temperature))} />
                    <span className="hover:text-primary">{opp.title}</span>
                    {opp.ai_next_action && (
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {opp.contact?.name || opp.lead?.name ? (
                    <div className="flex items-center gap-1 text-sm">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {opp.contact?.name || opp.lead?.name}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {opp.company?.name || opp.contact?.company ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {opp.company?.name || opp.contact?.company}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {opp.stage && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: opp.stage.color }}
                      />
                      <span className="text-sm">{opp.stage.name}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(Number(opp.value), opp.currency)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {opp.probability}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {score ? (
                    <div className="flex items-center justify-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold", getCategoryColors(score.category))}
                      >
                        {Math.round(score.close_score)} · {getCategoryLabel(score.category)}
                      </Badge>
                      {score.urgency === "critical" && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {opp.expected_close_date ? (
                    <span className="text-sm">
                      {format(new Date(opp.expected_close_date), "d MMM yyyy", { locale })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <DealHealthBadge intelligence={healthMap?.get(opp.id)} />
                </TableCell>
                <TableCell>{getStatusBadge(opp.status)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpportunityClick(opp)}>
                        {t('oppTableViewDetails')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {opp.status === "open" && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onMarkAsWon(opp.id)}
                            className="text-green-600"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {t('oppTableMarkWon')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onMarkAsLost(opp.id)}
                            className="text-red-600"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {t('oppTableMarkLost')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {opportunities.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                {t('noOpportunitiesFound')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Footer with per-column calculation placeholders */}
      <div className="border-t">
        <div className="flex items-center text-xs text-muted-foreground">
          {/* Checkbox col */}
          <div className="w-12 px-4 py-2" />
          {/* First col: count */}
          <div className="flex-1 px-4 py-2 font-medium">
            {opportunities.length} {t('tableRowCount', 'count')}
          </div>
          {/* Remaining cols: add calculation placeholder */}
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex-1 px-4 py-2">
              <button
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors text-[11px]"
                onClick={() => {}}
                title={t('addCalculation', '+ Add calculation')}
              >
                {t('addCalculation', '+ Add calculation')}
              </button>
            </div>
          ))}
          {/* Actions col */}
          <div className="w-10" />
        </div>
      </div>
    </div>
  );
}
