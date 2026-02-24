import { useFeatureFlags, useToggleFeatureFlag } from "@/hooks/useFeatureFlags";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FlaskConical } from "lucide-react";
import { toast } from "sonner";

const FLAG_META: Record<string, { label: string; description: string }> = {
  "ui.shell_v2_enabled": {
    label: "Shell V2",
    description: "Nova shell global com navegação simplificada de 8 itens",
  },
  "ui.nav_v2_enabled": {
    label: "Navegação V2",
    description: "Sidebar V2 como fonte única de navegação",
  },
  "ui.marketplace_enabled": {
    label: "Marketplace",
    description: "Acesso ao marketplace de extensões e integrações",
  },
  "ui.objects_enabled": {
    label: "Objects",
    description: "Sistema de objetos dinâmicos com campos personalizados",
  },
  "ui.intelligence_enabled": {
    label: "Intelligence",
    description: "Dashboard de inteligência e insights com IA",
  },
};

const ALL_FLAGS = Object.keys(FLAG_META);

export function FeatureFlagsSettings() {
  const { data: flags, isLoading } = useFeatureFlags();
  const toggleFlag = useToggleFeatureFlag();

  const getFlagEnabled = (key: string) => {
    return flags?.find((f) => f.flag_key === key)?.enabled ?? false;
  };

  const handleToggle = (flagKey: string, enabled: boolean) => {
    toggleFlag.mutate(
      { flagKey, enabled },
      {
        onSuccess: () => toast.success(`Flag "${FLAG_META[flagKey]?.label}" ${enabled ? "ativada" : "desativada"}`),
        onError: () => toast.error("Erro ao atualizar flag"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Feature Flags</CardTitle>
          </div>
          <CardDescription>
            Controle funcionalidades experimentais para este workspace. Flags desativadas escondem a funcionalidade de todos os utilizadores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ALL_FLAGS.map((key) => {
            const meta = FLAG_META[key];
            const enabled = getFlagEnabled(key);
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">{meta.label}</Label>
                    <Badge variant="outline" className="text-[10px]">
                      {key}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => handleToggle(key, checked)}
                  disabled={toggleFlag.isPending}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
