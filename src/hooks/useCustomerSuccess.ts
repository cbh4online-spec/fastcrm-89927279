import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useCustomerSuccess() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const qc = useQueryClient();

  const accounts = useQuery({
    queryKey: ["cs-accounts", wsId],
    queryFn: async () => {
      const q = supabase.from("customer_accounts").select("*").order("health_score", { ascending: true });
      if (wsId) q.eq("workspace_id", wsId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  const risks = useQuery({
    queryKey: ["cs-risks", wsId],
    queryFn: async () => {
      const q = supabase.from("customer_churn_risks").select("*, customer_accounts(name)").eq("status", "open").order("severity");
      if (wsId) q.eq("workspace_id", wsId);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  const opportunities = useQuery({
    queryKey: ["cs-opps", wsId],
    queryFn: async () => {
      const q = supabase.from("customer_expansion_opportunities").select("*, customer_accounts(name)").neq("status", "dismissed");
      if (wsId) q.eq("workspace_id", wsId);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  const checkins = useQuery({
    queryKey: ["cs-checkins", wsId],
    queryFn: async () => {
      const q = supabase.from("customer_success_checkins").select("*, customer_accounts(name)").order("scheduled_at");
      if (wsId) q.eq("workspace_id", wsId);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  const playbooks = useQuery({
    queryKey: ["cs-playbooks"],
    queryFn: async () => (await supabase.from("customer_success_playbooks").select("*").order("name")).data ?? [],
  });

  const refreshHealth = useMutation({
    mutationFn: async (customer_account_id: string) => {
      const { data, error } = await supabase.functions.invoke("customer-success-generate-health-score", {
        body: { customer_account_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Health score atualizado");
      qc.invalidateQueries({ queryKey: ["cs-accounts", wsId] });
      qc.invalidateQueries({ queryKey: ["cs-account-detail"] });
    },
    onError: () => toast.error("Erro ao calcular health score"),
  });

  const generateSummary = useMutation({
    mutationFn: async (vars: { customer_account_id: string; mode?: "summary" | "retention" }) => {
      const { data, error } = await supabase.functions.invoke("customer-success-generate-summary", { body: vars });
      if (error) throw error;
      return data;
    },
  });

  const generateQBR = useMutation({
    mutationFn: async (customer_account_id: string) => {
      const { data, error } = await supabase.functions.invoke("customer-success-generate-qbr", { body: { customer_account_id } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("QBR gerado");
      qc.invalidateQueries({ queryKey: ["cs-account-detail"] });
    },
  });

  return { accounts, risks, opportunities, checkins, playbooks, refreshHealth, generateSummary, generateQBR };
}

export function useCustomerAccount(id: string | undefined) {
  return useQuery({
    queryKey: ["cs-account-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const [account, snapshots, risks, opps, checkins, tasks, qbrs, signals] = await Promise.all([
        supabase.from("customer_accounts").select("*").eq("id", id).maybeSingle(),
        supabase.from("customer_health_score_snapshots").select("*").eq("customer_account_id", id).order("created_at", { ascending: false }).limit(20),
        supabase.from("customer_churn_risks").select("*").eq("customer_account_id", id).order("severity"),
        supabase.from("customer_expansion_opportunities").select("*").eq("customer_account_id", id),
        supabase.from("customer_success_checkins").select("*").eq("customer_account_id", id).order("scheduled_at", { ascending: false }),
        supabase.from("customer_success_tasks").select("*").eq("customer_account_id", id).order("due_at"),
        supabase.from("customer_qbr_reviews").select("*").eq("customer_account_id", id).order("period_end", { ascending: false }),
        supabase.from("customer_success_signals").select("*").eq("customer_account_id", id).order("detected_at", { ascending: false }).limit(50),
      ]);
      return {
        account: account.data,
        snapshots: snapshots.data ?? [],
        risks: risks.data ?? [],
        opportunities: opps.data ?? [],
        checkins: checkins.data ?? [],
        tasks: tasks.data ?? [],
        qbrs: qbrs.data ?? [],
        signals: signals.data ?? [],
      };
    },
    enabled: !!id,
  });
}
