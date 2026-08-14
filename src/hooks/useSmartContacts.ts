import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, startOfDay, startOfWeek } from "date-fns";

export type EntityTemperature = "cold" | "warm" | "hot";
export type ContactTemperature = EntityTemperature;
export type NextActionType = "reply_manual" | "send_template" | "create_opportunity" | "activate_automation" | "archive" | "follow_up" | "schedule_meeting" | "nurture";
export type ContactType = "decision_maker" | "influencer" | "champion" | "blocker" | "end_user" | "unknown";
export type SmartFilterType = "hot" | "no_response" | "high_intent" | "automation_active" | "today" | "this_week" | "decision_makers";

export interface SmartContact {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  company_id: string | null;
  job_title: string | null;
  notes: string | null;
  tags: string[] | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  last_contact_at: string | null;
  ai_temperature: EntityTemperature;
  contact_score: number;
  ai_next_action: string | null;
  ai_next_action_type: NextActionType | null;
  ai_insight: string | null;
  ai_contact_type: ContactType | null;
  estimated_value: number;
  conversion_probability: number;
  ai_analyzed_at: string | null;
  assigned_to: string | null;
  automation_active: boolean;
  hoursSinceLastContact: number | null;
  slaBreach: boolean;
}

export type ArchiveState = "active" | "archived" | "all";

export interface SmartContactsFilters {
  search?: string;
  temperature?: EntityTemperature | "all";
  source?: string | "all";
  smartFilter?: SmartFilterType;
  company?: string;
  contactType?: ContactType | "all";
  sortBy?: string;
  page?: number;
  pageSize?: number;
  archiveState?: ArchiveState;
}

export interface ContactsKPIs {
  totalContacts: number;
  hotContacts: number;
  noResponseOver24h: number;
  avgScore: number;
  decisionMakers: number;
  totalPipelineValue: number;
}

export interface SmartContactsResult {
  data: SmartContact[];
  totalCount: number;
}

const CONTACTS_SELECT_COLUMNS = `
  id, workspace_id, name, email, phone, company, company_id,
  job_title, notes, tags, source, created_at, updated_at,
  last_contact_at, ai_temperature, contact_score,
  ai_next_action, ai_next_action_type, ai_insight, ai_contact_type,
  estimated_value, conversion_probability, ai_analyzed_at,
  assigned_to, automation_active,
  is_blocked, block_reason, archived_at, archive_reason,
  companies:company_id (id, name)
`;

export function useSmartContacts(filters?: SmartContactsFilters): ReturnType<typeof useQuery<SmartContactsResult>> {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  const page = filters?.page;
  const pageSize = filters?.pageSize;
  const paginate = typeof page === "number" && typeof pageSize === "number";

  return useQuery({
    queryKey: ["smart-contacts", currentWorkspace?.id, filters],
    queryFn: async (): Promise<SmartContactsResult> => {
      if (!currentWorkspace) return { data: [], totalCount: 0 };

      const now = new Date();
      const today = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const threshold24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Determine sort column and direction
      const sortBy = filters?.sortBy || "score_desc";
      let sortColumn = "contact_score";
      let sortAscending = false;
      switch (sortBy) {
        case "created_desc": sortColumn = "created_at"; sortAscending = false; break;
        case "created_asc": sortColumn = "created_at"; sortAscending = true; break;
        case "score_desc": sortColumn = "contact_score"; sortAscending = false; break;
        case "score_asc": sortColumn = "contact_score"; sortAscending = true; break;
        case "name_asc": sortColumn = "name"; sortAscending = true; break;
        case "name_desc": sortColumn = "name"; sortAscending = false; break;
        case "company_asc": sortColumn = "company"; sortAscending = true; break;
        case "company_desc": sortColumn = "company"; sortAscending = false; break;
        case "temperature_hot": sortColumn = "ai_temperature"; sortAscending = false; break;
        case "temperature_cold": sortColumn = "ai_temperature"; sortAscending = true; break;
        default: sortColumn = "contact_score"; sortAscending = false;
      }

      let query = workspaceClient
        .from("contacts")
        .select(CONTACTS_SELECT_COLUMNS, { count: 'exact' })
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null)
        .order(sortColumn, { ascending: sortAscending });

      const archiveState = filters?.archiveState ?? "active";
      if (archiveState === "active") query = query.is("archived_at", null);
      else if (archiveState === "archived") query = query.not("archived_at", "is", null);



      if (filters?.temperature && filters.temperature !== "all") {
        query = query.eq("ai_temperature", filters.temperature);
      }
      if (filters?.source && filters.source !== "all") {
        query = query.eq("source", filters.source);
      }
      if (filters?.company) {
        query = query.ilike("company", `%${filters.company}%`);
      }
      if (filters?.contactType && filters.contactType !== "all") {
        query = query.eq("ai_contact_type", filters.contactType);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
      }

      // Smart filters at SQL level
      if (filters?.smartFilter) {
        switch (filters.smartFilter) {
          case "hot": query = query.eq("ai_temperature", "hot"); break;
          case "no_response": query = query.lt("last_contact_at", threshold24h); break;
          case "high_intent": query = query.gte("contact_score", 70); break;
          case "automation_active": query = query.eq("automation_active", true); break;
          case "decision_makers": query = query.eq("ai_contact_type", "decision_maker"); break;
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

      const contacts: SmartContact[] = (data || []).map((c: any) => {
        const lastContact = c.last_contact_at ? new Date(c.last_contact_at) : null;
        const hoursSinceLastContact = lastContact ? differenceInHours(now, lastContact) : null;
        const companyName = c.companies?.name || c.company || null;

        return {
          ...c,
          company: companyName,
          ai_temperature: c.ai_temperature || "cold",
          contact_score: c.contact_score || 0,
          estimated_value: c.estimated_value || 0,
          conversion_probability: c.conversion_probability || 0,
          automation_active: c.automation_active || false,
          hoursSinceLastContact,
          slaBreach: hoursSinceLastContact !== null && hoursSinceLastContact > 24,
        } as SmartContact;
      });

      return { data: contacts, totalCount: count ?? 0 };
    },
    enabled: !!currentWorkspace,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useContactsKPIs() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["contacts-kpis", currentWorkspace?.id],
    queryFn: async (): Promise<ContactsKPIs> => {
      if (!currentWorkspace) return { totalContacts: 0, hotContacts: 0, noResponseOver24h: 0, avgScore: 0, decisionMakers: 0, totalPipelineValue: 0 };

      const threshold24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const baseQuery = () => workspaceClient.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).is("deleted_at", null).is("archived_at", null);

      const [totalRes, hotRes, noResponseRes, dmRes, valueRes] = await Promise.all([
        baseQuery(),
        baseQuery().eq("ai_temperature", "hot"),
        baseQuery().lt("last_contact_at", threshold24h),
        baseQuery().eq("ai_contact_type", "decision_maker"),
        workspaceClient.from("contacts").select("estimated_value, contact_score").eq("workspace_id", currentWorkspace.id).is("deleted_at", null).is("archived_at", null).gt("estimated_value", 0),
      ]);

      const totalContacts = totalRes.count ?? 0;
      const values = valueRes.data || [];
      const totalPipelineValue = values.reduce((s: number, c: any) => s + (c.estimated_value || 0), 0);
      
      // For avg score, we need a lightweight query
      const { data: scoreData } = await workspaceClient.from("contacts").select("contact_score").eq("workspace_id", currentWorkspace.id).is("deleted_at", null).is("archived_at", null);
      const avgScore = scoreData && scoreData.length > 0
        ? Math.round(scoreData.reduce((s: number, c: any) => s + (c.contact_score || 0), 0) / scoreData.length)
        : 0;

      return {
        totalContacts,
        hotContacts: hotRes.count ?? 0,
        noResponseOver24h: noResponseRes.count ?? 0,
        avgScore,
        decisionMakers: dmRes.count ?? 0,
        totalPipelineValue,
      };
    },
    enabled: !!currentWorkspace,
    staleTime: 30_000,
    refetchInterval: 60000,
  });
}

export function useAnalyzeContact() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ contactId }: { contactId: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("ai-analyze-entity", {
        body: { entityId: contactId, entityType: "contact", workspaceId: currentWorkspace.id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-contacts", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts-kpis", currentWorkspace?.id] });
    }
  });
}

export function useBulkAnalyzeContacts() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const results = await Promise.allSettled(
        contactIds.map(id => supabase.functions.invoke("ai-analyze-entity", {
          body: { entityId: id, entityType: "contact", workspaceId: currentWorkspace.id }
        }))
      );
      return { successful: results.filter(r => r.status === "fulfilled").length, failed: results.filter(r => r.status === "rejected").length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-contacts", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts-kpis", currentWorkspace?.id] });
    }
  });
}
