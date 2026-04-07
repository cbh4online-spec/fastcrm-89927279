import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useState, useRef, useCallback, useEffect } from "react";

const TIMER_STORAGE_KEY = "helpdesk_active_timer";

interface PersistedTimer {
  ticketId: string;
  startedAt: string; // ISO string
}

function getPersistedTimer(): PersistedTimer | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.ticketId && parsed?.startedAt) return parsed;
    return null;
  } catch {
    return null;
  }
}

function persistTimer(ticketId: string, startedAt: Date) {
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ ticketId, startedAt: startedAt.toISOString() }));
}

function clearPersistedTimer() {
  localStorage.removeItem(TIMER_STORAGE_KEY);
}

export interface TimeEntry {
  id: string;
  ticket_id: string;
  workspace_id: string;
  user_id: string;
  duration_minutes: number;
  description: string | null;
  entry_type: "manual" | "timer";
  started_at: string | null;
  ended_at: string | null;
  hourly_rate: number;
  cost: number;
  created_at: string;
  updated_at: string;
  agent_name?: string | null;
}

export function useTicketTimeTracking(ticketId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Restore persisted timer on mount
  useEffect(() => {
    if (!ticketId) return;
    const persisted = getPersistedTimer();
    if (persisted && persisted.ticketId === ticketId) {
      const startDate = new Date(persisted.startedAt);
      const elapsedSec = Math.floor((Date.now() - startDate.getTime()) / 1000);
      if (elapsedSec > 0 && elapsedSec < 86400) { // max 24h sanity check
        startTimeRef.current = startDate;
        setElapsed(elapsedSec);
        setIsRunning(true);
        intervalRef.current = setInterval(() => {
          if (startTimeRef.current) {
            setElapsed(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000));
          }
        }, 1000);
      } else {
        clearPersistedTimer();
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ticketId]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    clearPersistedTimer();
  }, []);

  const startTimer = useCallback(() => {
    if (isRunning || !ticketId) return;
    const now = new Date();
    startTimeRef.current = now;
    setElapsed(0);
    setIsRunning(true);
    persistTimer(ticketId, now);
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000));
      }
    }, 1000);
  }, [isRunning, ticketId]);

  const pauseTimer = useCallback(() => {
    stopTimer();
  }, [stopTimer]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ticket-time-entries", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("support_ticket_time_entries")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((e: any) => e.user_id).filter(Boolean))];
      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      }

      return (data || []).map((e: any) => ({
        ...e,
        agent_name: profileMap.get(e.user_id) || null,
      })) as TimeEntry[];
    },
    enabled: !!ticketId,
  });

  const addEntry = useMutation({
    mutationFn: async (input: {
      duration_minutes: number;
      description?: string;
      entry_type?: "manual" | "timer";
      hourly_rate?: number;
      started_at?: string;
      ended_at?: string;
    }) => {
      if (!ticketId || !workspaceId) throw new Error("Missing context");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("support_ticket_time_entries")
        .insert({
          ticket_id: ticketId,
          workspace_id: workspaceId,
          user_id: user!.id,
          duration_minutes: input.duration_minutes,
          description: input.description || null,
          entry_type: (input.entry_type || "manual") as any,
          hourly_rate: input.hourly_rate ?? 0,
          started_at: input.started_at || null,
          ended_at: input.ended_at || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-time-entries", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_ticket_time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-time-entries", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    },
  });

  const saveTimerEntry = useCallback(
    async (description?: string, hourlyRate?: number) => {
      if (elapsed < 60) return;
      const durationMinutes = Math.round(elapsed / 60);
      const savedStart = startTimeRef.current;
      stopTimer();
      setElapsed(0);
      await addEntry.mutateAsync({
        duration_minutes: durationMinutes,
        description,
        entry_type: "timer",
        hourly_rate: hourlyRate ?? 0,
        started_at: savedStart?.toISOString(),
        ended_at: new Date().toISOString(),
      });
    },
    [elapsed, stopTimer, addEntry]
  );

  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);
  const totalCost = entries.reduce((s, e) => s + (e.cost || 0), 0);

  return {
    entries,
    isLoading,
    addEntry,
    deleteEntry,
    isRunning,
    elapsed,
    startTimer,
    pauseTimer,
    saveTimerEntry,
    totalMinutes,
    totalCost,
  };
}
