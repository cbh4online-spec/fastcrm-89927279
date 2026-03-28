import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBotDetail, useBots } from "@/hooks/useBots";
import { BotSettingsPanel } from "@/components/ai-employees/BotSettingsPanel";
import { BotAnalyticsDashboard } from "@/components/ai-employees/BotAnalyticsDashboard";
import { BotConversationLogs } from "@/components/ai-employees/BotConversationLogs";
import { BotTestChat } from "@/components/ai-employees/BotTestChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Settings, BarChart3, Bot, MessageSquare, FlaskConical, MoreVertical, Copy, Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRef } from "react";

const STATUS_CONFIG = {
  active: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  draft: "text-muted-foreground border-border",
  paused: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};

export default function AIEmployeeDetailPage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { data: bot, isLoading } = useBotDetail(botId);
  const { createBot } = useBots();
  const importRef = useRef<HTMLInputElement>(null);

  const handleDuplicate = async () => {
    if (!bot) return;
    try {
      const newBot = await createBot.mutateAsync({
        name: `${bot.name} (cópia)`,
        description: bot.description || undefined,
        type: bot.type,
        channel: bot.channel || undefined,
        ai_profile_id: bot.ai_profile_id || undefined,
        knowledge_base_ids: bot.knowledge_base_ids || [],
        system_prompt: bot.system_prompt || undefined,
        guided_config: bot.guided_config || {},
        settings: bot.settings,
      });
      toast.success("Bot duplicado com sucesso!");
      navigate(`/dashboard/ai-employees/${newBot.id}`);
    } catch {
      toast.error("Erro ao duplicar bot");
    }
  };

  const handleExport = () => {
    if (!bot) return;
    const config = {
      name: bot.name,
      description: bot.description,
      type: bot.type,
      channel: bot.channel,
      ai_profile_id: bot.ai_profile_id,
      knowledge_base_ids: bot.knowledge_base_ids,
      system_prompt: bot.system_prompt,
      guided_config: bot.guided_config,
      settings: bot.settings,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bot-${bot.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuração exportada!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const config = JSON.parse(ev.target?.result as string);
        await createBot.mutateAsync({
          name: config.name || "Bot Importado",
          description: config.description,
          type: config.type || "prompt",
          channel: config.channel,
          ai_profile_id: config.ai_profile_id,
          knowledge_base_ids: config.knowledge_base_ids || [],
          system_prompt: config.system_prompt,
          guided_config: config.guided_config || {},
          settings: config.settings,
        });
        toast.success("Bot importado com sucesso!");
      } catch {
        toast.error("Ficheiro de configuração inválido");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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
          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar Bot
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExport}>
                <Download className="w-3.5 h-3.5 mr-2" /> Exportar JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => importRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-2" /> Importar JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
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
            <TabsTrigger value="logs" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Conversas
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-2">
              <FlaskConical className="h-4 w-4" /> Testar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6">
            <BotSettingsPanel bot={bot} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <BotAnalyticsDashboard bot={bot} />
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <BotConversationLogs bot={bot} />
          </TabsContent>

          <TabsContent value="test" className="mt-6">
            <BotTestChat bot={bot} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
