import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, Target, Calendar, Trophy, Sparkles, Users, Settings, BarChart3 } from "lucide-react";
import { useVisionProfile } from "@/hooks/useVision";
import { VisionCorePanel } from "./VisionCorePanel";
import { ManifestoEditor } from "./ManifestoEditor";
import { VisionBoardCanvas } from "./VisionBoardCanvas";
import { VisionSprintTimeline } from "./VisionSprintTimeline";
import { VisionDailyWizard } from "./VisionDailyWizard";
import { VisionMetricsPanel } from "./VisionMetricsPanel";
import { VisionWinsFeed } from "./VisionWinsFeed";
import { VisionDuoCard } from "./VisionDuoCard";
import { VisionAICopilot } from "./VisionAICopilot";
import { VisionSettingsPanel } from "./VisionSettingsPanel";
import { VisionOnboarding } from "./VisionOnboarding";
import { VisionDuoPartnerView } from "./VisionDuoPartnerView";

export function VisionDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: vision, isLoading } = useVisionProfile();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">A carregar...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!vision) {
    return (
      <DashboardLayout>
        <VisionOnboarding />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Método Vision</h1>
              <p className="text-sm text-muted-foreground">Defina a sua visão, execute e celebre</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 border border-border/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="overview" className="gap-2 text-xs"><Target className="h-3.5 w-3.5" />Visão Geral</TabsTrigger>
            <TabsTrigger value="manifesto" className="gap-2 text-xs"><Eye className="h-3.5 w-3.5" />Manifesto</TabsTrigger>
            <TabsTrigger value="board" className="gap-2 text-xs"><BarChart3 className="h-3.5 w-3.5" />Vision Board</TabsTrigger>
            <TabsTrigger value="sprints" className="gap-2 text-xs"><Calendar className="h-3.5 w-3.5" />Sprints</TabsTrigger>
            <TabsTrigger value="daily" className="gap-2 text-xs"><Sparkles className="h-3.5 w-3.5" />Briefing Diário</TabsTrigger>
            <TabsTrigger value="wins" className="gap-2 text-xs"><Trophy className="h-3.5 w-3.5" />Vitórias</TabsTrigger>
            <TabsTrigger value="duo" className="gap-2 text-xs"><Users className="h-3.5 w-3.5" />Duo</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2 text-xs"><Sparkles className="h-3.5 w-3.5" />IA Copilot</TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2 text-xs"><BarChart3 className="h-3.5 w-3.5" />Métricas</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 text-xs"><Settings className="h-3.5 w-3.5" />Definições</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><VisionCorePanel vision={vision} /></TabsContent>
          <TabsContent value="manifesto"><ManifestoEditor vision={vision} /></TabsContent>
          <TabsContent value="board"><VisionBoardCanvas visionId={vision.id} /></TabsContent>
          <TabsContent value="sprints"><VisionSprintTimeline visionId={vision.id} /></TabsContent>
          <TabsContent value="daily"><VisionDailyWizard visionId={vision.id} /></TabsContent>
          <TabsContent value="wins"><VisionWinsFeed visionId={vision.id} /></TabsContent>
          <TabsContent value="duo"><VisionDuoCard visionId={vision.id} /></TabsContent>
          <TabsContent value="ai"><VisionAICopilot visionId={vision.id} /></TabsContent>
          <TabsContent value="metrics"><VisionMetricsPanel visionId={vision.id} /></TabsContent>
          <TabsContent value="settings"><VisionSettingsPanel vision={vision} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
