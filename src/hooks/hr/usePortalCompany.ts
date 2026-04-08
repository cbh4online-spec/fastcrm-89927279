import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PortalCompany = {
  id: string;
  workspace_id: string;
  auth_user_id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  logo_url: string | null;
  nif: string | null;
  sector: string | null;
  location: string | null;
  status: string;
  created_at: string;
};

export type PortalJobPosting = {
  id: string;
  portal_company_id: string;
  workspace_id: string;
  title: string;
  description: string;
  location: string | null;
  employment_type: string;
  remote_option: string;
  salary_range: string | null;
  requirements: string[];
  contact_email: string | null;
  status: string;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  portal_companies?: { name: string; logo_url: string | null };
};

export function useMyPortalCompany(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["portal-company-mine", workspaceId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("portal_companies")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as PortalCompany | null;
    },
    enabled: !!workspaceId,
  });
}

export function useRegisterPortalCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      name: string;
      email: string;
      password: string;
      phone?: string;
      website?: string;
      nif?: string;
      sector?: string;
      location?: string;
    }) => {
      // Sign up user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Erro ao criar conta");

      // Create portal company
      const { error } = await supabase
        .from("portal_companies")
        .insert({
          workspace_id: params.workspace_id,
          auth_user_id: authData.user.id,
          name: params.name,
          email: params.email,
          phone: params.phone || "",
          website: params.website || "",
          nif: params.nif || null,
          sector: params.sector || null,
          location: params.location || null,
          status: "pending",
        });
      if (error) throw error;
      return authData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-company-mine"] });
      toast.success("Conta criada! Verifique o seu email para confirmar.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMyPortalJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ["portal-jobs-mine", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_job_postings")
        .select("*")
        .eq("portal_company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PortalJobPosting[];
    },
    enabled: !!companyId,
  });
}

export function useCreatePortalJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: {
      portal_company_id: string;
      workspace_id: string;
      title: string;
      description: string;
      location?: string;
      employment_type?: string;
      remote_option?: string;
      salary_range?: string;
      contact_email?: string;
    }) => {
      const { error } = await supabase
        .from("portal_job_postings")
        .insert({ ...job, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-jobs-mine"] });
      toast.success("Vaga submetida para aprovação!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// Public: portal jobs for careers page
export function usePublicPortalJobs(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public-portal-jobs", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_job_postings")
        .select("id, title, description, location, employment_type, remote_option, salary_range, contact_email, published_at, portal_company_id, portal_companies(name, logo_url)")
        .eq("workspace_id", workspaceId!)
        .eq("status", "active")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as PortalJobPosting[];
    },
    enabled: !!workspaceId,
  });
}
