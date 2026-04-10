import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type HRWorkSession = {
  id: string;
  workspace_id: string;
  employee_id: string;
  session_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  break_minutes: number;
  break_start_at: string | null;
  break_end_at: string | null;
  session_type: string;
  total_minutes: number | null;
  worked_minutes: number | null;
  status: "complete" | "incomplete" | "manual";
  notes: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_in_location_name: string | null;
  hr_employees?: { full_name: string; avatar_url: string | null; department: string | null };
};

type ClockActionResponse = {
  success?: boolean;
  fallback?: boolean;
  error?: string;
  error_code?: string;
  recorded_at?: string;
  overtime_alert?: {
    exceeded: boolean;
    overtime_minutes: number;
    max_daily_minutes: number;
    worked_minutes: number;
  } | null;
  employee_name?: string | null;
  session_action?: string | null;
  geofence_alert?: {
    outside: boolean;
    distance_meters?: number;
    nearest_zone?: string;
  } | null;
};

const CLOCK_ACTION_BUSINESS_ERROR_CODES = new Set([
  "OPEN_SESSION_EXISTS",
  "NO_OPEN_SESSION",
  "BREAK_ACTIVE",
  "BREAK_ALREADY_STARTED",
  "NO_ACTIVE_BREAK",
]);

const CLOCK_ACTION_BUSINESS_ERROR_MESSAGES = [
  "Já existe uma sessão aberta",
  "Nenhuma sessão aberta",
  "Termine a pausa antes de fazer clock-out",
  "Já está em pausa",
  "Não existe pausa activa",
];

function isClockActionBusinessError(message: string, payload?: Partial<ClockActionResponse> | null) {
  if (payload?.fallback || payload?.success === false) return true;
  if (payload?.error_code && CLOCK_ACTION_BUSINESS_ERROR_CODES.has(payload.error_code)) return true;
  return CLOCK_ACTION_BUSINESS_ERROR_MESSAGES.some((candidate) => message.includes(candidate));
}

export function useHRWorkSessions(employeeId?: string, startDate?: string, endDate?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-work-sessions", wsId, employeeId, startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("hr_work_sessions" as any)
        .select("*, hr_employees(full_name, avatar_url, department)")
        .eq("workspace_id", wsId!)
        .order("session_date", { ascending: false })
        .order("clock_in_at", { ascending: true });
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (startDate) q = q.gte("session_date", startDate);
      if (endDate) q = q.lte("session_date", endDate);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as HRWorkSession[];
    },
    enabled: !!wsId,
  });
}

/**
 * Dedicated query for the active session (no date filter).
 * Returns the most recent session where clock_in_at is set and clock_out_at is null.
 * This ensures the user always sees pause/stop controls even after midnight.
 */
export function useActiveWorkSession(employeeId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-active-session", wsId, employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_work_sessions" as any)
        .select("*, hr_employees(full_name, avatar_url, department)")
        .eq("workspace_id", wsId!)
        .eq("employee_id", employeeId!)
        .not("clock_in_at", "is", null)
        .is("clock_out_at", null)
        .order("clock_in_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const sessions = data as unknown as HRWorkSession[];
      return sessions.length > 0 ? sessions[0] : null;
    },
    enabled: !!wsId && !!employeeId,
    refetchInterval: 30000, // poll every 30s for safety
  });
}

export function useClockAction() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (payload: {
      employee_id: string;
      entry_type: "clock_in" | "clock_out" | "break_start" | "break_end";
      method?: "qr" | "manual" | "app";
      location_lat?: number;
      location_lng?: number;
      location_name?: string;
      notes?: string;
    }) => {
      const res = await supabase.functions.invoke<ClockActionResponse>("hr-clock-action", {
        body: { ...payload, workspace_id: wsId },
      });

      if (res.error) {
        let errorMsg = "Erro ao registar";
        let errorPayload: Partial<ClockActionResponse> | null = null;

        try {
          if (res.error.context) {
            const rawBody = await res.error.context.text();
            if (rawBody) {
              try {
                const parsed = JSON.parse(rawBody);
                errorPayload = parsed;
                errorMsg = parsed?.error || rawBody || errorMsg;
              } catch {
                errorMsg = rawBody || res.error.message || errorMsg;
              }
            } else {
              errorMsg = res.error.message || errorMsg;
            }
          } else {
            errorMsg = res.error.message || errorMsg;
          }
        } catch {
          errorMsg = res.error.message || errorMsg;
        }

        if (isClockActionBusinessError(errorMsg, errorPayload)) {
          return {
            success: false,
            fallback: true,
            error: errorPayload?.error || errorMsg,
            error_code: errorPayload?.error_code,
          } satisfies ClockActionResponse;
        }

        throw new Error(errorMsg);
      }

      if (!res.data) {
        throw new Error("Resposta inválida da ação de ponto");
      }

      return res.data;
    },
    onSuccess: (data) => {
      if (data?.fallback || data?.success === false) {
        toast.warning(data.error || "Ação não permitida");
        // Force refetch to resync UI (e.g. show correct pause/stop buttons)
        queryClient.invalidateQueries({ queryKey: ["hr-work-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["hr-active-session"] });
        return;
      }

      const labels: Record<string, string> = {
        clock_in_morning: "Entrada manhã registada",
        clock_in_afternoon: "Entrada tarde registada",
        clock_in_extra: "Entrada extra registada",
        break_start: "Pausa iniciada",
        break_end: "Pausa terminada",
        clock_out: "Saída registada",
      };

      toast.success(labels[data?.session_action || ""] || "Registo efetuado");
      queryClient.invalidateQueries({ queryKey: ["hr-work-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["hr-time-entries"] });

      if (data?.overtime_alert?.exceeded) {
        const mins = data.overtime_alert.overtime_minutes;
        const name = data.employee_name || "Funcionário";
        const hours = Math.floor(mins / 60);
        const remainMins = mins % 60;
        const timeStr = hours > 0 ? `${hours}h ${remainMins}m` : `${remainMins}m`;
        toast.warning(`⚠️ ${name} excedeu o limite diário em ${timeStr}`);
      }

      if (data?.geofence_alert?.outside) {
        const zone = data.geofence_alert.nearest_zone || "desconhecida";
        const dist = data.geofence_alert.distance_meters || 0;
        toast.warning(`📍 Pica ponto fora de zona autorizada. Zona mais próxima: ${zone} (${dist}m)`);
      }
    },
    onError: (error: any) => {
      const msg = error?.message || error?.context?.body?.error || "Erro ao registar";
      toast.error(msg);
    },
  });
}

export function useHRTimeEntries(employeeId?: string, date?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-time-entries", wsId, employeeId, date],
    queryFn: async () => {
      let q = supabase
        .from("hr_time_entries" as any)
        .select("*, hr_employees(full_name)")
        .eq("workspace_id", wsId!)
        .order("recorded_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      if (date) {
        q = q.gte("recorded_at", `${date}T00:00:00`).lte("recorded_at", `${date}T23:59:59`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!wsId,
  });
}
