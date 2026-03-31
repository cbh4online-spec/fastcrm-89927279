import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface HRKeyResult {
  id: string;
  okr_id: string;
  workspace_id: string;
  description: string;
  metric_type: string;
  start_value: number;
  target_value: number;
  current_value: number;
  unit: string | null;
  weight: number;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface HROKR {
  id: string;
  workspace_id: string;
  employee_id: string;
  parent_okr_id: string | null;
  type: string;
  objective: string;
  description: string | null;
  period: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  progress: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  hr_employees?: { full_name: string; avatar_url: string | null } | null;
  hr_key_results?: HRKeyResult[];
}

export function useOKRs(filters?: { employeeId?: string; type?: string; period?: string; year?: number; status?: string }) {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["hr_okrs", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      let q = workspaceClient
        .from("hr_okrs")
        .select("*, hr_employees(full_name, avatar_url), hr_key_results(*)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filters?.employeeId) q = q.eq("employee_id", filters.employeeId);
      if (filters?.type) q = q.eq("type", filters.type);
      if (filters?.period) q = q.eq("period", filters.period);
      if (filters?.year) q = q.eq("year", filters.year);
      if (filters?.status) q = q.eq("status", filters.status);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as HROKR[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreateOKR() {
  const qc = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      type: string;
      objective: string;
      description?: string;
      period: string;
      year: number;
      start_date?: string;
      end_date?: string;
      parent_okr_id?: string;
      key_results: { description: string; target_value: number; unit?: string; metric_type?: string }[];
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data: okr, error: okrErr } = await workspaceClient
        .from("hr_okrs")
        .insert({
          workspace_id: currentWorkspace.id,
          employee_id: input.employee_id,
          type: input.type,
          objective: input.objective,
          description: input.description || null,
          period: input.period,
          year: input.year,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          parent_okr_id: input.parent_okr_id || null,
          status: "active",
        })
        .select()
        .single();

      if (okrErr) throw okrErr;

      if (input.key_results.length > 0) {
        const krs = input.key_results.map(kr => ({
          okr_id: okr.id,
          workspace_id: currentWorkspace.id,
          description: kr.description,
          target_value: kr.target_value,
          unit: kr.unit || "%",
          metric_type: kr.metric_type || "number",
        }));
        const { error: krErr } = await workspaceClient.from("hr_key_results").insert(krs);
        if (krErr) throw krErr;
      }

      return okr;
    },
    onSuccess: () => {
      toast.success("OKR criado com sucesso");
      qc.invalidateQueries({ queryKey: ["hr_okrs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateKeyResultProgress() {
  const qc = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, current_value }: { id: string; current_value: number }) => {
      const { error } = await workspaceClient
        .from("hr_key_results")
        .update({ current_value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Progresso actualizado");
      qc.invalidateQueries({ queryKey: ["hr_okrs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateOKRProgress() {
  const qc = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ okrId, progress }: { okrId: string; progress: number }) => {
      const { error } = await workspaceClient
        .from("hr_okrs")
        .update({ progress })
        .eq("id", okrId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr_okrs"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateOKRStatus() {
  const qc = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await workspaceClient
        .from("hr_okrs")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["hr_okrs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteOKR() {
  const qc = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("hr_okrs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("OKR eliminado");
      qc.invalidateQueries({ queryKey: ["hr_okrs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
