import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const supabase = _supabase as any;

export interface VisionProfile {
  id: string; title: string; objective: string | null; target_date: string | null;
  mode: string | null; status: string; manifesto: string | null;
  user_id: string; workspace_id: string; created_at: string; updated_at: string;
  [key: string]: any;
}
export interface VisionSprint {
  id: string; vision_id: string; title: string; goal: string | null;
  start_date: string; end_date: string; status: string; metrics: any;
  closed_at: string | null; review_notes: string | null; workspace_id: string; created_at: string;
  [key: string]: any;
}
export interface VisionDailyBriefing {
  id: string; vision_id: string; date: string; energy_level: number;
  focus_items: any; intentions: any; blockers: any; reflections: string | null;
  duration_minutes: number | null; sprint_id: string | null; status: string;
  started_at: string | null; completed_at: string | null;
  user_id: string; workspace_id: string; created_at: string;
  [key: string]: any;
}
export interface VisionWin {
  id: string; vision_id: string; title: string; description: string | null;
  category: string | null; impact_level: string | null; celebrated: boolean;
  date: string; user_id: string; workspace_id: string; created_at: string;
  [key: string]: any;
}
export interface VisionBoardItem {
  id: string; vision_id: string; type: string; title: string | null;
  content: string | null; color: string | null; image_url: string | null;
  sort_order: number | null; workspace_id: string; created_at: string;
  [key: string]: any;
}
export interface VisionDuoLink {
  id: string; vision_id: string; inviter_id: string; invitee_email: string;
  invitee_id: string | null; invite_token: string; status: string;
  workspace_id: string; created_at: string;
  [key: string]: any;
}

// ─── Vision Profile ───
export function useVisionProfile() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["vision-profile", wsId],
    queryFn: async () => {
      if (!wsId || !user) return null;
      const { data, error } = await supabase
        .from("vision_profiles")
        .select("*")
        .eq("workspace_id", wsId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!wsId && !!user,
  });
}

export function useCreateVision() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { title: string; objective?: string; target_date?: string; mode?: string }) => {
      if (!currentWorkspace?.id || !user) throw new Error("Missing context");
      const { data, error } = await supabase
        .from("vision_profiles")
        .insert({
          title: input.title,
          objective: input.objective || null,
          target_date: input.target_date || null,
          mode: input.mode || "solo",
          user_id: user.id,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vision-profile"] });
      toast.success("Visão criada com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateVision() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VisionProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from("vision_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vision-profile"] });
      toast.success("Visão atualizada!");
    },
    onError: (e) => toast.error(e.message),
  });
}

// ─── Sprints ───
export function useVisionSprints(visionId: string | undefined) {
  return useQuery({
    queryKey: ["vision-sprints", visionId],
    queryFn: async () => {
      if (!visionId) return [];
      const { data, error } = await supabase
        .from("vision_sprints")
        .select("*")
        .eq("vision_id", visionId)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!visionId,
  });
}

export function useCreateSprint() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { vision_id: string; title: string; goal?: string; start_date: string; end_date: string }) => {
      if (!currentWorkspace?.id) throw new Error("Missing workspace");
      const { data, error } = await supabase
        .from("vision_sprints")
        .insert({
          ...input,
          goal: input.goal || null,
          workspace_id: currentWorkspace.id,
          status: "planned",
          metrics: { tasks_done: 0, tasks_total: 0, leads_generated: 0 },
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["vision-sprints", d.vision_id] });
      toast.success("Sprint criado!");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateSprint() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; metrics?: any; closed_at?: string | null; review_notes?: string | null; title?: string; goal?: string }) => {
      const { data, error } = await supabase
        .from("vision_sprints")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["vision-sprints"] });
      toast.success("Sprint atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });
}

// ─── Daily Briefings ───
export function useVisionBriefings(visionId: string | undefined) {
  return useQuery({
    queryKey: ["vision-briefings", visionId],
    queryFn: async () => {
      if (!visionId) return [];
      const { data, error } = await supabase
        .from("vision_daily_briefings")
        .select("*")
        .eq("vision_id", visionId)
        .order("date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!visionId,
  });
}

export function useCreateBriefing() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      vision_id: string;
      energy_level: number;
      focus_items: string[];
      intentions: string[];
      blockers: string[];
      reflections?: string;
      duration_minutes?: number;
      sprint_id?: string;
    }) => {
      if (!currentWorkspace?.id || !user) throw new Error("Missing context");
      const { data, error } = await supabase
        .from("vision_daily_briefings")
        .insert({
          vision_id: input.vision_id,
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          energy_level: input.energy_level,
          focus_items: input.focus_items as unknown as Json,
          intentions: input.intentions as unknown as Json,
          blockers: input.blockers as unknown as Json,
          reflections: input.reflections || null,
          duration_minutes: input.duration_minutes || null,
          sprint_id: input.sprint_id || null,
          status: "completed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["vision-briefings", d.vision_id] });
      toast.success("Briefing guardado!");
    },
    onError: (e) => toast.error(e.message),
  });
}

// ─── Wins ───
export function useVisionWins(visionId: string | undefined) {
  return useQuery({
    queryKey: ["vision-wins", visionId],
    queryFn: async () => {
      if (!visionId) return [];
      const { data, error } = await supabase
        .from("vision_wins")
        .select("*")
        .eq("vision_id", visionId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!visionId,
  });
}

export function useCreateWin() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { vision_id: string; title: string; description?: string; category?: string; impact_level?: string }) => {
      if (!currentWorkspace?.id || !user) throw new Error("Missing context");
      const { data, error } = await supabase
        .from("vision_wins")
        .insert({
          ...input,
          description: input.description || null,
          category: input.category || null,
          impact_level: input.impact_level || "medium",
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["vision-wins", d.vision_id] });
      toast.success("Vitória registada! 🎉");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useCelebrateWin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vision_wins")
        .update({ celebrated: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vision-wins"] });
    },
  });
}

// ─── Board Items ───
export function useVisionBoardItems(visionId: string | undefined) {
  return useQuery({
    queryKey: ["vision-board", visionId],
    queryFn: async () => {
      if (!visionId) return [];
      const { data, error } = await supabase
        .from("vision_board_items")
        .select("*")
        .eq("vision_id", visionId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!visionId,
  });
}

export function useCreateBoardItem() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { vision_id: string; type: string; title?: string; content?: string; color?: string; image_url?: string }) => {
      if (!currentWorkspace?.id) throw new Error("Missing workspace");
      const { data, error } = await supabase
        .from("vision_board_items")
        .insert({
          ...input,
          title: input.title || null,
          content: input.content || null,
          color: input.color || "#8B5CF6",
          image_url: input.image_url || null,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["vision-board", d.vision_id] });
      toast.success("Item adicionado ao board!");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteBoardItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vision_board_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vision-board"] });
    },
  });
}

// ─── Duo Links ───
export function useVisionDuoLinks(visionId: string | undefined) {
  return useQuery({
    queryKey: ["vision-duo", visionId],
    queryFn: async () => {
      if (!visionId) return [];
      const { data, error } = await supabase
        .from("vision_duo_links")
        .select("*")
        .eq("vision_id", visionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!visionId,
  });
}

export function useCreateDuoInvite() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { vision_id: string; invitee_email: string }) => {
      if (!currentWorkspace?.id || !user) throw new Error("Missing context");
      const { data, error } = await supabase
        .from("vision_duo_links")
        .insert({
          vision_id: input.vision_id,
          invitee_email: input.invitee_email,
          inviter_id: user.id,
          workspace_id: currentWorkspace.id,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["vision-duo", d.vision_id] });
      toast.success("Convite Duo enviado!");
    },
    onError: (e) => toast.error(e.message),
  });
}
