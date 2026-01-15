import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export interface SmartContactsFilters {
  search?: string;
  temperature?: EntityTemperature | "all";
  source?: string | "all";
  smartFilter?: SmartFilterType;
  company?: string;
  contactType?: ContactType | "all";
}

export interface ContactsKPIs {
  totalContacts: number;
  hotContacts: number;
  noResponseOver24h: number;
  avgScore: number;
  decisionMakers: number;
  totalPipelineValue: number;
}

export function useSmartContacts(filters?: SmartContactsFilters) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["smart-contacts", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("contacts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("contact_score", { ascending: false });

      if (filters?.temperature && filters.temperature !== "all") {
        query = query.eq("ai_temperature", filters.temperature);
      }
      if (filters?.source && filters.source !== "all") {
        query = query.eq("source", filters.source);
      }
      if (filters?.company) {
        query = query.ilike("company", `%${filters.company}%`);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      const today = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });

      let contacts: SmartContact[] = (data || []).map((c: any) => {
        const lastContact = c.last_contact_at ? new Date(c.last_contact_at) : null;
        const hoursSinceLastContact = lastContact ? differenceInHours(now, lastContact) : null;

        return {
          ...c,
          ai_temperature: c.ai_temperature || "cold",
          contact_score: c.contact_score || 0,
          estimated_value: c.estimated_value || 0,
          conversion_probability: c.conversion_probability || 0,
          automation_active: c.automation_active || false,
          hoursSinceLastContact,
          slaBreach: hoursSinceLastContact !== null && hoursSinceLastContact > 24,
        } as SmartContact;
      });

      // Filter by contact type
      if (filters?.contactType && filters.contactType !== "all") {
        contacts = contacts.filter(c => c.ai_contact_type === filters.contactType);
      }

      if (filters?.smartFilter) {
        switch (filters.smartFilter) {
          case "hot": contacts = contacts.filter(c => c.ai_temperature === "hot"); break;
          case "no_response": contacts = contacts.filter(c => c.hoursSinceLastContact && c.hoursSinceLastContact > 24); break;
          case "high_intent": contacts = contacts.filter(c => c.contact_score >= 70); break;
          case "automation_active": contacts = contacts.filter(c => c.automation_active); break;
          case "decision_makers": contacts = contacts.filter(c => c.ai_contact_type === "decision_maker"); break;
          case "today": contacts = contacts.filter(c => new Date(c.created_at) >= today); break;
          case "this_week": contacts = contacts.filter(c => new Date(c.created_at) >= weekStart); break;
        }
      }

      return contacts;
    },
    enabled: !!currentWorkspace,
  });
}

export function useContactsKPIs() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["contacts-kpis", currentWorkspace?.id],
    queryFn: async (): Promise<ContactsKPIs> => {
      if (!currentWorkspace) return { totalContacts: 0, hotContacts: 0, noResponseOver24h: 0, avgScore: 0, decisionMakers: 0, totalPipelineValue: 0 };

      const now = new Date();
      const threshold24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const { data: contacts } = await workspaceClient
        .from("contacts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      const totalContacts = contacts?.length || 0;
      const hotContacts = contacts?.filter(c => c.ai_temperature === "hot").length || 0;
      const noResponseOver24h = contacts?.filter(c => c.last_contact_at && c.last_contact_at < threshold24h).length || 0;
      const avgScore = totalContacts > 0 ? Math.round(contacts!.reduce((s, c) => s + (c.contact_score || 0), 0) / totalContacts) : 0;
      const decisionMakers = contacts?.filter(c => c.ai_contact_type === "decision_maker").length || 0;
      const totalPipelineValue = contacts?.reduce((s, c) => s + (c.estimated_value || 0), 0) || 0;

      return { totalContacts, hotContacts, noResponseOver24h, avgScore, decisionMakers, totalPipelineValue };
    },
    enabled: !!currentWorkspace,
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