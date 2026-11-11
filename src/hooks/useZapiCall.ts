import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type Res = { error?: string; code?: string; connected?: boolean; token?: string; instanceId?: string; ok?: boolean; phone?: string; callLogId?: string };

export async function invokeZapiCall(workspaceId: string, action: "status" | "token" | "start" | "end", extra: Record<string, unknown> = {}): Promise<Res> {
  const { data, error } = await supabase.functions.invoke("whatsapp-zapi-call", { body: { action, workspaceId, ...extra } });
  if (error) throw new Error("Não foi possível contactar o serviço de chamadas.");
  const r = (data ?? {}) as Res;
  if (r.error) throw new Error(r.error);
  return r;
}

export function useZapiCallStatus() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["zapi-call-status", wsId], enabled: !!wsId, staleTime: 60_000, retry: false,
    queryFn: async () => (await invokeZapiCall(wsId!, "status")).connected === true,
  });
}
