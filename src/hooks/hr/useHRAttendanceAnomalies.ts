import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type AttendanceAnomaly = {
  id: string;
  workspace_id: string;
  employee_id: string;
  anomaly_date: string;
  anomaly_type: "open_session" | "late_arrival" | "unjustified_absence" | "outside_geofence";
  severity: "warning" | "critical";
  description: string | null;
  session_id: string | null;
  schedule_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  hr_employees?: { full_name: string; department: string | null };
};

export function useHRAttendanceAnomalies(filters?: {
  resolved?: boolean;
  anomalyType?: string;
}) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["hr-attendance-anomalies", wsId, filters],
    queryFn: async () => {
      let q = supabase
        .from("hr_attendance_anomalies" as any)
        .select("*, hr_employees(full_name, department)")
        .eq("workspace_id", wsId!)
        .order("anomaly_date", { ascending: false })
        .order("severity", { ascending: true });

      if (filters?.resolved !== undefined) {
        q = q.eq("resolved", filters.resolved);
      }
      if (filters?.anomalyType && filters.anomalyType !== "all") {
        q = q.eq("anomaly_type", filters.anomalyType);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as AttendanceAnomaly[];
    },
    enabled: !!wsId,
  });
}

export function useResolveAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      anomalyId,
      notes,
    }: {
      anomalyId: string;
      notes: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("hr_attendance_anomalies" as any)
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: notes,
        })
        .eq("id", anomalyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anomalia resolvida");
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-anomalies"] });
    },
    onError: () => {
      toast.error("Erro ao resolver anomalia");
    },
  });
}

export function useAnomalyStats() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["hr-anomaly-stats", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_attendance_anomalies" as any)
        .select("anomaly_type, severity, resolved")
        .eq("workspace_id", wsId!)
        .eq("resolved", false);

      if (error) throw error;

      const items = data as any[];
      return {
        total: items.length,
        open_session: items.filter((i) => i.anomaly_type === "open_session").length,
        late_arrival: items.filter((i) => i.anomaly_type === "late_arrival").length,
        unjustified_absence: items.filter((i) => i.anomaly_type === "unjustified_absence").length,
        critical: items.filter((i) => i.severity === "critical").length,
      };
    },
    enabled: !!wsId,
  });
}
