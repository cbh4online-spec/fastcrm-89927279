import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("cloudtalk-manage", { body });
  if (error) {
    let msg = (data as any)?.message;
    try { msg = msg ?? (await (error as any).context?.json?.())?.message; } catch { /* ignore */ }
    throw new Error(msg || "Erro na ligação à CloudTalk");
  }
  return data;
}

export function useCloudtalk() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();
  const { installedModuleIds } = useWorkspaceModules();
  const moduleActive = installedModuleIds.includes("cloudtalk");

  const status = useQuery({
    queryKey: ["cloudtalk-status", workspaceId ?? "none"],
    enabled: !!workspaceId && moduleActive,
    queryFn: async () => {
      const [{ data: conn }, { data: user }] = await Promise.all([
        supabase.from("cloudtalk_connections").select("enabled, last_event_at, auto_ai_summary").eq("workspace_id", workspaceId!).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      const { data: agent } = await supabase.from("cloudtalk_agents").select("id, agent_id")
        .eq("workspace_id", workspaceId!).eq("user_id", user.user?.id ?? "").maybeSingle();
      let manager = false;
      try { manager = !!(await invoke({ action: "me", workspaceId }))?.manager; } catch { manager = false; }
      return { connected: !!conn?.enabled, lastEventAt: conn?.last_event_at ?? null, autoAi: !!conn?.auto_ai_summary, agent, userId: user.user?.id, manager };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["cloudtalk-status", workspaceId ?? "none"] });

  const connect = useMutation({
    mutationFn: (v: { apiKeyId: string; apiKeySecret: string }) => invoke({ action: "connect", workspaceId, ...v }),
    onSuccess: refresh,
  });
  const disconnect = useMutation({ mutationFn: () => invoke({ action: "disconnect", workspaceId }), onSuccess: refresh });
  const webhookInfo = useMutation({ mutationFn: () => invoke({ action: "webhook_info", workspaceId }) as Promise<{ url: string }> });
  const setAutoAi = useMutation({ mutationFn: (enabled: boolean) => invoke({ action: "set_auto_ai", workspaceId, enabled }), onSuccess: refresh });
  const call = useMutation({ mutationFn: (phone: string) => invoke({ action: "call", workspaceId, phone }) });
  const saveAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const userId = status.data?.userId;
      if (!workspaceId || !userId) throw new Error("Sessão inválida");
      const { error } = await supabase.from("cloudtalk_agents")
        .upsert({ workspace_id: workspaceId, user_id: userId, agent_id: agentId.trim() }, { onConflict: "workspace_id,user_id" });
      if (error) throw new Error("Não foi possível guardar o ID de agente");
    },
    onSuccess: refresh,
  });

  return { workspaceId, moduleActive, status, connect, disconnect, webhookInfo, call, saveAgent, setAutoAi };
}

export function useCloudtalkCalls(filter: { contactId?: string; leadId?: string }) {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  return useQuery({
    queryKey: ["cloudtalk-calls", ws ?? "none", filter.contactId ?? "", filter.leadId ?? ""],
    enabled: !!ws && !!(filter.contactId || filter.leadId),
    queryFn: async () => {
      let q = supabase.from("cloudtalk_calls")
        .select("id, direction, status, agent_name, duration_seconds, started_at, recording_url, external_number, transcript, summary, sentiment, action_items, ai_source, ai_status, ai_error")
        .eq("workspace_id", ws!).order("started_at", { ascending: false, nullsFirst: false }).limit(50);
      q = filter.contactId ? q.eq("contact_id", filter.contactId) : q.eq("lead_id", filter.leadId!);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGenerateCallSummary() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (callId: string) => {
      const { data, error } = await supabase.functions.invoke("cloudtalk-ai-summary", { body: { workspaceId: currentWorkspace?.id, callId } });
      let msg = (data as any)?.message;
      if (error) { try { msg = msg ?? (await (error as any).context?.json?.())?.message; } catch { /* ignore */ } throw new Error(msg || "Não foi possível gerar o resumo"); }
      if ((data as any)?.fallback) throw new Error(msg || "Não foi possível gerar o resumo");
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["cloudtalk-calls"] }),
  });
}
