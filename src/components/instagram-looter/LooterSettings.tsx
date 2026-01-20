import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export function LooterSettings() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  
  const [dailyLimit, setDailyLimit] = useState(200);
  const [rateLimit, setRateLimit] = useState(3);
  const [features, setFeatures] = useState({
    global_search: true,
    hashtag: true,
    location: true,
    explore: true,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ["ig-looter-config", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from("ig_looter_config")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  useEffect(() => {
    if (config) {
      setDailyLimit(config.daily_action_limit || 200);
      setRateLimit(config.rate_limit_seconds || 3);
      const configFeatures = config.enabled_features as Record<string, boolean> | null;
      setFeatures({
        global_search: configFeatures?.global_search ?? true,
        hashtag: configFeatures?.hashtag ?? true,
        location: configFeatures?.location ?? true,
        explore: configFeatures?.explore ?? true,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { error } = await supabase
        .from("ig_looter_config")
        .upsert({
          workspace_id: currentWorkspace.id,
          daily_action_limit: dailyLimit,
          rate_limit_seconds: rateLimit,
          enabled_features: features,
          rapidapi_key_configured: true,
        }, {
          onConflict: "workspace_id"
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ig-looter-config"] });
      toast.success("Configurações guardadas");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Instagram Looter
          </CardTitle>
          <CardDescription>
            Apenas administradores podem alterar estas configurações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Limit */}
          <div className="space-y-2">
            <Label htmlFor="daily-limit">Limite Diário de Ações</Label>
            <Input
              id="daily-limit"
              type="number"
              min={10}
              max={1000}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseInt(e.target.value) || 200)}
            />
            <p className="text-xs text-muted-foreground">
              Número máximo de ações por utilizador por dia.
            </p>
          </div>

          {/* Rate Limit */}
          <div className="space-y-2">
            <Label htmlFor="rate-limit">Intervalo entre Requests (segundos)</Label>
            <Input
              id="rate-limit"
              type="number"
              min={1}
              max={10}
              value={rateLimit}
              onChange={(e) => setRateLimit(parseInt(e.target.value) || 3)}
            />
            <p className="text-xs text-muted-foreground">
              Tempo mínimo entre requests (com jitter adicional de 0-3s).
            </p>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-4">
            <Label>Funcionalidades Ativas</Label>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Busca Global</p>
                <p className="text-sm text-muted-foreground">Pesquisa por utilizadores</p>
              </div>
              <Switch
                checked={features.global_search}
                onCheckedChange={(checked) => 
                  setFeatures(f => ({ ...f, global_search: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Pesquisa por Hashtag</p>
                <p className="text-sm text-muted-foreground">Encontrar posts por hashtag</p>
              </div>
              <Switch
                checked={features.hashtag}
                onCheckedChange={(checked) => 
                  setFeatures(f => ({ ...f, hashtag: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Pesquisa por Localização</p>
                <p className="text-sm text-muted-foreground">Encontrar locais e posts associados</p>
              </div>
              <Switch
                checked={features.location}
                onCheckedChange={(checked) => 
                  setFeatures(f => ({ ...f, location: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Explore Feed</p>
                <p className="text-sm text-muted-foreground">Exploração por categorias</p>
              </div>
              <Switch
                checked={features.explore}
                onCheckedChange={(checked) => 
                  setFeatures(f => ({ ...f, explore: checked }))
                }
              />
            </div>
          </div>

          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
