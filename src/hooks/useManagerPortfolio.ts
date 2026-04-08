/**
 * useManagerPortfolio — Central hook for the Gestores module
 * 
 * Provides:
 * - Manager stats with correct pipeline/conversion
 * - Unassigned counts
 * - Workload/capacity per manager
 * - Assignment logs
 * - Module health
 * - Manager profiles (segments, territories, client_types)
 * - Profile categories available in the workspace
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { calculateManagerCapacity, type ManagerWorkload, type ManagerProfile } from "@/lib/commercial/assignmentEngine";
import { resolveOwnership, type OwnershipStatus } from "@/lib/commercial/ownershipResolver";
import { toast } from "sonner";

// ─── Paginated fetch (bypasses 1000-row limit) ──────────────

async function fetchAllRows<T>(
  queryFactory: () => { select: (...args: any[]) => any },
  selectColumns: string,
  filters: (q: any) => any,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    let q = queryFactory().select(selectColumns);
    q = filters(q);
    q = q.range(page * pageSize, (page + 1) * pageSize - 1);
    const { data, error } = await q;
    if (error) throw error;
    if (data) all.push(...(data as T[]));
    hasMore = (data?.length || 0) === pageSize;
    page++;
  }
  return all;
}

// ─── Types ──────────────────────────────────────────────────

export interface ManagerStats {
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  totalLeads: number;
  totalContacts: number;
  totalCompanies: number;
  leadsHot: number;
  leadsWarm: number;
  leadsCold: number;
  /** Pipeline = SUM(opportunities.value) WHERE owner_id = manager AND status != 'lost' */
  totalPipelineValue: number;
  avgScore: number;
  lastActivityAt: string | null;
  /** Conversão = won opps / assigned leads * 100 */
  convertedLeads: number;
  totalOpportunities: number;
  wonOpportunities: number;
  workload: ManagerWorkload;
  profile?: ManagerProfile;
}

export interface UnassignedCounts {
  leads: number;
  contacts: number;
  companies: number;
  opportunities: number;
  total: number;
}

export interface ModuleHealth {
  totalEntities: number;
  assignedEntities: number;
  unassignedEntities: number;
  orphanEntities: number;
  coveragePct: number;
  lastRefreshedAt: string;
}

export type CategoryDimension = "segment" | "territory" | "client_type";

export interface ProfileCategory {
  id: string;
  workspace_id: string;
  dimension: CategoryDimension;
  value: string;
  is_active: boolean;
}

// ─── Hook ───────────────────────────────────────────────────

export function useManagerPortfolio() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers();

  const memberIds = members?.map(m => m.user_id) || [];
  const memberIdSet = new Set(memberIds);

  // ── Unassigned counts ──
  const unassignedQuery = useQuery({
    queryKey: ["manager-unassigned", currentWorkspace?.id],
    queryFn: async (): Promise<UnassignedCounts> => {
      if (!currentWorkspace) return { leads: 0, contacts: 0, companies: 0, opportunities: 0, total: 0 };
      const [{ count: uLeads }, { count: uContacts }, { count: uCompanies }, { count: uOpps }] = await Promise.all([
        workspaceClient.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).or("assigned_to.is.null,assigned_to.eq."),
        workspaceClient.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).or("assigned_to.is.null,assigned_to.eq."),
        workspaceClient.from("companies").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).or("assigned_to.is.null,assigned_to.eq."),
        workspaceClient.from("opportunities").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).or("owner_id.is.null,owner_id.eq."),
      ]);
      const l = uLeads || 0, c = uContacts || 0, co = uCompanies || 0, o = uOpps || 0;
      return { leads: l, contacts: c, companies: co, opportunities: o, total: l + c + co + o };
    },
    enabled: !!currentWorkspace,
  });

  // ── Manager profiles ──
  const profilesQuery = useQuery({
    queryKey: ["manager-profiles", currentWorkspace?.id],
    queryFn: async (): Promise<ManagerProfile[]> => {
      if (!currentWorkspace) return [];
      const { data, error } = await (workspaceClient as any)
        .from("manager_profiles")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      return (data || []) as ManagerProfile[];
    },
    enabled: !!currentWorkspace,
  });

  // ── Profile categories ──
  const categoriesQuery = useQuery({
    queryKey: ["manager-profile-categories", currentWorkspace?.id],
    queryFn: async (): Promise<ProfileCategory[]> => {
      if (!currentWorkspace) return [];
      const { data, error } = await (workspaceClient as any)
        .from("manager_profile_categories")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true)
        .order("value", { ascending: true });
      if (error) throw error;
      return (data || []) as ProfileCategory[];
    },
    enabled: !!currentWorkspace,
  });

  // ── Manager stats ──
  const statsQuery = useQuery({
    queryKey: ["manager-portfolio-stats", currentWorkspace?.id, memberIds.join(",")],
    queryFn: async (): Promise<ManagerStats[]> => {
      if (!currentWorkspace || !members || members.length === 0) return [];

      const [leads, contacts, companies, opportunities] = await Promise.all([
        fetchAllRows<any>(
          () => workspaceClient.from("leads"),
          "id, assigned_to, lead_score, ai_temperature, estimated_value, last_contact_at",
          (q: any) => q.eq("workspace_id", currentWorkspace.id)
        ),
        fetchAllRows<any>(
          () => workspaceClient.from("contacts"),
          "id, assigned_to, contact_score, ai_temperature, last_contact_at",
          (q: any) => q.eq("workspace_id", currentWorkspace.id)
        ),
        fetchAllRows<any>(
          () => workspaceClient.from("companies"),
          "id, assigned_to",
          (q: any) => q.eq("workspace_id", currentWorkspace.id)
        ),
        fetchAllRows<any>(
          () => workspaceClient.from("opportunities"),
          "id, owner_id, value, status, lead_id",
          (q: any) => q.eq("workspace_id", currentWorkspace.id)
        ),
      ]);

      const profiles = profilesQuery.data || [];

      return members.map(m => {
        const mLeads = leads.filter((l: any) => l.assigned_to === m.user_id);
        const mContacts = contacts.filter((c: any) => c.assigned_to === m.user_id);
        const mCompanies = companies.filter((c: any) => c.assigned_to === m.user_id);
        const mOpps = opportunities.filter((o: any) => o.owner_id === m.user_id);

        const scores = [...mLeads.map((l: any) => l.lead_score || 0), ...mContacts.map((c: any) => c.contact_score || 0)];
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        const dates = [...mLeads.map((l: any) => l.last_contact_at), ...mContacts.map((c: any) => c.last_contact_at)].filter(Boolean).sort().reverse();

        const pipelineOpps = mOpps.filter((o: any) => o.status !== "lost");
        const totalPipelineValue = pipelineOpps.reduce((s: number, o: any) => s + (Number(o.value) || 0), 0);
        const wonOpps = mOpps.filter((o: any) => o.status === "won").length;

        const capacity = calculateManagerCapacity(mLeads.length, mContacts.length, mCompanies.length, mOpps.filter((o: any) => o.status !== "won" && o.status !== "lost").length);

        const profile = profiles.find(p => p.user_id === m.user_id);

        return {
          userId: m.user_id,
          name: m.profile?.full_name || m.profile?.email || "Utilizador",
          email: m.profile?.email || null,
          avatarUrl: m.profile?.avatar_url || null,
          role: m.role,
          totalLeads: mLeads.length,
          totalContacts: mContacts.length,
          totalCompanies: mCompanies.length,
          leadsHot: mLeads.filter((l: any) => l.ai_temperature === "hot").length,
          leadsWarm: mLeads.filter((l: any) => l.ai_temperature === "warm").length,
          leadsCold: mLeads.filter((l: any) => l.ai_temperature === "cold").length,
          totalPipelineValue,
          avgScore,
          lastActivityAt: dates[0] || null,
          convertedLeads: wonOpps,
          totalOpportunities: mOpps.length,
          wonOpportunities: wonOpps,
          workload: {
            managerId: m.user_id,
            openLeads: mLeads.length,
            activeContacts: mContacts.length,
            managedCompanies: mCompanies.length,
            openOpportunities: mOpps.filter((o: any) => o.status !== "won" && o.status !== "lost").length,
            ...capacity,
          },
          profile,
        };
      });
    },
    enabled: !!currentWorkspace && !!members && members.length > 0,
    refetchOnWindowFocus: false,
  });

  // ── Assignment logs ──
  const logsQuery = useQuery({
    queryKey: ["assignment-logs", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data } = await workspaceClient
        .from("entity_assignment_logs")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  // ── Rotation groups ──
  const rotationGroupsQuery = useQuery({
    queryKey: ["rotation-groups", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data } = await workspaceClient
        .from("assignment_rotation_groups")
        .select("*, rotation_group_members(*)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  // ── Module health ──
  const health: ModuleHealth | null = statsQuery.data && unassignedQuery.data ? (() => {
    const assigned = statsQuery.data.reduce((s, m) => s + m.totalLeads + m.totalContacts + m.totalCompanies, 0);
    const unassigned = unassignedQuery.data.total;
    const total = assigned + unassigned;
    return {
      totalEntities: total,
      assignedEntities: assigned,
      unassignedEntities: unassigned,
      orphanEntities: 0,
      coveragePct: total > 0 ? Math.round((assigned / total) * 100) : 0,
      lastRefreshedAt: new Date().toISOString(),
    };
  })() : null;

  return {
    members,
    membersLoading,
    managerStats: statsQuery.data || [],
    statsLoading: statsQuery.isLoading,
    unassigned: unassignedQuery.data || { leads: 0, contacts: 0, companies: 0, opportunities: 0, total: 0 },
    assignmentLogs: logsQuery.data || [],
    rotationGroups: rotationGroupsQuery.data || [],
    managerProfiles: profilesQuery.data || [],
    profileCategories: categoriesQuery.data || [],
    health,
    workspaceClient,
    currentWorkspace,
  };
}

// ─── Mutations for profiles & categories ────────────────────

export function useUpsertManagerProfile() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (profile: { user_id: string; segments: string[]; territories: string[]; client_types: string[]; is_active?: boolean }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const payload = {
        workspace_id: currentWorkspace.id,
        user_id: profile.user_id,
        segments: profile.segments,
        territories: profile.territories,
        client_types: profile.client_types,
        is_active: profile.is_active ?? true,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await (workspaceClient as any)
        .from("manager_profiles")
        .upsert(payload, { onConflict: "workspace_id,user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager-profiles"] });
      qc.invalidateQueries({ queryKey: ["manager-portfolio-stats"] });
      toast.success("Perfil do gestor atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useManageProfileCategories() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const qc = useQueryClient();

  const addCategory = useMutation({
    mutationFn: async (params: { dimension: CategoryDimension; value: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await (workspaceClient as any)
        .from("manager_profile_categories")
        .insert({ workspace_id: currentWorkspace.id, dimension: params.dimension, value: params.value })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager-profile-categories"] });
      toast.success("Categoria adicionada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (workspaceClient as any)
        .from("manager_profile_categories")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager-profile-categories"] });
      toast.success("Categoria removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { addCategory, removeCategory };
}
