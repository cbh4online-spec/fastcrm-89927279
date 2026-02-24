import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, BarChart3, Zap } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AssistTab } from "@/components/intelligence/AssistTab";
import { AnalyzeTab } from "@/components/intelligence/AnalyzeTab";
import { AutomateTab } from "@/components/intelligence/AutomateTab";

export default function IntelligencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "assist";

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered insights, assistance, and automation.
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setSearchParams({ tab: v })}
          >
            <TabsList>
              <TabsTrigger value="assist" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Assist
              </TabsTrigger>
              <TabsTrigger value="analyze" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Analyze
              </TabsTrigger>
              <TabsTrigger value="automate" className="gap-1.5">
                <Zap className="h-4 w-4" />
                Automate
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assist">
              <AssistTab />
            </TabsContent>
            <TabsContent value="analyze">
              <AnalyzeTab />
            </TabsContent>
            <TabsContent value="automate">
              <AutomateTab />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
