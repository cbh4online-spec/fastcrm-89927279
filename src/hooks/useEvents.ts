import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EventRecord {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_category: string | null;
  starts_at: string;
  ends_at: string | null;
  link: string | null;
  location: string | null;
  location_url: string | null;
  capacity: number | null;
  rsvp_required: boolean;
  cover_image_url: string | null;
  host_name: string | null;
  host_email: string | null;
  host_phone: string | null;
  price: number | null;
  currency: string | null;
  status: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface EventRSVP {
  id: string;
  event_id: string;
  workspace_id: string;
  contact_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  invited_at: string;
  responded_at: string | null;
  notes: string | null;
  created_at: string;
}

type EventFilters = {
  status?: string;
  category?: string;
  timeframe?: "upcoming" | "past";
};

export function useEvents(workspaceId: string | undefined, filters?: EventFilters) {
  return useQuery({
    queryKey: ["events", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = (supabase.from("community_events").select("*") as any)
        .eq("workspace_id", workspaceId)
        .order("starts_at", { ascending: true });

      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.category) q = q.eq("event_category", filters.category);
      if (filters?.timeframe === "upcoming") q = q.gte("starts_at", new Date().toISOString());
      if (filters?.timeframe === "past") q = q.lt("starts_at", new Date().toISOString());

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EventRecord[];
    },
    enabled: !!workspaceId,
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await (supabase.from("community_events").select("*") as any)
        .eq("id", eventId)
        .single();
      if (error) throw error;
      return data as EventRecord;
    },
    enabled: !!eventId,
  });
}

export function useCreateEvent(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (event: Partial<EventRecord>) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");
      const { error } = await (supabase.from("community_events").insert({
        workspace_id: workspaceId,
        created_by: user.id,
        title: event.title,
        description: event.description,
        event_type: event.event_type || "event",
        event_category: event.event_category,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        link: event.link,
        location: event.location,
        location_url: event.location_url,
        capacity: event.capacity,
        rsvp_required: event.rsvp_required ?? true,
        cover_image_url: event.cover_image_url,
        host_name: event.host_name,
        host_email: event.host_email,
        host_phone: event.host_phone,
        price: event.price ?? 0,
        currency: event.currency || "EUR",
        status: event.status || "draft",
        tags: event.tags,
        metadata: event.metadata || {},
      } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento criado!");
    },
    onError: () => toast.error("Erro ao criar evento"),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<EventRecord> & { id: string }) => {
      const { error } = await (supabase.from("community_events").update(rest as any) as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event"] });
      toast.success("Evento atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar evento"),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("community_events").delete() as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento eliminado!");
    },
    onError: () => toast.error("Erro ao eliminar evento"),
  });
}

// RSVPs
export function useEventRSVPs(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-rsvps", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await (supabase.from("event_rsvps").select("*") as any)
        .eq("event_id", eventId)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EventRSVP[];
    },
    enabled: !!eventId,
  });
}

interface InviteWithEventContext extends Omit<EventRSVP, "id" | "created_at" | "invited_at" | "responded_at"> {
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string | null;
  eventLink?: string | null;
}

export function useInviteToEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rsvp: InviteWithEventContext) => {
      const { eventTitle, eventDate, eventLocation, eventLink, ...rsvpData } = rsvp;
      const { data: insertedData, error } = await (supabase.from("event_rsvps").insert(rsvpData as any).select("id").single() as any);
      if (error) throw error;

      const rsvpId = insertedData?.id;

      // Send invite email (non-blocking)
      if (rsvpData.email && eventTitle && eventDate) {
        try {
          await supabase.functions.invoke("send-event-invite", {
            body: {
              email: rsvpData.email,
              name: rsvpData.name || "",
              eventTitle,
              eventDate,
              eventLocation,
              eventLink,
              eventId: rsvpData.event_id,
              workspaceId: rsvpData.workspace_id,
              rsvpId,
            },
          });
        } catch (emailErr) {
          console.warn("[useInviteToEvent] Email send failed:", emailErr);
          toast.warning("Convite criado mas o email não foi enviado");
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-rsvps"] });
      toast.success("Convite enviado!");
    },
    onError: () => toast.error("Erro ao convidar"),
  });
}

export function useUpdateRSVP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<EventRSVP> & { id: string }) => {
      const { error } = await (supabase.from("event_rsvps").update(rest as any) as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-rsvps"] });
      toast.success("RSVP atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar RSVP"),
  });
}

export function useRSVPCounts(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-rsvp-counts", eventId],
    queryFn: async () => {
      if (!eventId) return { invited: 0, confirmed: 0, declined: 0, attended: 0 };
      const { data, error } = await (supabase.from("event_rsvps").select("status") as any)
        .eq("event_id", eventId);
      if (error) throw error;
      const counts = { invited: 0, confirmed: 0, declined: 0, attended: 0 };
      (data || []).forEach((r: any) => {
        if (r.status in counts) counts[r.status as keyof typeof counts]++;
      });
      return counts;
    },
    enabled: !!eventId,
  });
}
