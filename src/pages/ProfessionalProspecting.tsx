import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, History } from "lucide-react";
import { ProspectingSearch, SearchPrefill } from "@/components/professional-prospecting/ProspectingSearch";
import { ProspectingResults } from "@/components/professional-prospecting/ProspectingResults";
import { ProspectingHistory } from "@/components/professional-prospecting/ProspectingHistory";
import { ProspectingUsage } from "@/components/professional-prospecting/ProspectingUsage";
import { useLeadEnricherSettings } from "@/hooks/useLeadEnricherSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProfessionalProspecting() {
  const [activeTab, setActiveTab] = useState("search");
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [searchPrefill, setSearchPrefill] = useState<SearchPrefill | null>(null);
  const { settings, updateSettings } = useLeadEnricherSettings();
  const defaultTone = (settings.default_prospecting_tone || "casual") as "formal" | "casual" | "direto";

  const handleRepeatSearch = (params: SearchPrefill) => {
    setSearchPrefill(params);
    setActiveTab("search");
  };

  return (
    <ModuleGuard moduleSlug="prospecting-pro" moduleName="Prospecção Profissional">
      <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prospecção Profissional</h1>
            <p className="text-muted-foreground mt-1">
              Descubra profissionais individuais por profissão e localização
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Tom por defeito:</span>
              <Select
                value={defaultTone}
                onValueChange={(value) => updateSettings.mutate({ default_prospecting_tone: value })}
              >
                <SelectTrigger className="w-[130px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">👔 Formal</SelectItem>
                  <SelectItem value="casual">😊 Casual</SelectItem>
                  <SelectItem value="direto">🎯 Direto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ProspectingUsage />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              Pesquisar
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <Users className="w-4 h-4" />
              Resultados
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <ProspectingSearch 
              onSearchComplete={(searchId) => {
                setCurrentSearchId(searchId);
                setActiveTab("results");
                setSearchPrefill(null);
              }}
              prefill={searchPrefill}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <ProspectingResults 
              searchId={currentSearchId} 
              onGoToSearch={() => setActiveTab("search")}
              defaultTone={defaultTone}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <ProspectingHistory 
              onSelectSearch={(searchId) => {
                setCurrentSearchId(searchId);
                setActiveTab("results");
              }}
              onRepeatSearch={handleRepeatSearch}
            />
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <div className="bg-muted/50 border rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">⚠️ Informação importante</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Todos os dados são públicos e inferidos por IA</li>
            <li>As informações podem conter imprecisões</li>
            <li>O contacto é sempre da responsabilidade do utilizador</li>
            <li>Este módulo não extrai emails nem automatiza contactos</li>
          </ul>
        </div>
      </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
