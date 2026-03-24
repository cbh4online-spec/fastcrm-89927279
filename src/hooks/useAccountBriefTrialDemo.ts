import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  {
    name: "TechFlow Solutions",
    domain: "techflow.demo",
    normalized_domain: "techflow.demo",
    total_score: 82,
    score_label: "Muito Alto",
    probable_sector: "SaaS / Tecnologia",
    probable_geography: "Portugal",
    executive_summary: "Empresa de automação de processos com crescimento acelerado. Sinais fortes de contratação e expansão internacional. Pricing público e presença digital madura.",
    commercial_status: "researching" as const,
    favorite: true,
  },
  {
    name: "GreenBuild Engenharia",
    domain: "greenbuild.demo",
    normalized_domain: "greenbuild.demo",
    total_score: 54,
    score_label: "Médio",
    probable_sector: "Construção / Engenharia",
    probable_geography: "Lisboa, Portugal",
    executive_summary: "Construtora sustentável com projetos em expansão. Site com informação limitada sobre serviços. Oportunidade de personalização alta.",
    commercial_status: "new" as const,
    favorite: false,
  },
  {
    name: "MediCare Digital",
    domain: "medicare.demo",
    normalized_domain: "medicare.demo",
    total_score: 71,
    score_label: "Alto",
    probable_sector: "Saúde / HealthTech",
    probable_geography: "Porto, Portugal",
    executive_summary: "Plataforma de telemedicina em crescimento rápido. Vagas abertas em vendas e produto. Site com CTA clara e pricing transparente. Boa maturidade digital.",
    commercial_status: "outreach_ready" as const,
    favorite: false,
  },
];

export function useAccountBriefTrialDemo() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const seedDemo = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Workspace não encontrado");

      const { data: existing } = await supabase
        .from("account_brief_accounts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .in("domain", DEMO_ACCOUNTS.map((a) => a.domain));

      if (existing && existing.length > 0) {
        throw new Error("Contas demo já existem neste workspace");
      }

      const toInsert = DEMO_ACCOUNTS.map((a) => ({
        ...a,
        workspace_id: workspaceId,
        last_analysis_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("account_brief_accounts")
        .insert(toInsert)
        .select();

      if (error) throw error;

      // Seed scores for demo accounts
      if (data) {
        const scores = data.map((acc, i) => ({
          workspace_id: workspaceId,
          account_id: acc.id,
          total_score: DEMO_ACCOUNTS[i].total_score,
          score_label: DEMO_ACCOUNTS[i].score_label,
          maturity_score: Math.round(DEMO_ACCOUNTS[i].total_score * 0.9),
          growth_score: Math.round(DEMO_ACCOUNTS[i].total_score * 1.1),
          icp_fit_score: Math.round(DEMO_ACCOUNTS[i].total_score * 0.85),
          personalization_score: Math.round(DEMO_ACCOUNTS[i].total_score * 0.95),
          confidence_score: 75,
          score_validity_status: "valid",
        }));

        await supabase.from("account_brief_scores").insert(scores);

        // Add first account to watchlist if table exists
        try {
          await supabase.from("account_brief_watchlists").insert([{
            workspace_id: workspaceId,
            account_id: data[0].id,
            frequency: "weekly",
            reason: "Conta demo — monitorização semanal",
            is_active: true,
            next_run_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }]);
        } catch { /* watchlist table may not exist */ }
      }

      return data;
    },
    onSuccess: () => {
      toast.success("3 contas demo criadas com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const cleanDemo = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { error } = await supabase
        .from("account_brief_accounts")
        .delete()
        .eq("workspace_id", workspaceId)
        .in("domain", DEMO_ACCOUNTS.map((a) => a.domain));
      if (error) throw error;
    },
    onSuccess: () => toast.success("Contas demo removidas"),
    onError: (err: Error) => toast.error(err.message),
  });

  return { seedDemo, cleanDemo, DEMO_ACCOUNTS };
}
