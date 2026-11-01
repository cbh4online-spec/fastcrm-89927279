import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { monthRange } from "@/lib/dates/monthRange";
import { lisbonDate, type RetainerEntry } from "@/lib/retainers/retainerUsage";

export interface ServiceRetainer {
  id: string;
  workspace_id: string;
  company_id: string | null;
  contract_id: string | null;
  name: string;
  monthly_fee: number;
  included_hours: number;
  overage_hourly_rate: number;
  start_date: string;
  end_date: string | null;
  status: "active" | "paused" | "ended";
  notes: string | null;
  created_at: string;
  companies?: { name: string } | null;
}

export type RetainerInput = Pick<ServiceRetainer, "name" | "company_id" | "monthly_fee" | "included_hours" | "overage_hourly_rate" | "start_date" | "status"> & { notes?: string | null; end_date?: string | null };

const KEY = "service-retainers";
const db = supabase as any;

export function useRetainers() {
  const { currentWorkspace: ws } = useWorkspace();
  return useQuery({
    queryKey: [KEY, ws?.id],
    enabled: !!ws?.id,
    queryFn: async () => {
      const { data, error } = await db.from("service_retainers")
        .select("*, companies(name)").eq("workspace_id", ws!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServiceRetainer[];
    },
  });
}

export function useRetainer(id?: string) {
  return useQuery({
    queryKey: [KEY, "one", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from("service_retainers").select("*, companies(name)").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as ServiceRetainer | null;
    },
  });
}

export function useSaveRetainer() {
  const { currentWorkspace: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: RetainerInput }) => {
      if (!ws?.id) throw new Error("Sem espaço de trabalho");
      if (id) {
        const { error } = await db.from("service_retainers").update(input).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await db.from("service_retainers")
        .insert({ ...input, workspace_id: ws.id, created_by: user?.id ?? null }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { toast.success("Avença guardada"); qc.invalidateQueries({ queryKey: [KEY] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao guardar avença"),
  });
}

/** Registos de tempo (projetos + suporte) de uma avença num mês (Lisboa). */
export function useRetainerEntries(retainerId: string | undefined, monthKey: string) {
  return useQuery({
    queryKey: [KEY, "entries", retainerId, monthKey],
    enabled: !!retainerId,
    queryFn: async (): Promise<RetainerEntry[]> => {
      const [y, m] = monthKey.split("-").map(Number);
      const { from, to } = monthRange(y, m);
      // margem de 1 dia para converter instantes UTC para datas de Lisboa
      const fromTs = new Date(`${from}T00:00:00Z`); fromTs.setUTCDate(fromTs.getUTCDate() - 1);
      const toTs = new Date(`${to}T23:59:59Z`); toTs.setUTCDate(toTs.getUTCDate() + 1);
      const [proj, tick] = await Promise.all([
        db.from("implementation_time_entries")
          .select("id, project_id, user_id, entry_date, duration_minutes, billable, description, implementation_projects(title)")
          .eq("retainer_id", retainerId).gte("entry_date", from).lte("entry_date", to).limit(5000),
        db.from("support_ticket_time_entries")
          .select("id, ticket_id, user_id, created_at, started_at, duration_minutes, description, support_tickets(subject, ticket_number)")
          .eq("retainer_id", retainerId).gte("created_at", fromTs.toISOString()).lte("created_at", toTs.toISOString()).limit(5000),
      ]);
      if (proj.error) throw proj.error;
      if (tick.error) throw tick.error;
      const rows: RetainerEntry[] = [
        ...(proj.data ?? []).map((r: any) => ({
          id: r.id, source: "project" as const, date: r.entry_date, minutes: r.duration_minutes ?? 0,
          billable: r.billable !== false, description: r.description, userId: r.user_id,
          parentId: r.project_id, parentLabel: r.implementation_projects?.title ?? "Projeto",
        })),
        ...(tick.data ?? []).map((r: any) => ({
          id: r.id, source: "ticket" as const, date: lisbonDate(r.started_at ?? r.created_at), minutes: r.duration_minutes ?? 0,
          billable: true, description: r.description, userId: r.user_id, parentId: r.ticket_id,
          parentLabel: r.support_tickets ? `${r.support_tickets.ticket_number ? `#${r.support_tickets.ticket_number} ` : ""}${r.support_tickets.subject ?? ""}` : "Ticket",
        })),
      ];
      return rows.filter((r) => r.date.slice(0, 7) === monthKey).sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}

export function useProfileNames(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))].sort();
  return useQuery({
    queryKey: ["profile-names", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      return new Map((data ?? []).map((p: any) => [p.user_id, p.full_name as string]));
    },
  });
}

/** Projetos e tickets ligados (e candidatos da mesma empresa/workspace). */
export function useRetainerLinks(retainer?: ServiceRetainer | null) {
  return useQuery({
    queryKey: [KEY, "links", retainer?.id],
    enabled: !!retainer?.id,
    queryFn: async () => {
      const [p, t] = await Promise.all([
        db.from("implementation_projects").select("id, title, status, retainer_id, company_id")
          .eq("workspace_id", retainer!.workspace_id).order("created_at", { ascending: false }).limit(500),
        db.from("support_tickets").select("id, subject, ticket_number, status, retainer_id, company_id")
          .eq("workspace_id", retainer!.workspace_id).order("created_at", { ascending: false }).limit(500),
      ]);
      if (p.error) throw p.error;
      if (t.error) throw t.error;
      return { projects: (p.data ?? []) as any[], tickets: (t.data ?? []) as any[] };
    },
  });
}

export function useLinkToRetainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, id, retainerId }: { kind: "project" | "ticket"; id: string; retainerId: string | null }) => {
      const table = kind === "project" ? "implementation_projects" : "support_tickets";
      const { error } = await db.from(table).update({ retainer_id: retainerId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao ligar"),
  });
}

export function useLogRetainerTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      retainer: ServiceRetainer; kind: "project" | "ticket"; parentId: string;
      date: string; minutes: number; description: string; billable: boolean;
    }) => {
      if (input.minutes <= 0 || input.minutes > 24 * 60) throw new Error("Duração inválida (máx. 24h)");
      if (input.description.length > 2000) throw new Error("Descrição demasiado longa");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const base = { workspace_id: input.retainer.workspace_id, user_id: user.id, retainer_id: input.retainer.id,
        duration_minutes: input.minutes, description: input.description.trim() || null };
      const res = input.kind === "project"
        ? await db.from("implementation_time_entries").insert({ ...base, project_id: input.parentId, entry_date: input.date, billable: input.billable, activity_type: "retainer" })
        : await db.from("support_ticket_time_entries").insert({ ...base, ticket_id: input.parentId, entry_type: "manual", started_at: `${input.date}T12:00:00Z`, hourly_rate: input.retainer.overage_hourly_rate });
      if (res.error) throw res.error;
    },
    onSuccess: () => { toast.success("Tempo registado"); qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ["ticket-time-entries"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registar tempo"),
  });
}

export function useDeleteRetainerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ source, id }: { source: "project" | "ticket"; id: string }) => {
      const table = source === "project" ? "implementation_time_entries" : "support_ticket_time_entries";
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Registo apagado"); qc.invalidateQueries({ queryKey: [KEY] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao apagar"),
  });
}
