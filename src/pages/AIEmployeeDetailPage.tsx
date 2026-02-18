import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBotDetail } from "@/hooks/useBots";
import { BotSettingsPanel } from "@/components/ai-employees/BotSettingsPanel";
import { BotAnalyticsDashboard } from "@/components/ai-employees/BotAnalyticsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Settings, BarChart3, Bot, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  active: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  draft: "text-muted-foreground border-border",
  paused: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};

export default function AIEmployeeDetailPage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { data: bot, isLoading } = useBotDetail(botId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!bot) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center py-24">
          <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Bot não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/ai-employees")}>
            Voltar à lista
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/ai-employees")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{bot.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[bot.status]}`}>
                    {bot.status === "active" ? "Ativo" : bot.status === "paused" ? "Pausado" : "Rascunho"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{bot.type}</Badge>
                  {bot.channel && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{bot.channel}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="settings">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" /> Configuração
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6">
            <BotSettingsPanel bot={bot} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <BotAnalyticsDashboard bot={bot} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
