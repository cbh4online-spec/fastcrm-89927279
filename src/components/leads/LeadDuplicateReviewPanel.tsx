import { useState } from "react";
import {
  useLeadDuplicateGroupsPersisted,
  useDetectLeadDuplicates,
  useUpdateDuplicateGroupStatus,
  DuplicateGroup,
} from "@/hooks/useLeadDuplicateEngine";
import { LeadMergeComparisonDialog } from "./LeadMergeComparisonDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, RefreshCw, Merge, Eye, X, CheckCircle2,
  AlertTriangle, Zap, Loader2, Users, Mail, Phone,
  Building2, Hash, Shield, ArrowRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const matchTypeConfig: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  exact: { label: "Exacto", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Shield },
  strong: { label: "Forte", color: "bg-warning/10 text-warning border-warning/20", icon: AlertTriangle },
  probable: { label: "Provável", color: "bg-primary/10 text-primary border-primary/20", icon: Search },
};

function getConfidenceColor(score: number) {
  if (score >= 90) return "text-destructive";
  if (score >= 70) return "text-warning";
  return "text-primary";
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  onMerge: (group: DuplicateGroup) => void;
  onIgnore: (groupId: string) => void;
  onMarkNotDuplicate: (groupId: string) => void;
  onQuickMerge: (group: DuplicateGroup) => void;
}

function DuplicateGroupCard({ group, onMerge, onIgnore, onMarkNotDuplicate, onQuickMerge }: DuplicateGroupCardProps) {
  const config = matchTypeConfig[group.match_type] || matchTypeConfig.probable;
  const Icon = config.icon;
  const isHighConfidence = group.confidence_score >= 90;

  return (
    <Card className={cn("transition-all hover:shadow-md", isHighConfidence && "border-destructive/30")}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs border", config.color)}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <span className={cn("text-sm font-bold", getConfidenceColor(group.confidence_score))}>
              {Math.round(group.confidence_score)}%
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {group.items.length} leads
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {group.matched_fields.map(f => (
              <Badge key={f} variant="outline" className="text-[9px] px-1.5 py-0">
                {f}
              </Badge>
            ))}
          </div>
        </div>

        {/* Reason */}
        <p className="text-xs text-muted-foreground mb-3">{group.duplicate_reason}</p>

        {/* Lead previews */}
        <div className="space-y-2 mb-3">
          {group.items.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border text-sm",
                item.is_master_candidate ? "border-primary/30 bg-primary/5" : "border-border/50"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  {item.is_master_candidate && (
                    <Badge variant="default" className="text-[9px] shrink-0">Master</Badge>
                  )}
                  <span className="font-medium truncate text-sm">{item.lead?.name || "—"}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
                  {item.lead?.email && (
                    <span className="flex items-center gap-1 truncate max-w-[180px]"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{item.lead.email}</span></span>
                  )}
                  {item.lead?.phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{item.lead.phone}</span>
                  )}
                  <span className="hidden sm:flex items-center gap-1">
                    {item.lead?.company_name && (
                      <><Building2 className="h-3 w-3 shrink-0" />{item.lead.company_name}</>
                    )}
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    {item.lead?.tax_id && (
                      <><Hash className="h-3 w-3 shrink-0" />{item.lead.tax_id}</>
                    )}
                  </span>
                  {(item.lead?._relatedCounts?.opportunities > 0 || item.lead?._relatedCounts?.conversations > 0) && (
                    <Badge variant="outline" className="text-[9px]">
                      {item.lead._relatedCounts.opportunities}opp · {item.lead._relatedCounts.conversations}conv
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => onIgnore(group.id)}>
              <X className="h-3 w-3 mr-1" /> <span className="hidden xs:inline">Ignorar</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => onMarkNotDuplicate(group.id)}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> <span className="hidden sm:inline">Não é duplicado</span><span className="sm:hidden">Não dup.</span>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {isHighConfidence && (
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1 px-2" onClick={() => onQuickMerge(group)}>
                <Zap className="h-3 w-3" /> <span className="hidden sm:inline">Quick Merge</span><span className="sm:hidden">Quick</span>
              </Button>
            )}
            <Button size="sm" className="text-xs h-7 gap-1 px-2" onClick={() => onMerge(group)}>
              <Merge className="h-3 w-3" /> Merge
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadDuplicateReviewPanel() {
  const { data: groups = [], isLoading } = useLeadDuplicateGroupsPersisted();
  const detectDuplicates = useDetectLeadDuplicates();
  const updateStatus = useUpdateDuplicateGroupStatus();
  const [mergeGroup, setMergeGroup] = useState<DuplicateGroup | null>(null);
  const [filter, setFilter] = useState<"all" | "exact" | "strong" | "probable">("all");

  const filteredGroups = filter === "all" ? groups : groups.filter(g => g.match_type === filter);

  const exactCount = groups.filter(g => g.match_type === "exact").length;
  const strongCount = groups.filter(g => g.match_type === "strong").length;
  const probableCount = groups.filter(g => g.match_type === "probable").length;

  const handleIgnore = (groupId: string) => {
    updateStatus.mutate({ groupId, status: "ignored" });
  };

  const handleMarkNotDuplicate = (groupId: string) => {
    updateStatus.mutate({ groupId, status: "not_duplicate" });
  };

  const handleQuickMerge = (group: DuplicateGroup) => {
    const master = group.items.find(i => i.is_master_candidate) || group.items[0];
    const mergedIds = group.items.filter(i => i.lead_id !== master.lead_id).map(i => i.lead_id);
    // Open merge dialog with pre-selections
    setMergeGroup(group);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary shrink-0" />
            Duplicate Review
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {groups.length} grupo(s) de duplicados pendentes
          </p>
        </div>
        <Button
          onClick={() => detectDuplicates.mutate()}
          disabled={detectDuplicates.isPending}
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 self-start sm:self-auto"
        >
          {detectDuplicates.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Scan Duplicados
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className="text-xs h-7"
        >
          Todos ({groups.length})
        </Button>
        <Button
          variant={filter === "exact" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("exact")}
          className="text-xs h-7 gap-1"
        >
          <Shield className="h-3 w-3" />
          Exactos ({exactCount})
        </Button>
        <Button
          variant={filter === "strong" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("strong")}
          className="text-xs h-7 gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          Fortes ({strongCount})
        </Button>
        <Button
          variant={filter === "probable" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("probable")}
          className="text-xs h-7 gap-1"
        >
          <Search className="h-3 w-3" />
          Prováveis ({probableCount})
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mb-3" />
            <h4 className="text-lg font-medium">Base de dados limpa</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {groups.length === 0
                ? "Nenhum duplicado encontrado. Clique em 'Scan Duplicados' para verificar."
                : "Nenhum duplicado nesta categoria."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3 pr-4">
            {filteredGroups.map(group => (
              <DuplicateGroupCard
                key={group.id}
                group={group}
                onMerge={setMergeGroup}
                onIgnore={handleIgnore}
                onMarkNotDuplicate={handleMarkNotDuplicate}
                onQuickMerge={handleQuickMerge}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Merge Dialog */}
      {mergeGroup && (
        <LeadMergeComparisonDialog
          open={!!mergeGroup}
          onOpenChange={(open) => !open && setMergeGroup(null)}
          group={mergeGroup}
        />
      )}
    </div>
  );
}
