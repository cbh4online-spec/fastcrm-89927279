import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, MessageSquare, BarChart3, Zap } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { IntelligenceOverviewPanel } from "@/components/intelligence/IntelligenceOverviewPanel";
import { AssistTab } from "@/components/intelligence/AssistTab";
import { AnalyzeTab } from "@/components/intelligence/AnalyzeTab";
import { AutomateTab } from "@/components/intelligence/AutomateTab";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { getExtensionIntelligenceCapabilities } from "@/config/extensionRegistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function IntelligencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "overview";
  const { installedModuleIds } = useWorkspaceModules();

  const extensionCapabilities = useMemo(
    () => getExtensionIntelligenceCapabilities(installedModuleIds),
    [installedModuleIds]
  );

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
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
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

              {/* Extension intelligence tabs */}
              {extensionCapabilities.map((cap) => (
                <TabsTrigger key={cap.key} value={cap.key} className="gap-1.5">
                  <cap.icon className="h-4 w-4" />
                  {cap.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <IntelligenceOverviewPanel />
            </TabsContent>
            <TabsContent value="assist">
              <AssistTab />
            </TabsContent>
            <TabsContent value="analyze">
              <AnalyzeTab />
            </TabsContent>
            <TabsContent value="automate">
              <AutomateTab />
            </TabsContent>

            {/* Extension intelligence content */}
            {extensionCapabilities.map((cap) => (
              <TabsContent key={cap.key} value={cap.key}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <cap.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{cap.label}</CardTitle>
                        <CardDescription>{cap.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Esta capacidade de IA está ativa. Utilize as ferramentas abaixo para tirar partido deste módulo.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        // Navigate to the module's dedicated page if it exists
                        if (cap.key === "lead-enrichment") navigate("/dashboard/lead-enricher");
                        else if (cap.key === "pro-prospecting") navigate("/dashboard/prospecting/professionals");
                        else if (cap.key === "seo-analysis") navigate("/dashboard/seo");
                        else if (cap.key === "student-risk") navigate("/dashboard/student-journey");
                        else if (cap.key === "b2b-analytics") navigate("/dashboard/b2b-portal");
                      }}
                    >
                      Abrir módulo completo
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
