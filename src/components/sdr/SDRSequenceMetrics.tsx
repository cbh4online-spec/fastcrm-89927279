import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface SDRSequenceMetricsProps {
  sequenceId: string;
}

export function SDRSequenceMetrics({ sequenceId }: SDRSequenceMetricsProps) {
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
        {steps.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {steps.length} passo(s) configurados
          </p>
        )}
      </CardContent>
    </Card>
  );
}
