import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, startOfDay, startOfWeek } from "date-fns";

export type EntityTemperature = "cold" | "warm" | "hot";
export type CompanyTemperature = EntityTemperature;
export type NextActionType = "reply_manual" | "send_template" | "create_opportunity" | "activate_automation" | "archive" | "follow_up" | "schedule_meeting" | "research";
export type CompanyType = "prospect" | "client" | "partner" | "competitor" | "vendor" | "unknown";
export type SmartFilterType = "hot" | "no_response" | "high_intent" | "automation_active" | "today" | "this_week" | "clients";

export interface SmartCompany {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  tags: string[] | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  last_contact_at: string | null;
  ai_temperature: EntityTemperature;
  company_score: number;
  ai_next_action: string | null;
  ai_next_action_type: NextActionType | null;
  ai_insight: string | null;
  ai_company_type: CompanyType | null;
  estimated_value: number;
  conversion_probability: number;
  ai_analyzed_at: string | null;
  assigned_to: string | null;
  automation_active: boolean;
  annual_revenue: number;
  employee_count: number | null;
  hoursSinceLastContact: number | null;
  slaBreach: boolean;
  contactsCount: number;
  opportunitiesCount: number;
  opportunitiesValue: number;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_rating: number | null;
  icp_fit_score: number;
  estimated_arr: number | null;
  buying_signal: string | null;
  expansion_probability: number | null;
  company_growth_stage: string | null;
  ai_revenue_analyzed_at: string | null;
}

export interface SmartCompaniesFilters {
  search?: string;
  temperature?: EntityTemperature | "all";
  industry?: string | "all";
  smartFilter?: SmartFilterType;
  companyType?: CompanyType | "all";
  sortBy?: string;
  page?: number;
  pageSize?: number;
  archiveState?: "active" | "archived" | "all";
}

export interface CompaniesKPIs {
  totalCompanies: number;
  hotCompanies: number;
  clients: number;
  prospects: number;
  avgScore: number;
  totalPipelineValue: number;
  noResponseOver24h: number;
}

export interface SmartCompaniesResult {
  data: SmartCompany[];
  totalCount: number;
}

const COMPANIES_SELECT_COLUMNS = `
  id, workspace_id, name, email, phone, website, industry, size,
  address, city, notes, tags, source, created_at, updated_at,
  tax_id, client_number,
  last_contact_at, ai_temperature, company_score,
  ai_next_action, ai_next_action_type, ai_insight, ai_company_type,
  estimated_value, conversion_probability, ai_analyzed_at,
  assigned_to, automation_active, annual_revenue, employee_count,
  linkedin_url, facebook_url, instagram_url, google_rating,
  icp_fit_score, estimated_arr, buying_signal, expansion_probability,
  company_growth_stage, ai_revenue_analyzed_at,
  is_blocked, block_reason, archived_at, archive_reason,
  contacts:contacts(count),
  opportunities:opportunities(count)
`;

export function useSmartCompanies(filters?: SmartCompaniesFilters): ReturnType<typeof useQuery<SmartCompaniesResult>> {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  const page = filters?.page;
  const pageSize = filters?.pageSize;
  const paginate = typeof page === "number" && typeof pageSize === "number";

  return useQuery({
    queryKey: ["smart-companies", currentWorkspace?.id, filters],
    queryFn: async (): Promise<SmartCompaniesResult> => {
      if (!currentWorkspace) return { data: [], totalCount: 0 };

      const now = new Date();
      const today = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const threshold48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

      // Determine sort column and direction
      const sortBy = filters?.sortBy || "score_desc";
      let sortColumn = "company_score";
      let sortAscending = false;
      switch (sortBy) {
        case "created_desc": sortColumn = "created_at"; sortAscending = false; break;
        case "created_asc": sortColumn = "created_at"; sortAscending = true; break;
        case "score_desc": sortColumn = "company_score"; sortAscending = false; break;
        case "name_asc": sortColumn = "name"; sortAscending = true; break;
        case "name_desc": sortColumn = "name"; sortAscending = false; break;
        case "revenue_desc": sortColumn = "annual_revenue"; sortAscending = false; break;
        default: sortColumn = "company_score"; sortAscending = false;
      }

      let query = workspaceClient
        .from("companies")
        .select(COMPANIES_SELECT_COLUMNS, { count: 'exact' })
        .eq("workspace_id", currentWorkspace.id)
        .order(sortColumn, { ascending: sortAscending });

      const archiveState = filters?.archiveState ?? "active";
      if (archiveState === "active") query = query.is("archived_at", null);
      else if (archiveState === "archived") query = query.not("archived_at", "is", null);

      if (filters?.temperature && filters.temperature !== "all") {
        query = query.eq("ai_temperature", filters.temperature);
      }
      if (filters?.industry && filters.industry !== "all") {
        query = query.eq("industry", filters.industry);
      }
      if (filters?.companyType && filters.companyType !== "all") {
        query = query.eq("ai_company_type", filters.companyType);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,industry.ilike.%${filters.search}%`);
      }

      // Smart filters at SQL level
      if (filters?.smartFilter) {
        switch (filters.smartFilter) {
          case "hot": query = query.eq("ai_temperature", "hot"); break;
          case "no_response": query = query.lt("last_contact_at", threshold48h); break;
          case "high_intent": query = query.gte("company_score", 70); break;
          case "automation_active": query = query.eq("automation_active", true); break;
          case "clients": query = query.eq("ai_company_type", "client"); break;
          case "today": query = query.gte("created_at", today.toISOString()); break;
          case "this_week": query = query.gte("created_at", weekStart.toISOString()); break;
        }
      }

      // Server-side pagination (only when explicitly requested; otherwise fetch all up to 10k)
      if (paginate) {
        const from = (page as number) * (pageSize as number);
        const to = from + (pageSize as number) - 1;
        query = query.range(from, to);
      } else {
        query = query.range(0, 9999);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const companies: SmartCompany[] = (data || []).map((c: any) => {
        const lastContact = c.last_contact_at ? new Date(c.last_contact_at) : null;
        const hoursSinceLastContact = lastContact ? differenceInHours(now, lastContact) : null;
        const contactsCount = c.contacts?.[0]?.count || 0;
        const opportunitiesCount = c.opportunities?.[0]?.count || 0;

        return {
          ...c,
          ai_temperature: c.ai_temperature || "cold",
          company_score: c.company_score || 0,
          estimated_value: c.estimated_value || 0,
          conversion_probability: c.conversion_probability || 0,
          automation_active: c.automation_active || false,
          annual_revenue: c.annual_revenue || 0,
          employee_count: c.employee_count || null,
          hoursSinceLastContact,
          slaBreach: hoursSinceLastContact !== null && hoursSinceLastContact > 48,
          contactsCount,
          opportunitiesCount,
          opportunitiesValue: 0,
          linkedin_url: c.linkedin_url || null,
          facebook_url: c.facebook_url || null,
          instagram_url: c.instagram_url || null,
          google_rating: c.google_rating || null,
          icp_fit_score: c.icp_fit_score || 0,
          estimated_arr: c.estimated_arr || null,
          buying_signal: c.buying_signal || null,
          expansion_probability: c.expansion_probability || null,
          company_growth_stage: c.company_growth_stage || null,
          ai_revenue_analyzed_at: c.ai_revenue_analyzed_at || null,
        } as SmartCompany;
      });

      return { data: companies, totalCount: count ?? 0 };
    },
    enabled: !!currentWorkspace,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCompaniesKPIs() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["companies-kpis", currentWorkspace?.id],
    queryFn: async (): Promise<CompaniesKPIs> => {
      if (!currentWorkspace) return { totalCompanies: 0, hotCompanies: 0, clients: 0, prospects: 0, avgScore: 0, totalPipelineValue: 0, noResponseOver24h: 0 };

      const threshold48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const baseQuery = () => workspaceClient.from("companies").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).is("archived_at", null);

      const [totalRes, hotRes, clientsRes, prospectsRes, noResponseRes, valueRes] = await Promise.all([
        baseQuery(),
        baseQuery().eq("ai_temperature", "hot"),
        baseQuery().eq("ai_company_type", "client"),
        baseQuery().eq("ai_company_type", "prospect"),
        baseQuery().lt("last_contact_at", threshold48h),
        workspaceClient.from("companies").select("estimated_value, company_score").eq("workspace_id", currentWorkspace.id).is("archived_at", null),
      ]);

      const totalCompanies = totalRes.count ?? 0;
      const values = valueRes.data || [];
      const totalPipelineValue = values.reduce((s: number, c: any) => s + (c.estimated_value || 0), 0);
      const avgScore = values.length > 0 ? Math.round(values.reduce((s: number, c: any) => s + (c.company_score || 0), 0) / values.length) : 0;

      return {
        totalCompanies,
        hotCompanies: hotRes.count ?? 0,
        clients: clientsRes.count ?? 0,
        prospects: prospectsRes.count ?? 0,
        avgScore,
        totalPipelineValue,
        noResponseOver24h: noResponseRes.count ?? 0,
      };
    },
    enabled: !!currentWorkspace,
    staleTime: 30_000,
    refetchInterval: 60000,
  });
}

export function useAnalyzeCompany() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ companyId }: { companyId: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("ai-analyze-entity", {
        body: { entityId: companyId, entityType: "company", workspaceId: currentWorkspace.id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-companies", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["companies-kpis", currentWorkspace?.id] });
    }
  });
}

export function useBulkAnalyzeCompanies() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (companyIds: string[]) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const results = await Promise.allSettled(
        companyIds.map(id => supabase.functions.invoke("ai-analyze-entity", {
          body: { entityId: id, entityType: "company", workspaceId: currentWorkspace.id }
        }))
      );
      return { successful: results.filter(r => r.status === "fulfilled").length, failed: results.filter(r => r.status === "rejected").length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-companies", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["companies-kpis", currentWorkspace?.id] });
    }
  });
}
