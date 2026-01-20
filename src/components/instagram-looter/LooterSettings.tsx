import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Settings, Save, Loader2, BarChart3, Users, TrendingUp, 
  Activity, Calendar, Database, Trash2, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";

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

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
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

  // Fetch usage stats (last 7 days)
  const { data: usageStats } = useQuery({
    queryKey: ["ig-looter-usage-stats", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const sevenDaysAgo = startOfDay(subDays(new Date(), 7)).toISOString();

      const { data, error } = await supabase
        .from("ig_looter_usage")
        .select("user_id, actions_count, usage_date")
        .eq("workspace_id", currentWorkspace.id)
        .gte("usage_date", sevenDaysAgo.split("T")[0]);

      if (error) throw error;

      // Aggregate stats
      const totalActions = data?.reduce((acc, u) => acc + (u.actions_count || 0), 0) || 0;
      const uniqueUsers = new Set(data?.map(u => u.user_id)).size;
      const avgPerUser = uniqueUsers > 0 ? Math.round(totalActions / uniqueUsers) : 0;
      const byDate = data?.reduce((acc, u) => {
        acc[u.usage_date] = (acc[u.usage_date] || 0) + (u.actions_count || 0);
        return acc;
      }, {} as Record<string, number>) || {};

      return { totalActions, uniqueUsers, avgPerUser, byDate, raw: data };
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch database counts
  const { data: dbCounts } = useQuery({
    queryKey: ["ig-looter-db-counts", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const [profiles, collections, generatedLeads, searches] = await Promise.all([
        supabase.from("ig_profiles").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        supabase.from("ig_collections").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        supabase.from("ig_generated_leads").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        supabase.from("ig_searches").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
      ]);

      return {
        profiles: profiles.count || 0,
        collections: collections.count || 0,
        generatedLeads: generatedLeads.count || 0,
        searches: searches.count || 0,
      };
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

  // Clear old data mutation
  const clearOldDataMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Delete old searches
      await supabase
        .from("ig_searches")
        .delete()
        .eq("workspace_id", currentWorkspace.id)
        .lt("searched_at", thirtyDaysAgo);

      // Delete old usage records
      await supabase
        .from("ig_looter_usage")
        .delete()
        .eq("workspace_id", currentWorkspace.id)
        .lt("usage_date", thirtyDaysAgo.split("T")[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ig-looter"] });
      toast.success("Dados antigos limpos");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  if (configLoading) {
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
      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usageStats?.totalActions || 0}</p>
                <p className="text-xs text-muted-foreground">Ações (7 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usageStats?.uniqueUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Utilizadores Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usageStats?.avgPerUser || 0}</p>
                <p className="text-xs text-muted-foreground">Média por User</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-full">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dbCounts?.profiles || 0}</p>
                <p className="text-xs text-muted-foreground">Perfis Guardados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dados Armazenados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold">{dbCounts?.profiles || 0}</p>
              <p className="text-sm text-muted-foreground">Perfis</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold">{dbCounts?.collections || 0}</p>
              <p className="text-sm text-muted-foreground">Coleções</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold">{dbCounts?.generatedLeads || 0}</p>
              <p className="text-sm text-muted-foreground">Leads Gerados</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold">{dbCounts?.searches || 0}</p>
              <p className="text-sm text-muted-foreground">Pesquisas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações
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

          <Separator />

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

      {/* Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manutenção
          </CardTitle>
          <CardDescription>
            Operações de limpeza e manutenção da base de dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Dados Antigos (+30 dias)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar Dados Antigos</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá remover pesquisas e registos de uso com mais de 30 dias.
                  Os perfis guardados e coleções NÃO serão afetados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => clearOldDataMutation.mutate()}
                  disabled={clearOldDataMutation.isPending}
                >
                  {clearOldDataMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Limpar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-xs text-muted-foreground text-center">
            Última atualização: {format(new Date(), "d MMM yyyy HH:mm", { locale: pt })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
