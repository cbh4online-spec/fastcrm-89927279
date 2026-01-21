import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Sparkles,
  Map,
  Settings,
  BarChart3,
  Plus,
} from "lucide-react";
import { SEOEntitiesList } from "./SEOEntitiesList";
import { SEOAnalytics } from "./SEOAnalytics";
import { SEOSettings } from "./SEOSettings";
import { SEOContentGenerator, SitemapManager } from "@/modules/growth-seo";

export default function SEOAdminPage() {
  const [activeTab, setActiveTab] = useState("content");

  return (
    <ModuleGuard moduleSlug="seo-growth" moduleName="SEO & Growth">
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SEO & Growth</h1>
            <p className="text-muted-foreground">
              Gerir conteúdo SEO, sitemap e métricas de performance
            </p>
          </div>
          <Button onClick={() => setActiveTab("generator")}>
            <Plus className="h-4 w-4 mr-2" />
            Gerar Conteúdo
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="content" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Conteúdo</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="generator" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Gerador IA</span>
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Sitemap</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Definições</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <SEOEntitiesList />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <SEOAnalytics />
          </TabsContent>

          <TabsContent value="generator" className="space-y-4">
            <SEOContentGenerator />
          </TabsContent>

          <TabsContent value="sitemap" className="space-y-4">
            <SitemapManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SEOSettings />
          </TabsContent>
        </Tabs>
      </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
