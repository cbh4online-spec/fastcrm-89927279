import { ArrowLeft, BarChart3, ShoppingCart, Zap, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVerticalTemplate } from "@/hooks/useVerticalTemplates";
import { VerticalTemplateBuilder } from "@/components/landing-pages/VerticalTemplateBuilder";
import { VerticalStatsTab } from "./vertical-tabs/VerticalStatsTab";
import { VerticalSalesTab } from "./vertical-tabs/VerticalSalesTab";
import { VerticalEventsTab } from "./vertical-tabs/VerticalEventsTab";
import { VerticalSettingsTab } from "./vertical-tabs/VerticalSettingsTab";
import { getVerticalBySlug } from "@/config/verticalConfigs";
import { useState } from "react";

interface Props {
  templateId?: string;
  slug?: string;
  onBack: () => void;
}

export function VerticalFunnelManager({ templateId, slug, onBack }: Props) {
  const { data: dbTemplate } = useVerticalTemplate(templateId ?? null);
  const [activeTab, setActiveTab] = useState("conteudo");

  // Resolve template info from DB or static config
  const staticConfig = slug ? getVerticalBySlug(slug) : undefined;
  const templateName = dbTemplate?.nome ?? staticConfig?.nome ?? "Template";
  const templateSlug = dbTemplate?.slug ?? slug ?? "";
  const resolvedId = templateId ?? null;

  if (!dbTemplate && !staticConfig) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        A carregar...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{templateName}</h1>
          <p className="text-sm text-muted-foreground">/{templateSlug}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="conteudo" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Stats
          </TabsTrigger>
          {resolvedId && (
            <>
              <TabsTrigger value="sales" className="gap-1.5">
                <ShoppingCart className="h-4 w-4" />
                Sales
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5">
                <Zap className="h-4 w-4" />
                Events
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="conteudo">
          {resolvedId ? (
            <VerticalTemplateBuilder
              templateId={resolvedId}
              onBack={onBack}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Este template é estático. Para editar o conteúdo, cria um template custom baseado neste.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats">
          <VerticalStatsTab templateSlug={templateSlug} />
        </TabsContent>

        {resolvedId && (
          <>
            <TabsContent value="sales">
              <VerticalSalesTab templateId={resolvedId} />
            </TabsContent>

            <TabsContent value="events">
              <VerticalEventsTab templateId={resolvedId} />
            </TabsContent>

            <TabsContent value="settings">
              <VerticalSettingsTab templateId={resolvedId} templateName={templateName} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
