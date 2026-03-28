import { useState } from "react";
import { ArrowLeft, Share2, HelpCircle, Eye, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFunnel } from "@/hooks/useFunnels";
import { FunnelStepsTab } from "./tabs/FunnelStepsTab";
import { FunnelStatsTab } from "./tabs/FunnelStatsTab";
import { FunnelSalesTab } from "./tabs/FunnelSalesTab";
import { FunnelEventsTab } from "./tabs/FunnelEventsTab";
import { FunnelSettingsTab } from "./tabs/FunnelSettingsTab";
import { FunnelProductsTab } from "./tabs/FunnelProductsTab";
import { FunnelAIInsightsTab } from "./tabs/FunnelAIInsightsTab";
import { FunnelRoutingTab } from "./tabs/FunnelRoutingTab";
import { FunnelAutomationsTab } from "./tabs/FunnelAutomationsTab";
import { FunnelAnalyticsTab } from "./tabs/FunnelAnalyticsTab";
import { FunnelRevenueTab } from "./tabs/FunnelRevenueTab";
import { FunnelEbooksTab } from "./tabs/FunnelEbooksTab";

interface FunnelBuilderProps {
  funnelId: string;
  onBack: () => void;
}

export function FunnelBuilder({ funnelId, onBack }: FunnelBuilderProps) {
  const { data: funnel } = useFunnel(funnelId);
  const [activeTab, setActiveTab] = useState("steps");

  if (!funnel) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-primary hover:underline flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </button>
          <h1 className="text-2xl font-bold">{funnel.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/funnel/${funnel.slug}?preview=true`, "_blank")}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const url = `${window.location.origin}/funnel/${funnel.slug}`;
              navigator.clipboard.writeText(url);
              toast.success("Link copiado!", { description: url });
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="flex w-max min-w-full">
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="routing">Routing</TabsTrigger>
            <TabsTrigger value="automations">Automações</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="revenue">Receita</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="ebooks">eBooks</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="ai-insights">AI</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="steps">
          <FunnelStepsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="routing">
          <FunnelRoutingTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="automations">
          <FunnelAutomationsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="analytics">
          <FunnelAnalyticsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="revenue">
          <FunnelRevenueTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="events">
          <FunnelEventsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="stats">
          <FunnelStatsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="sales">
          <FunnelSalesTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="products">
          <FunnelProductsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="ebooks">
          <FunnelEbooksTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="settings">
          <FunnelSettingsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="ai-insights">
          <FunnelAIInsightsTab funnelId={funnelId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
