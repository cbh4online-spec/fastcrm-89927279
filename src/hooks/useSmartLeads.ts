import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { differenceInHours, startOfDay, startOfWeek } from "date-fns";

export type LeadTemperature = "cold" | "warm" | "hot";
export type LeadStatus = "new" | "in_progress" | "completed";
export type NextActionType = "reply_manual" | "send_template" | "create_opportunity" | "activate_automation" | "archive" | "follow_up";
export type LeadType = "lead" | "client" | "supplier" | "spam" | "unknown";
export type SmartFilterType = "hot" | "no_response" | "high_intent" | "automation_active" | "today" | "this_week";

export interface SmartLead {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  last_contact_at: string | null;
  ai_temperature: LeadTemperature;
  lead_score: number;
  ai_next_action: string | null;
  ai_next_action_type: NextActionType | null;
  ai_insight: string | null;
  ai_lead_type: LeadType | null;
  estimated_value: number;
  conversion_probability: number;
  ai_analyzed_at: string | null;
  assigned_to: string | null;
  automation_active: boolean;
  company_name: string | null;
  address?: string | null;
  address_number?: string | null;
  address_floor?: string | null;
  city?: string | null;
  postal_code?: string | null;
  region?: string | null;
  country?: string | null;
  hoursSinceLastContact: number | null;
  slaBreach: boolean;
  conversations?: Array<{
    id: string;
    channel: string;
    last_message_at: string | null;
    last_message_preview: string | null;
    unread_count: number;
  }>;
  opportunities?: Array<{
    id: string;
    value: number;
    status: string;
  }>;
}

export interface SmartLeadsFilters {
  search?: string;
  status?: LeadStatus | "all";
  temperature?: LeadTemperature | "all";
  source?: string | "all";
  smartFilter?: SmartFilterType;
  assignedTo?: string | "all";
  hasField?: string;
  missingField?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
  archiveState?: "active" | "archived" | "all";
}

export interface LeadsKPIs {
  receivedToday: number;
  hotLeads: number;
  noResponseOver24h: number;
  avgResponseTimeHours: number;
  conversionsThisWeek: number;
  totalPipelineValue: number;
}

export interface SmartLeadsResult {
  data: SmartLead[];
  totalCount: number;
}

const LEADS_SELECT_COLUMNS = `
  id, workspace_id, name, email, phone, source, status, tags,
  created_at, updated_at, last_contact_at,
  ai_temperature, lead_score, ai_next_action, ai_next_action_type,
  ai_insight, ai_lead_type, estimated_value, conversion_probability,
  ai_analyzed_at, assigned_to, automation_active, company_name,
  address, address_number, address_floor, city, county, parish, region,
  postal_code, country, tax_id,
  website, business_category, cae_description, capital_social,
  legal_nature, external_email, external_username, linkedin_url,
  facebook_url, instagram_url, twitter_url, fax, company_status,
  services, cae_codes, youtube_url, tiktok_url, pinterest_url, whatsapp_url,
  is_blocked, block_reason, archived_at, archive_reason
`;

export function useSmartLeads(filters?: SmartLeadsFilters): ReturnType<typeof useQuery<SmartLeadsResult>> {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 50;

  return useQuery({
    queryKey: ["smart-leads", currentWorkspace?.id, filters],
    queryFn: async (): Promise<SmartLeadsResult> => {
      if (!currentWorkspace) return { data: [], totalCount: 0 };

      const now = new Date();
      const today = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const threshold24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Determine sort column and direction
      const sortBy = filters?.sortBy || "score_desc";
      let sortColumn = "lead_score";
      let sortAscending = false;
      switch (sortBy) {
        case "created_desc": sortColumn = "created_at"; sortAscending = false; break;
        case "created_asc": sortColumn = "created_at"; sortAscending = true; break;
        case "score_desc": sortColumn = "lead_score"; sortAscending = false; break;
        case "score_asc": sortColumn = "lead_score"; sortAscending = true; break;
        case "value_desc": sortColumn = "estimated_value"; sortAscending = false; break;
        case "last_contact_desc": sortColumn = "last_contact_at"; sortAscending = false; break;
        default: sortColumn = "lead_score"; sortAscending = false;
      }

      let query = workspaceClient
        .from("leads")
        .select(LEADS_SELECT_COLUMNS, { count: 'exact' })
        .eq("workspace_id", currentWorkspace.id)
        .order(sortColumn, { ascending: sortAscending });

      const archiveState = filters?.archiveState ?? "active";
      if (archiveState === "active") query = query.is("archived_at", null);
      else if (archiveState === "archived") query = query.not("archived_at", "is", null);

      // Apply filters at SQL level
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.temperature && filters.temperature !== "all") {
        query = query.eq("ai_temperature", filters.temperature);
      }
      if (filters?.source && filters.source !== "all") {
        query = query.eq("source", filters.source);
      }
      if (filters?.assignedTo && filters.assignedTo !== "all") {
        query = query.eq("assigned_to", filters.assignedTo);
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,source.ilike.%${filters.search}%`
        );
      }

      // Apply column presence filters
      if (filters?.hasField) {
        query = query.not(filters.hasField as any, "is", null);
      }
      if (filters?.missingField) {
        query = query.is(filters.missingField as any, null);
      }

      // Apply smart filters at SQL level
      if (filters?.smartFilter) {
        switch (filters.smartFilter) {
          case "hot":
            query = query.eq("ai_temperature", "hot");
            break;
          case "no_response":
            query = query.lt("last_contact_at", threshold24h);
            break;
          case "high_intent":
            query = query.gte("lead_score", 70);
            break;
          case "automation_active":
            query = query.eq("automation_active", true);
            break;
          case "today":
            query = query.gte("created_at", today.toISOString());
            break;
          case "this_week":
            query = query.gte("created_at", weekStart.toISOString());
            break;
        }
      }

      // Server-side pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const leads: SmartLead[] = (data || []).map((lead: any) => {
        const lastContact = lead.last_contact_at ? new Date(lead.last_contact_at) : null;
        const hoursSinceLastContact = lastContact ? differenceInHours(now, lastContact) : null;

        return {
          ...lead,
          ai_temperature: lead.ai_temperature || "cold",
          lead_score: lead.lead_score || 0,
          estimated_value: lead.estimated_value || 0,
          conversion_probability: lead.conversion_probability || 0,
          automation_active: lead.automation_active || false,
          hoursSinceLastContact,
          slaBreach: hoursSinceLastContact !== null && hoursSinceLastContact > 24,
        } as SmartLead;
      });

      return { data: leads, totalCount: count ?? 0 };
    },
    enabled: !!currentWorkspace,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useLeadsKPIs() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["leads-kpis", currentWorkspace?.id],
    queryFn: async (): Promise<LeadsKPIs> => {
      if (!currentWorkspace) {
        return { receivedToday: 0, hotLeads: 0, noResponseOver24h: 0, avgResponseTimeHours: 0, conversionsThisWeek: 0, totalPipelineValue: 0 };
      }

      const now = new Date();
      const today = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const threshold24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // All KPI queries use head: true (0 rows transferred) with count: 'exact'
      const baseQuery = () => workspaceClient.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).is("archived_at", null);

      const [todayRes, hotRes, noResponseRes, conversionsRes, pipelineRes] = await Promise.all([
        baseQuery().gte("created_at", today.toISOString()),
        baseQuery().eq("ai_temperature", "hot"),
        baseQuery().lt("last_contact_at", threshold24h),
        baseQuery().eq("status", "completed").gte("updated_at", weekStart.toISOString()),
        workspaceClient.from("leads").select("estimated_value").eq("workspace_id", currentWorkspace.id).is("archived_at", null).gt("estimated_value", 0),
      ]);

      const totalPipelineValue = (pipelineRes.data || []).reduce((s: number, l: any) => s + (l.estimated_value || 0), 0);

      return {
        receivedToday: todayRes.count ?? 0,
        hotLeads: hotRes.count ?? 0,
        noResponseOver24h: noResponseRes.count ?? 0,
        avgResponseTimeHours: 0, // Simplified — would need a DB function for accuracy
        conversionsThisWeek: conversionsRes.count ?? 0,
        totalPipelineValue,
      };
    },
    enabled: !!currentWorkspace,
    staleTime: 30_000,
    refetchInterval: 60000,
  });
}

export function useAnalyzeLead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      messages, 
      conversationChannel,
      existingOpportunities 
    }: {
      leadId: string;
      messages?: Array<{ direction: string; content: string; sent_at: string }>;
      conversationChannel?: string;
      existingOpportunities?: Array<{ value: number; status: string }>;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data, error } = await supabase.functions.invoke("ai-analyze-lead", {
        body: {
          leadId,
          workspaceId: currentWorkspace.id,
          messages,
          conversationChannel,
          existingOpportunities,
        }
      });

      if (error) throw error;
      if (data?.fallback || data?.error) {
        console.warn('[LEADS] AI analysis fallback:', data.error);
        throw new Error(data.error || 'AI analysis unavailable');
      }
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["smart-leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kpis", currentWorkspace?.id] });
      console.log('[LEADS] AI analysis complete:', variables.leadId);

      if (currentWorkspace?.id && data) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'LEAD.SCORED',
          entity_kind: 'lead',
          entity_id: variables.leadId,
          source_module: 'crm-leads',
          payload: {
            lead_score: data.lead_score,
            ai_temperature: data.ai_temperature,
            source: 'ai-analyze',
          },
        });
      }
    },
    onError: (error) => {
      console.warn('[LEADS] AI_ANALYZE_FAILED', error.message);
    }
  });
}

export function useBulkAnalyzeLeads() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const results = await Promise.allSettled(
        leadIds.map(async (leadId) => {
          const { data, error } = await supabase.functions.invoke("ai-analyze-lead", {
            body: {
              leadId,
              workspaceId: currentWorkspace.id,
            }
          });
          if (error) throw error;
          return data;
        })
      );

      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;

      return { successful, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-leads", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kpis", currentWorkspace?.id] });
    }
  });
}
