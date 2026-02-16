import { useState } from "react";
import { ArrowLeft, Share2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFunnel } from "@/hooks/useFunnels";
import { FunnelStepsTab } from "./tabs/FunnelStepsTab";
import { FunnelStatsTab } from "./tabs/FunnelStatsTab";
import { FunnelSalesTab } from "./tabs/FunnelSalesTab";
import { FunnelEventsTab } from "./tabs/FunnelEventsTab";
import { FunnelSettingsTab } from "./tabs/FunnelSettingsTab";

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
          <Button variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="steps">
          <FunnelStepsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="stats">
          <FunnelStatsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="sales">
          <FunnelSalesTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="events">
          <FunnelEventsTab funnelId={funnelId} />
        </TabsContent>
        <TabsContent value="settings">
          <FunnelSettingsTab funnelId={funnelId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
