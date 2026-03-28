import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface TimeEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  source: string;
  notes: string | null;
  status: string;
  edited_by: string | null;
  created_at: string;
  updated_at: string;
}

function getGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

export function useTimeEntries(dateFilter?: string) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["time-entries", wsId, dateFilter],
    queryFn: async () => {
      let q = supabase
        .from("time_entries")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("clock_in", { ascending: false });
      if (dateFilter) {
        q = q.gte("clock_in", `${dateFilter}T00:00:00`).lte("clock_in", `${dateFilter}T23:59:59`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!wsId,
  });

  const activeEntry = entries.find((e) => e.user_id === user?.id && e.status === "active" && !e.clock_out);

  const clockIn = useMutation({
    mutationFn: async () => {
      const geo = await getGeolocation();
      const { error } = await supabase.from("time_entries").insert({
        workspace_id: wsId!,
        user_id: user!.id,
        clock_in: new Date().toISOString(),
        clock_in_lat: geo?.lat ?? null,
        clock_in_lng: geo?.lng ?? null,
        source: "manual",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clock-in registado");
      qc.invalidateQueries({ queryKey: ["time-entries"] });
    },
    onError: () => toast.error("Erro ao registar clock-in"),
  });

  const clockOut = useMutation({
    mutationFn: async (entryId: string) => {
      const geo = await getGeolocation();
      const { error } = await supabase
        .from("time_entries")
        .update({
          clock_out: new Date().toISOString(),
          clock_out_lat: geo?.lat ?? null,
          clock_out_lng: geo?.lng ?? null,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clock-out registado");
      qc.invalidateQueries({ queryKey: ["time-entries"] });
    },
    onError: () => toast.error("Erro ao registar clock-out"),
  });

  return { entries, isLoading, activeEntry, clockIn, clockOut };
}
