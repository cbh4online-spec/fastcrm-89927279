import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";

export type HREmployeeProfile = {
  id: string;
  member_id: string;
  workspace_id: string;
  job_title: string | null;
  department: string | null;
  employee_number: string | null;
  contract_type: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  weekly_hours: number;
  qr_code_token: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Combined type for display: workspace member + profile data + HR profile
export type HREmployee = {
  id: string; // workspace_member id
  member_id: string; // same as id
  user_id: string;
  workspace_id: string;
  role: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  // HR profile fields
  hr_profile_id: string | null;
  job_title: string | null;
  department: string | null;
  employee_number: string | null;
  contract_type: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  weekly_hours: number;
  qr_code_token: string | null;
  notes: string | null;
};

export function useHREmployees(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const wsId = currentWorkspace?.id;
  
  return useQuery({
    queryKey: ["hr-employees", wsId, statusFilter],
    queryFn: async () => {
      if (!wsId) return [];

      // Get all workspace members
      const { data: members, error: membersError } = await workspaceClient
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;

      // Get profiles for members
      const userIds = members.map((m: any) => m.user_id);
      const { data: profiles } = await workspaceClient
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]));

      // Get HR profiles
      const memberIds = members.map((m: any) => m.id);
      const { data: hrProfiles } = await supabase
        .from("hr_employee_profiles" as any)
        .select("*")
        .in("member_id", memberIds);

      const hrMap = new Map((hrProfiles as any[] || []).map((hp: any) => [hp.member_id, hp]));

      // Combine
      let result: HREmployee[] = members.map((m: any) => {
        const profile = profileMap.get(m.user_id);
        const hrProfile = hrMap.get(m.id);
        return {
          id: m.id,
          member_id: m.id,
          user_id: m.user_id,
          workspace_id: m.workspace_id,
          role: m.role,
          full_name: profile?.full_name || "Sem nome",
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          phone: null,
          hr_profile_id: hrProfile?.id || null,
          job_title: hrProfile?.job_title || null,
          department: hrProfile?.department || null,
          employee_number: hrProfile?.employee_number || null,
          contract_type: hrProfile?.contract_type || "full_time",
          start_date: hrProfile?.start_date || null,
          end_date: hrProfile?.end_date || null,
          status: hrProfile?.status || "active",
          weekly_hours: hrProfile?.weekly_hours || 40,
          qr_code_token: hrProfile?.qr_code_token || null,
          notes: hrProfile?.notes || null,
        };
      });

      if (statusFilter) {
        result = result.filter(e => e.status === statusFilter);
      }

      return result;
    },
    enabled: !!wsId,
  });
}

export function useHREmployee(memberId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const wsId = currentWorkspace?.id;
  
  return useQuery({
    queryKey: ["hr-employee", wsId, memberId],
    queryFn: async () => {
      if (!memberId) throw new Error("No member ID");

      const { data: member, error } = await workspaceClient
        .from("workspace_members")
        .select("*")
        .eq("id", memberId)
        .single();

      if (error) throw error;

      const { data: profile } = await workspaceClient
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .eq("user_id", member.user_id)
        .single();

      const { data: hrProfile } = await supabase
        .from("hr_employee_profiles" as any)
        .select("*")
        .eq("member_id", memberId)
        .maybeSingle();

      const hp = hrProfile as any;

      return {
        id: member.id,
        member_id: member.id,
        user_id: member.user_id,
        workspace_id: member.workspace_id,
        role: member.role,
        full_name: profile?.full_name || "Sem nome",
        email: profile?.email || null,
        avatar_url: profile?.avatar_url || null,
        phone: null,
        hr_profile_id: hp?.id || null,
        job_title: hp?.job_title || null,
        department: hp?.department || null,
        employee_number: hp?.employee_number || null,
        contract_type: hp?.contract_type || "full_time",
        start_date: hp?.start_date || null,
        end_date: hp?.end_date || null,
        status: hp?.status || "active",
        weekly_hours: hp?.weekly_hours || 40,
        qr_code_token: hp?.qr_code_token || null,
        notes: hp?.notes || null,
      } as HREmployee;
    },
    enabled: !!wsId && !!memberId,
  });
}

export function useCreateHREmployeeProfile() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  
  return useMutation({
    mutationFn: async (values: { member_id: string } & Partial<HREmployeeProfile>) => {
      const { data, error } = await supabase
        .from("hr_employee_profiles" as any)
        .upsert({
          member_id: values.member_id,
          workspace_id: wsId,
          job_title: values.job_title || null,
          department: values.department || null,
          employee_number: values.employee_number || null,
          contract_type: values.contract_type || "full_time",
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          status: values.status || "active",
          weekly_hours: values.weekly_hours || 40,
          notes: values.notes || null,
        }, { onConflict: "member_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Perfil HR atualizado");
      queryClient.invalidateQueries({ queryKey: ["hr-employees", wsId] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee"] });
    },
    onError: () => toast.error("Erro ao guardar perfil HR"),
  });
}

export function useUpdateHREmployeeProfile() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  
  return useMutation({
    mutationFn: async ({ member_id, ...values }: { member_id: string } & Partial<HREmployeeProfile>) => {
      const { data, error } = await supabase
        .from("hr_employee_profiles" as any)
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("member_id", member_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Perfil HR atualizado");
      queryClient.invalidateQueries({ queryKey: ["hr-employees", wsId] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee"] });
    },
    onError: () => toast.error("Erro ao atualizar perfil HR"),
  });
}

// Keep backward compatibility aliases
export const useCreateHREmployee = useCreateHREmployeeProfile;
export const useUpdateHREmployee = useUpdateHREmployeeProfile;

export function useDeleteHREmployee() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (memberId: string) => {
      // Only delete the HR profile, not the workspace member
      const { error } = await supabase
        .from("hr_employee_profiles" as any)
        .delete()
        .eq("member_id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil HR removido");
      queryClient.invalidateQueries({ queryKey: ["hr-employees", wsId] });
    },
    onError: () => toast.error("Erro ao remover perfil HR"),
  });
}
