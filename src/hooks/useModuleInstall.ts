import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useModuleInstall() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Check eligibility before install
  const checkModule = useMutation({
    mutationFn: async (moduleSlug: string) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data, error } = await supabase.functions.invoke("extension-check", {
        body: { workspaceId, moduleSlug },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        allowed: boolean;
        action: string;
        currentPlan?: string;
        requiredPlan?: string;
        module: { id: string; slug: string; name: string; pricing_model: string; price_eur: number };
      };
    },
  });

  // Install module (handles free/included/monthly)
  const installModule = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data, error } = await supabase.functions.invoke("module-checkout", {
        body: { moduleId, workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success?: boolean; url?: string; action?: string; message?: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        // Monthly → redirect to Stripe
        window.open(data.url, "_blank");
      } else if (data.success) {
        toast.success(data.message || "Módulo instalado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["installed-modules"] });
        queryClient.invalidateQueries({ queryKey: ["workspace-modules"] });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao instalar módulo");
    },
  });

  // Uninstall module
  const uninstallModule = useMutation({
    mutationFn: async ({ moduleId, moduleSlug }: { moduleId: string; moduleSlug: string }) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");

      // Call extension-provisioner to disable
      const { data, error } = await supabase.functions.invoke("extension-provisioner", {
        body: { action: "disable", module_slug: moduleSlug },
        headers: { "X-Workspace-Id": workspaceId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Módulo desinstalado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["installed-modules"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-modules"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao desinstalar módulo");
    },
  });

  return {
    checkModule,
    installModule,
    uninstallModule,
  };
}
