import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  // Relations
  contactsCount: number;
  opportunitiesCount: number;
  opportunitiesValue: number;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_rating: number | null;
  // AI Revenue Engine fields
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

export function useSmartCompanies(filters?: SmartCompaniesFilters) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["smart-companies", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("companies")
        .select(`
          *,
          contacts:contacts(count),
          opportunities:opportunities(count)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("company_score", { ascending: false });

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

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      const today = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });

      let companies: SmartCompany[] = (data || []).map((c: any) => {
        const lastContact = c.last_contact_at ? new Date(c.last_contact_at) : null;
        const hoursSinceLastContact = lastContact ? differenceInHours(now, lastContact) : null;
        
        // Extract counts from relations
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
          opportunitiesValue: 0, // Would need separate query
          linkedin_url: c.linkedin_url || null,
          facebook_url: c.facebook_url || null,
          instagram_url: c.instagram_url || null,
          google_rating: c.google_rating || null,
        } as SmartCompany;
      });

      if (filters?.smartFilter) {
        switch (filters.smartFilter) {
          case "hot": companies = companies.filter(c => c.ai_temperature === "hot"); break;
          case "no_response": companies = companies.filter(c => c.hoursSinceLastContact && c.hoursSinceLastContact > 48); break;
          case "high_intent": companies = companies.filter(c => c.company_score >= 70); break;
          case "automation_active": companies = companies.filter(c => c.automation_active); break;
          case "clients": companies = companies.filter(c => c.ai_company_type === "client"); break;
          case "today": companies = companies.filter(c => new Date(c.created_at) >= today); break;
          case "this_week": companies = companies.filter(c => new Date(c.created_at) >= weekStart); break;
        }
      }

      return companies;
    },
    enabled: !!currentWorkspace,
  });
}

export function useCompaniesKPIs() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["companies-kpis", currentWorkspace?.id],
    queryFn: async (): Promise<CompaniesKPIs> => {
      if (!currentWorkspace) return { totalCompanies: 0, hotCompanies: 0, clients: 0, prospects: 0, avgScore: 0, totalPipelineValue: 0, noResponseOver24h: 0 };

      const now = new Date();
      const threshold48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

      const { data: companies } = await workspaceClient
        .from("companies")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      const totalCompanies = companies?.length || 0;
      const hotCompanies = companies?.filter(c => c.ai_temperature === "hot").length || 0;
      const clients = companies?.filter(c => c.ai_company_type === "client").length || 0;
      const prospects = companies?.filter(c => c.ai_company_type === "prospect").length || 0;
      const avgScore = totalCompanies > 0 ? Math.round(companies!.reduce((s, c) => s + (c.company_score || 0), 0) / totalCompanies) : 0;
      const totalPipelineValue = companies?.reduce((s, c) => s + (c.estimated_value || 0), 0) || 0;
      const noResponseOver24h = companies?.filter(c => c.last_contact_at && c.last_contact_at < threshold48h).length || 0;

      return { totalCompanies, hotCompanies, clients, prospects, avgScore, totalPipelineValue, noResponseOver24h };
    },
    enabled: !!currentWorkspace,
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