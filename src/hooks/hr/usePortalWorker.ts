import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PortalWorker = {
  id: string;
  workspace_id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string | null;
  sector: string | null;
  skills: string[];
  experience_years: number;
  education: string | null;
  bio: string | null;
  cv_url: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
  availability: string;
  status: string;
  created_at: string;
};

export type PortalWorkerListing = {
  id: string;
  portal_worker_id: string;
  workspace_id: string;
  title: string;
  description: string;
  employment_type: string;
  remote_option: string;
  desired_location: string | null;
  desired_salary_range: string | null;
  available_from: string | null;
  is_immediate: boolean;
  status: string;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  portal_workers?: { first_name: string; last_name: string; photo_url: string | null; location: string | null; skills: string[]; experience_years: number; sector: string | null };
};

export function useMyPortalWorker(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["portal-worker-mine", workspaceId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("portal_workers")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as PortalWorker | null;
    },
    enabled: !!workspaceId,
  });
}

export function useRegisterPortalWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      phone?: string;
      location?: string;
      sector?: string;
      skills?: string[];
      experience_years?: number;
      education?: string;
      bio?: string;
      linkedin_url?: string;
    }) => {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Erro ao criar conta");

      const { error } = await supabase
        .from("portal_workers")
        .insert({
          workspace_id: params.workspace_id,
          auth_user_id: authData.user.id,
          first_name: params.first_name,
          last_name: params.last_name,
          email: params.email,
          phone: params.phone || "",
          location: params.location || null,
          sector: params.sector || null,
          skills: params.skills || [],
          experience_years: params.experience_years || 0,
          education: params.education || null,
          bio: params.bio || null,
          linkedin_url: params.linkedin_url || null,
        });
      if (error) throw error;
      return authData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-worker-mine"] });
      toast.success("Conta criada! Verifique o seu email para confirmar.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMyWorkerListings(workerId: string | undefined) {
  return useQuery({
    queryKey: ["portal-worker-listings-mine", workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_worker_listings")
        .select("*")
        .eq("portal_worker_id", workerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PortalWorkerListing[];
    },
    enabled: !!workerId,
  });
}

export function useCreateWorkerListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listing: {
      portal_worker_id: string;
      workspace_id: string;
      title: string;
      description: string;
      employment_type?: string;
      remote_option?: string;
      desired_location?: string;
      desired_salary_range?: string;
      is_immediate?: boolean;
    }) => {
      const { error } = await supabase
        .from("portal_worker_listings")
        .insert({ ...listing, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-worker-listings-mine"] });
      toast.success("Anúncio de disponibilidade publicado!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// Public: worker listings for careers page
export function usePublicWorkerListings(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public-worker-listings", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_worker_listings")
        .select("id, title, description, employment_type, remote_option, desired_location, desired_salary_range, is_immediate, published_at, portal_worker_id, portal_workers(first_name, last_name, photo_url, location, skills, experience_years, sector)")
        .eq("workspace_id", workspaceId!)
        .eq("status", "active")
        .order("published_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as PortalWorkerListing[];
    },
    enabled: !!workspaceId,
  });
}
