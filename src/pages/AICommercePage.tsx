import { Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AICommerceOverview } from "@/components/ai-commerce/AICommerceOverview";
import { AICommerceReadinessList } from "@/components/ai-commerce/AICommerceReadinessList";
import { AICommerceCopilot } from "@/components/ai-commerce/AICommerceCopilot";
import { AICommerceFeeds } from "@/components/ai-commerce/AICommerceFeeds";
import { AICommerceChannels } from "@/components/ai-commerce/AICommerceChannels";
import { AICommerceAnalytics } from "@/components/ai-commerce/AICommerceAnalytics";
import { AICommerceLogs } from "@/components/ai-commerce/AICommerceLogs";
import { AICommerceReadinessSettings } from "@/components/ai-commerce/AICommerceReadinessSettings";
import { AICommerceQualityGate } from "@/components/ai-commerce/AICommerceQualityGate";

export default function AICommercePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" aria-hidden />
            AI Commerce
          </h1>
          <p className="text-muted-foreground">
            Prepara o catálogo do FastCRM para motores de IA, agentes de compra e canais externos.
          </p>
        </header>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="copilot">Copiloto</TabsTrigger>
            <TabsTrigger value="readiness">Produtos e readiness</TabsTrigger>
            <TabsTrigger value="gate">Gate de qualidade</TabsTrigger>
            <TabsTrigger value="feeds">Feeds</TabsTrigger>
            <TabsTrigger value="channels">Canais e API</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Critérios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <AICommerceOverview />
          </TabsContent>
          <TabsContent value="copilot" className="mt-4">
            <AICommerceCopilot />
          </TabsContent>
          <TabsContent value="readiness" className="mt-4">
            <AICommerceReadinessList />
          </TabsContent>
          <TabsContent value="gate" className="mt-4">
            <AICommerceQualityGate />
          </TabsContent>
          <TabsContent value="feeds" className="mt-4">
            <AICommerceFeeds />
          </TabsContent>
          <TabsContent value="channels" className="mt-4">
            <AICommerceChannels />
          </TabsContent>
          <TabsContent value="analytics" className="mt-4">
            <AICommerceAnalytics />
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <AICommerceLogs />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <AICommerceReadinessSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
