import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  readAutoPostDemoConfig,
  type LeadChefAutoPostDemoConfig,
  DEFAULT_AUTO_POST_DEMO,
} from "@/utils/leadchef/autoPostDemo";

export function LeadChefAutoPostDemoSettings() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: cfgRow, isLoading } = useQuery({
    queryKey: ["leadchef-app-config", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leadchef_app_config")
        .select("workspace_id, features")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["leadchef-templates-post-demo", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leadchef_message_templates")
        .select("id, name, body")
        .eq("workspace_id", workspaceId)
        .eq("category", "post_demo_follow_up")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [local, setLocal] = useState<LeadChefAutoPostDemoConfig>(DEFAULT_AUTO_POST_DEMO);
  useEffect(() => {
    setLocal(readAutoPostDemoConfig(cfgRow?.features));
  }, [cfgRow]);

  const save = useMutation({
    mutationFn: async (next: LeadChefAutoPostDemoConfig) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");
      const features = { ...(cfgRow?.features ?? {}), auto_post_demo: next };
      const { error } = await (supabase as any)
        .from("leadchef_app_config")
        .upsert(
          { workspace_id: workspaceId, features },
          { onConflict: "workspace_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-app-config", workspaceId] });
      toast.success("Configuração guardada.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao guardar."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Auto envio pós-demonstração
        </CardTitle>
        <CardDescription>
          Envia automaticamente uma mensagem WhatsApp algumas horas após cada
          demonstração ser concluída. Cancela-se sozinho se o lead responder
          ou mudar de etapa, e podes cancelar manualmente a partir do detalhe
          do lead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Ativar auto envio</Label>
                <p className="text-xs text-muted-foreground">
                  Quando ligado, cada demo concluída agenda um envio.
                </p>
              </div>
              <Switch
                checked={local.enabled}
                onCheckedChange={(v) => setLocal((s) => ({ ...s, enabled: v }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Atraso (horas)</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={local.delay_hours}
                  onChange={(e) =>
                    setLocal((s) => ({
                      ...s,
                      delay_hours: Math.max(1, Number(e.target.value) || 24),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">Recomendado: 24 horas.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Template</Label>
                <Select
                  value={local.template_id ?? "auto"}
                  onValueChange={(v) =>
                    setLocal((s) => ({
                      ...s,
                      template_id: v === "auto" ? null : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (primeiro pós-demo)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto — primeiro template pós-demo</SelectItem>
                    {(templates ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cria templates na categoria “Follow-up pós-demonstração”.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => save.mutate(local)}
                disabled={save.isPending || !workspaceId}
              >
                {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
