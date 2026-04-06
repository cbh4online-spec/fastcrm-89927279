import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useState } from "react";

export type TicketStatus = "open" | "in_progress" | "waiting_client" | "waiting_internal" | "on_hold" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketType = "support" | "commercial" | "technical" | "billing" | "feature_request";
export type TicketChannel = "email" | "phone" | "portal" | "chat" | "manual";

export interface SupportTicket {
  id: string;
  workspace_id: string;
  ticket_number: number;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  channel: TicketChannel;
  department: string | null;
  assigned_to: string | null;
  contact_id: string | null;
  company_id: string | null;
  tags: string[];
  sla_deadline: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  total_time_minutes: number;
  total_cost: number;
  // Joined fields
  contact_name?: string | null;
  contact_email?: string | null;
  company_name?: string | null;
  assigned_agent_name?: string | null;
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  type?: TicketType[];
  department?: string;
  assigned_to?: string;
  search?: string;
}

export function useHelpdeskTickets(filters?: TicketFilters) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: tickets = [], isLoading, error, isError, refetch } = useQuery({
    queryKey: ["helpdesk-tickets", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];

      // 1. Fetch tickets without joins
      let query = supabase
        .from("support_tickets")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (filters?.status?.length) {
        query = query.in("status", filters.status);
      }
      if (filters?.priority?.length) {
        query = query.in("priority", filters.priority);
      }
      if (filters?.type?.length) {
        query = query.in("type", filters.type);
      }
      if (filters?.department) {
        query = query.eq("department", filters.department);
      }
      if (filters?.assigned_to) {
        query = query.eq("assigned_to", filters.assigned_to);
      }
      if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return [] as SupportTicket[];

      // 2. Collect unique IDs for enrichment
      const contactIds = [...new Set(data.map((t: any) => t.contact_id).filter(Boolean))];
      const companyIds = [...new Set(data.map((t: any) => t.company_id).filter(Boolean))];
      const assignedIds = [...new Set(data.map((t: any) => t.assigned_to).filter(Boolean))];

      // 3. Fetch related entities in parallel
      const [contactsRes, companiesRes, profilesRes] = await Promise.all([
        contactIds.length > 0
          ? supabase.from("contacts").select("id, name, email").in("id", contactIds)
          : { data: [] },
        companyIds.length > 0
          ? supabase.from("companies").select("id, name").in("id", companyIds)
          : { data: [] },
        assignedIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", assignedIds)
          : { data: [] },
      ]);

      // 4. Build lookup maps
      const contactMap = new Map((contactsRes.data || []).map((c: any) => [c.id, c]));
      const companyMap = new Map((companiesRes.data || []).map((c: any) => [c.id, c]));
      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));

      // 5. Enrich tickets
      return data.map((row: any) => ({
        ...row,
        contact_name: contactMap.get(row.contact_id)?.name || null,
        contact_email: contactMap.get(row.contact_id)?.email || null,
        company_name: companyMap.get(row.company_id)?.name || null,
        assigned_agent_name: profileMap.get(row.assigned_to)?.full_name || null,
      })) as SupportTicket[];
    },
    enabled: !!workspaceId,
  });

  const createTicket = useMutation({
    mutationFn: async (input: {
      subject: string;
      description?: string;
      priority: TicketPriority;
      type: TicketType;
      channel?: TicketChannel;
      department?: string;
      assigned_to?: string;
      contact_id?: string;
      company_id?: string;
      tags?: string[];
      sla_deadline?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          workspace_id: workspaceId,
          subject: input.subject,
          description: input.description || null,
          priority: input.priority as any,
          type: input.type as any,
          channel: (input.channel || "manual") as any,
          department: input.department || null,
          assigned_to: input.assigned_to || null,
          contact_id: input.contact_id || null,
          company_id: input.company_id || null,
          tags: input.tags || [],
          sla_deadline: input.sla_deadline || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    },
  });

  const updateTicket = useMutation({
    mutationFn: async (input: { id: string } & Partial<Omit<SupportTicket, "id" | "workspace_id" | "ticket_number" | "created_at">>) => {
      const { id, contact_name, contact_email, company_name, assigned_agent_name, ...updates } = input as any;
      // Auto-set timestamps
      if (updates.status === "resolved" && !updates.resolved_at) {
        updates.resolved_at = new Date().toISOString();
      }
      if (updates.status === "closed" && !updates.closed_at) {
        updates.closed_at = new Date().toISOString();
      }
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("support_tickets")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    },
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    },
  });

  // KPI stats
  const openCount = tickets.filter(t => !["resolved", "closed"].includes(t.status)).length;
  const urgentUnassigned = tickets.filter(t => t.priority === "urgent" && !t.assigned_to && !["resolved", "closed"].includes(t.status));
  const resolvedToday = tickets.filter(t => {
    if (!t.resolved_at) return false;
    const today = new Date().toISOString().slice(0, 10);
    return t.resolved_at.slice(0, 10) === today;
  }).length;

  const slaBreached = tickets.filter(t => {
    if (!t.sla_deadline || ["resolved", "closed"].includes(t.status)) return false;
    return new Date(t.sla_deadline) < new Date();
  }).length;

  const slaCompliance = tickets.length > 0
    ? Math.round(((tickets.length - slaBreached) / tickets.length) * 100)
    : 100;

  return {
    tickets,
    isLoading,
    error,
    isError,
    refetch,
    createTicket,
    updateTicket,
    deleteTicket,
    stats: { openCount, urgentUnassigned, resolvedToday, slaCompliance, slaBreached },
  };
}

export function useHelpdeskTicketMessages(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["helpdesk-messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!ticketId,
  });

  const sendMessage = useMutation({
    mutationFn: async (input: { message: string; is_internal_note?: boolean }) => {
      if (!ticketId) throw new Error("No ticket");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: ticketId,
          sender_type: "agent" as any,
          sender_id: user?.id || null,
          message: input.message,
          is_internal_note: input.is_internal_note || false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-messages", ticketId] });
    },
  });

  return { messages, isLoading, sendMessage };
}
