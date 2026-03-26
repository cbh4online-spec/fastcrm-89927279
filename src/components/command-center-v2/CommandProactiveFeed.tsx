import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AlertTriangle, TrendingDown, Clock, Flame, UserX, FileWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { differenceInDays, isBefore } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface KernelSignal {
  id: string;
  type: "stale_deal" | "overdue_task" | "cold_lead" | "churn_risk" | "pipeline_gap" | "quota_risk";
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  command: string; // Command to execute when clicked
  entityId?: string;
  entityName?: string;
}

const signalConfig: Record<string, { icon: any; color: string; badgeVariant: string }> = {
  critical: { icon: AlertTriangle, color: "text-destructive", badgeVariant: "bg-destructive/10 text-destructive border-destructive/20" },
  warning: { icon: TrendingDown, color: "text-amber-500", badgeVariant: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  info: { icon: Clock, color: "text-blue-500", badgeVariant: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

const typeIcons: Record<string, any> = {
  stale_deal: Clock,
  overdue_task: FileWarning,
  cold_lead: UserX,
  churn_risk: AlertTriangle,
  pipeline_gap: TrendingDown,
  quota_risk: Flame,
};

interface CommandProactiveFeedProps {
  onSignalClick: (command: string) => void;
}

export function CommandProactiveFeed({ onSignalClick }: CommandProactiveFeedProps) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: signals = [], isLoading } = useQuery({
    queryKey: ["kernel-signals", wid],
    enabled: !!wid,
    refetchInterval: 120_000, // Refresh every 2 minutes
    queryFn: async (): Promise<KernelSignal[]> => {
      const now = new Date();
      const result: KernelSignal[] = [];

      // 1. Stale deals (no activity > 7 days)
      const { data: staleDeals } = await supabase
        .from("opportunities")
        .select("id, title, updated_at, last_activity_at, value")
        .eq("workspace_id", wid!)
        .in("status", ["open", "active", "negotiation"])
        .order("updated_at", { ascending: true })
        .limit(50);

      (staleDeals || []).forEach((deal) => {
        const lastActivity = deal.last_activity_at ? new Date(deal.last_activity_at) : new Date(deal.updated_at);
        const days = differenceInDays(now, lastActivity);
        if (days >= 7) {
          result.push({
            id: `stale-${deal.id}`,
            type: "stale_deal",
            severity: days > 14 ? "critical" : "warning",
            title: `Deal parado há ${days} dias`,
            detail: deal.title || "Oportunidade sem atividade",
            command: `Analisa o deal "${deal.title}" que está parado há ${days} dias`,
            entityId: deal.id,
            entityName: deal.title || undefined,
          });
        }
      });

      // 2. Overdue tasks
      const { data: overdueTasks } = await supabase
        .from("tasks")
        .select("id, title, due_at")
        .eq("workspace_id", wid!)
        .eq("status", "pending")
        .lt("due_at", now.toISOString())
        .order("due_at", { ascending: true })
        .limit(10);

      if ((overdueTasks?.length || 0) > 0) {
        const count = overdueTasks!.length;
        result.push({
          id: "overdue-tasks",
          type: "overdue_task",
          severity: count > 3 ? "critical" : "warning",
          title: `${count} tarefa${count > 1 ? "s" : ""} em atraso`,
          detail: overdueTasks![0].title || "Tarefas pendentes ultrapassaram o prazo",
          command: "Quais são as minhas tarefas em atraso e como priorizá-las?",
        });
      }

      // 3. Cold leads (no recent interaction)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: coldLeads, count: coldCount } = await supabase
        .from("leads")
        .select("id, name", { count: "exact", head: false })
        .eq("workspace_id", wid!)
        .eq("status", "new")
        .lt("updated_at", sevenDaysAgo)
        .limit(5);

      if ((coldCount || 0) > 0) {
        result.push({
          id: "cold-leads",
          type: "cold_lead",
          severity: (coldCount || 0) > 5 ? "warning" : "info",
          title: `${coldCount} lead${(coldCount || 0) > 1 ? "s" : ""} a esfriar`,
          detail: "Leads sem interação há mais de 7 dias",
          command: "Quais leads estão a esfriar e precisam de atenção urgente?",
        });
      }

      // 4. Pipeline coverage check
      const { data: pipelineOpps } = await supabase
        .from("opportunities")
        .select("value")
        .eq("workspace_id", wid!)
        .in("status", ["open", "active", "negotiation"]);

      const pipelineTotal = (pipelineOpps || []).reduce((s, o) => s + (o.value || 0), 0);
      
      // Get monthly target
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { data: targets } = await supabase
        .from("performance_targets")
        .select("target_value")
        .eq("workspace_id", wid!)
        .eq("metric_type", "revenue")
        .eq("period_type", "monthly")
        .lte("period_start", monthStart)
        .gte("period_end", monthStart)
        .limit(1);

      const monthlyTarget = targets?.[0]?.target_value ? Number(targets[0].target_value) : 0;
      if (monthlyTarget > 0) {
        const coverage = pipelineTotal / monthlyTarget;
        if (coverage < 2) {
          result.push({
            id: "pipeline-gap",
            type: "pipeline_gap",
            severity: coverage < 1 ? "critical" : "warning",
            title: `Pipeline coverage: ${Math.round(coverage * 100)}%`,
            detail: coverage < 1 ? "Pipeline abaixo do target mensal" : "Coverage abaixo do ideal (3x)",
            command: "Mostra o status do pipeline e onde estão os gaps",
          });
        }
      }

      // Sort by severity
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      return result.slice(0, 6);
    },
  });

  if (isLoading || signals.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Flame className="h-3 w-3 text-amber-500" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sinais Ativos</p>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {signals.filter(s => s.severity === "critical").length} críticos
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <AnimatePresence>
          {signals.map((signal, i) => {
            const config = signalConfig[signal.severity];
            const TypeIcon = typeIcons[signal.type] || AlertTriangle;
            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group border-border/40"
                  onClick={() => onSignalClick(signal.command)}
                >
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <TypeIcon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {signal.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                          {signal.detail}
                        </p>
                      </div>
                      <Badge className={cn("text-[9px] shrink-0 border", config.badgeVariant)}>
                        {signal.severity === "critical" ? "Crítico" : signal.severity === "warning" ? "Alerta" : "Info"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
