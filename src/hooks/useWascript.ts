import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface WascriptStatus {
  connected: boolean;
  status: "connected" | "error" | "disconnected";
  lastError: string | null;
  lastCheckedAt: string | null;
  lastInboundAt: string | null;
  webhookUrl: string | null;
  isPrimary: boolean;
  warning?: string | null;
  ok?: boolean;
  message?: string;
}

type Action = "status" | "save" | "test" | "set_primary" | "disconnect" | "rotate_webhook";

async function call(workspaceId: string, action: Action, extra: Record<string, unknown> = {}): Promise<WascriptStatus> {
  const { data, error } = await supabase.functions.invoke("wascript-manage", { body: { action, workspaceId, ...extra } });
  if (error) throw new Error("Não foi possível contactar o servidor.");
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Pedido inválido.");
  return data as WascriptStatus;
}

export function useWascript() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const qc = useQueryClient();
  const key = ["wascript-status", wsId];
  const status = useQuery({ queryKey: key, enabled: !!wsId, queryFn: () => call(wsId!, "status") });
  const mutate = useMutation({
    mutationFn: ({ action, extra }: { action: Action; extra?: Record<string, unknown> }) => call(wsId!, action, extra),
    onSuccess: (d) => {
      qc.setQueryData(key, d);
      qc.invalidateQueries({ queryKey: ["whatsapp-provider-instance"] });
    },
  });
  return { status, mutate };
}
