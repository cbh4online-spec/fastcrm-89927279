import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FunnelsList } from "@/components/funnels/FunnelsList";
import { LandingPagesList } from "@/components/landing-pages/LandingPagesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { Workflow, Globe } from "lucide-react";

const VALID_TABS = ["funnels", "landing-pages"] as const;

export default function ConversionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(rawTab as any) ? rawTab! : "funnels";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Funis & Landing Pages
          </h1>
          <p className="text-muted-foreground">
            Gira os teus funis de conversão e landing pages num só lugar.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="funnels" className="gap-2">
              <Workflow className="h-4 w-4" />
              Funis
            </TabsTrigger>
            <TabsTrigger value="landing-pages" className="gap-2">
              <Globe className="h-4 w-4" />
              Landing Pages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funnels" className="mt-6">
            <FunnelsList />
          </TabsContent>

          <TabsContent value="landing-pages" className="mt-6">
            <LandingPagesList />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
