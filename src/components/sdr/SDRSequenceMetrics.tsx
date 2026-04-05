import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, Clock, TrendingUp, Mail, Eye, MousePointer, Reply } from "lucide-react";

interface SDRSequenceMetricsProps {
  sequenceId: string;
  campaignId?: string;
}

export function SDRSequenceMetrics({ sequenceId, campaignId }: SDRSequenceMetricsProps) {
  const { currentWorkspace } = useWorkspace();

  const { data: sequence } = useQuery({
    queryKey: ["sdr-sequence-detail", sequenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("multichannel_sequences")
        .select("*")
        .eq("id", sequenceId)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        name: string;
        status: string;
        channels: string[];
        total_enrolled: number;
        total_completed: number;
      };
    },
    enabled: !!sequenceId,
  });

  const { data: steps = [] } = useQuery({
    queryKey: ["sdr-sequence-steps-count", sequenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("multichannel_sequence_steps")
        .select("id, channel, step_order")
        .eq("sequence_id", sequenceId)
        .order("step_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!sequenceId,
  });

  // Step-level metrics from logs
  const { data: stepMetrics = [] } = useQuery({
    queryKey: ["sdr-step-log-metrics", campaignId, currentWorkspace?.id],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("sdr_enrollments")
        .select("id")
        .eq("campaign_id", campaignId!)
        .eq("workspace_id", currentWorkspace!.id);

      if (!enrollments?.length) return [];

      const ids = enrollments.map((e) => e.id);
      const { data: logs } = await supabase
        .from("sdr_sequence_step_logs")
        .select("sequence_step_id, status")
        .in("sdr_enrollment_id", ids);

      const map = new Map<string, { sent: number; opened: number; clicked: number; replied: number }>();
      for (const log of logs || []) {
        if (!map.has(log.sequence_step_id)) map.set(log.sequence_step_id, { sent: 0, opened: 0, clicked: 0, replied: 0 });
        const s = map.get(log.sequence_step_id)!;
        if (log.status === "sent") s.sent++;
        if (log.status === "opened") s.opened++;
        if (log.status === "clicked") s.clicked++;
        if (log.status === "replied") s.replied++;
      }
      return Array.from(map.entries()).map(([id, counts]) => ({ stepId: id, ...counts }));
    },
    enabled: !!campaignId && !!currentWorkspace?.id,
  });

  if (!sequence) return null;

  const completionRate =
    sequence.total_enrolled > 0
      ? ((sequence.total_completed / sequence.total_enrolled) * 100).toFixed(1)
      : "0.0";
  const inProgress = sequence.total_enrolled - sequence.total_completed;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Sequência: {sequence.name}</h4>
            <Badge variant={sequence.status === "active" ? "default" : "secondary"} className="text-[10px]">
              {sequence.status === "active" ? "Activa" : "Pausada"}
            </Badge>
          </div>
          <div className="flex gap-1">
            {sequence.channels?.map((ch) => (
              <Badge key={ch} variant="outline" className="text-[10px] capitalize">
                {ch}
              </Badge>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{sequence.total_enrolled}</p>
              <p className="text-[10px] text-muted-foreground">Inscritos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{inProgress > 0 ? inProgress : 0}</p>
              <p className="text-[10px] text-muted-foreground">Em progresso</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{sequence.total_completed}</p>
              <p className="text-[10px] text-muted-foreground">Completos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{completionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Conclusão</p>
            </div>
          </div>
        </div>

        {/* Step-level funnel metrics */}
        {steps.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Funnel por step ({steps.length} passo{steps.length > 1 ? "s" : ""})
            </p>
            {steps.map((step, idx) => {
              const metrics = stepMetrics.find((m) => m.stepId === step.id);
              return (
                <div key={step.id} className="flex items-center gap-2 text-[10px]">
                  <Badge variant="outline" className="text-[9px] w-14 justify-center">
                    Step {idx + 1}
                  </Badge>
                  <span className="capitalize text-muted-foreground w-12">{step.channel}</span>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="flex items-center gap-0.5">
                      <Mail className="h-2.5 w-2.5 text-blue-500" />
                      {metrics?.sent || 0}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-2.5 w-2.5 text-emerald-500" />
                      {metrics?.opened || 0}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MousePointer className="h-2.5 w-2.5 text-violet-500" />
                      {metrics?.clicked || 0}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Reply className="h-2.5 w-2.5 text-primary" />
                      {metrics?.replied || 0}
                    </span>
                  </div>
                  {metrics && metrics.sent > 0 && (
                    <span className="text-muted-foreground">
                      {((metrics.opened / metrics.sent) * 100).toFixed(0)}% open
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
