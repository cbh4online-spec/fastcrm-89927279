import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  ensurePushPermission,
  isPushSupported,
  registerLeadChefSW,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/utils/leadchef/push";
import { toast } from "sonner";

export function useLeadChefPush() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;
  const userId = user?.id;
  const supported = isPushSupported();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  const subQuery = useQuery({
    queryKey: ["leadchef-push-sub", wsId, userId],
    enabled: !!wsId && !!userId,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("leadchef_push_subscriptions")
        .select("id, endpoint, enabled")
        .eq("workspace_id", wsId)
        .eq("user_id", userId)
        .eq("enabled", true)
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const enable = useMutation({
    mutationFn: async () => {
      if (!supported) throw new Error("Notificações não suportadas neste dispositivo.");
      if (!wsId || !userId) throw new Error("Sem sessão.");
      const perm = await ensurePushPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Permissão de notificações recusada.");
      const reg = await registerLeadChefSW();
      const sub = await subscribeToPush(reg);
      const sb = supabase as any;
      const { error } = await sb.from("leadchef_push_subscriptions").upsert(
        {
          workspace_id: wsId,
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          user_agent: navigator.userAgent.slice(0, 200),
          enabled: true,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notificações ativadas.");
      qc.invalidateQueries({ queryKey: ["leadchef-push-sub"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao ativar notificações."),
  });

  const disable = useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeFromPush();
      const sb = supabase as any;
      if (endpoint) {
        await sb.from("leadchef_push_subscriptions").update({ enabled: false }).eq("endpoint", endpoint);
      } else if (userId && wsId) {
        await sb.from("leadchef_push_subscriptions").update({ enabled: false }).eq("user_id", userId).eq("workspace_id", wsId);
      }
    },
    onSuccess: () => {
      toast.success("Notificações desativadas.");
      qc.invalidateQueries({ queryKey: ["leadchef-push-sub"] });
    },
  });

  const sendTest = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("leadchef-push-dispatcher", {
        body: { mode: "test", workspace_id: wsId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Notificação de teste enviada."),
    onError: (e: any) => toast.error(e.message ?? "Falha no envio de teste."),
  });

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["leadchef-push-sub"] }), [qc]);

  return {
    supported,
    permission,
    isEnabled: !!subQuery.data,
    isLoading: subQuery.isLoading,
    enable: () => enable.mutate(),
    disable: () => disable.mutate(),
    sendTest: () => sendTest.mutate(),
    isEnabling: enable.isPending,
    isDisabling: disable.isPending,
    isSending: sendTest.isPending,
    refresh,
  };
}
