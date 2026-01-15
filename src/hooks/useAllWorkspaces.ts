import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AllWorkspace {
  id: string;
  name: string;
  slug: string;
  status: string;
  owner_id: string;
  created_at: string;
  subscription?: {
    plan: string;
    status: string;
    current_period_end: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
  };
  usage?: {
    leads_count: number;
    contacts_count: number;
    companies_count: number;
    ai_calls_used: number;
    emails_sent: number;
  };
  members_count?: number;
}

export function useAllWorkspaces() {
  const { data: workspaces, isLoading, error, refetch } = useQuery({
    queryKey: ["all-workspaces"],
    queryFn: async () => {
      // Fetch workspaces with subscriptions and usage
      const { data: workspacesData, error: workspacesError } = await supabase
        .from("workspaces")
        .select(`
          id, 
          name, 
          slug, 
          status,
          owner_id,
          created_at,
          workspace_subscriptions (
            plan,
            status,
            current_period_end,
            stripe_customer_id,
            stripe_subscription_id
          ),
          workspace_usage (
            leads_count,
            contacts_count,
            companies_count,
            ai_calls_used,
            emails_sent
          )
        `)
        .order("name");

      if (workspacesError) throw workspacesError;

      // Get member counts
      const { data: membersData } = await supabase
        .from("workspace_members")
        .select("workspace_id");

      const memberCounts = membersData?.reduce((acc, m) => {
        acc[m.workspace_id] = (acc[m.workspace_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Transform data
      const result: AllWorkspace[] = (workspacesData || []).map((ws: any) => ({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        status: ws.status || "active",
        owner_id: ws.owner_id,
        created_at: ws.created_at,
        subscription: ws.workspace_subscriptions?.[0] || undefined,
        usage: ws.workspace_usage?.[0] || undefined,
        members_count: memberCounts[ws.id] || 1,
      }));

      return result;
    },
  });

  return {
    workspaces: workspaces ?? [],
    isLoading,
    error,
    refetch,
  };
}
