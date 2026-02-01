/**
 * AI Assistants Module - Unified Management
 * Consolidates Agents, Personas, Knowledge Bases, and Autopilot
 */

import { useState, useMemo } from "react";
import { useAIChannelAgents } from "@/hooks/useAIChannelAgents";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bot, 
  Users, 
  BookOpen, 
  Settings, 
  Plus, 
  RefreshCw,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { AgentsTab } from "./AgentsTab";
import { PersonasTab } from "./PersonasTab";
import { KnowledgeBasesTab } from "./KnowledgeBasesTab";
import { GlobalSettingsTab } from "./GlobalSettingsTab";

type ActiveTab = "agents" | "personas" | "bases" | "settings";

const pageTabs = [
  { id: "agents", label: "Agentes", icon: <Bot className="h-4 w-4" /> },
  { id: "personas", label: "Personas", icon: <Users className="h-4 w-4" /> },
  { id: "bases", label: "Bases", icon: <BookOpen className="h-4 w-4" /> },
  { id: "settings", label: "Definições", icon: <Settings className="h-4 w-4" /> },
];

export function AIAssistantsModule() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("agents");
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { agents, isLoading: isLoadingAgents, refresh: refreshAgents } = useAIChannelAgents();
  const { personas, knowledgeBases, isLoading: isLoadingKB, refresh: refreshKB } = useKnowledgeBase();

  // Stats
  const stats = useMemo(() => ({
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.isActive).length,
    autopilotAgents: agents.filter(a => a.settings?.autopilotEnabled).length,
    totalPersonas: personas.length,
    totalBases: knowledgeBases.length
  }), [agents, personas, knowledgeBases]);

  // Tabs with counts
  const tabsWithCounts = useMemo(() => {
    return pageTabs.map(tab => ({
      ...tab,
      count: tab.id === "agents" 
        ? agents.length 
        : tab.id === "personas" 
          ? personas.length 
          : tab.id === "bases"
            ? knowledgeBases.length
            : undefined
    }));
  }, [agents.length, personas.length, knowledgeBases.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshAgents(), refreshKB()]);
    setIsRefreshing(false);
    toast.success("Dados atualizados");
  };

  const isLoading = isLoadingAgents || isLoadingKB;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Assistentes IA"
        count={agents.length}
        description="Configure bots inteligentes para cada canal de comunicação"
        tabs={tabsWithCounts}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Agentes</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalAgents}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-green-500/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ativos</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">{stats.activeAgents}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-500/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Auto-Pilot</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600">{stats.autopilotAgents}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-purple-500/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Personas</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalPersonas}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-500/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bases</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalBases}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={searchValue}
        searchPlaceholder={
          activeTab === "agents" 
            ? "Pesquisar agentes..." 
            : activeTab === "personas" 
              ? "Pesquisar personas..." 
              : activeTab === "bases"
                ? "Pesquisar bases..."
                : "Pesquisar..."
        }
        onSearchChange={setSearchValue}
        showFilters={false}
        rightActions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      {/* Tab Content */}
      {activeTab === "agents" && (
        <AgentsTab searchValue={searchValue} />
      )}
      {activeTab === "personas" && (
        <PersonasTab searchValue={searchValue} />
      )}
      {activeTab === "bases" && (
        <KnowledgeBasesTab searchValue={searchValue} />
      )}
      {activeTab === "settings" && (
        <GlobalSettingsTab />
      )}
    </div>
  );
}
