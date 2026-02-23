import { useState } from "react";
import { useFeatureRegistry } from "@/hooks/useFeatureRegistry";
import { MODULE_CATEGORIES, type FeatureModule, type ModuleCategory } from "@/types/featureRegistry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Package, Brain, Zap, FileText, Database, Search,
  Sparkles, Code, Globe, Layers, Check, Clock, FlaskConical,
  BookOpen,
} from "lucide-react";

const planLabels: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  agency: "Agency",
};

const planColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  basic: "bg-blue-500/10 text-blue-600",
  pro: "bg-purple-500/10 text-purple-600",
  agency: "bg-amber-500/10 text-amber-600",
};

const statusIcons: Record<string, React.ReactNode> = {
  active: <Check className="h-3 w-3" />,
  beta: <FlaskConical className="h-3 w-3" />,
  planned: <Clock className="h-3 w-3" />,
};

export function FeatureRegistrySection() {
  const {
    modules,
    stats,
    categoryStats,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
  } = useFeatureRegistry();

  const [selectedModule, setSelectedModule] = useState<FeatureModule | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Feature Registry
        </h1>
        <p className="text-muted-foreground">
          Catálogo completo de todas as funcionalidades do FastCRM
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Módulos", value: stats.totalModules, icon: Package },
          { label: "Features", value: stats.totalFeatures, icon: Layers },
          { label: "Features IA", value: stats.aiFeatures, icon: Brain },
          { label: "Edge Functions", value: stats.edgeFunctions, icon: Zap },
          { label: "Páginas", value: stats.pages, icon: Globe },
          { label: "Tabelas", value: stats.tables, icon: Database },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar módulos, features, edge functions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            Todos ({stats.totalModules})
          </Button>
          {categoryStats.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id as ModuleCategory)}
              className="whitespace-nowrap"
            >
              {cat.label} ({cat.moduleCount})
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const catMeta = MODULE_CATEGORIES.find((c) => c.id === mod.category);
          const aiCount = mod.features.filter((f) => f.aiPowered).length;

          return (
            <Card
              key={mod.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedModule(mod)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{mod.name}</CardTitle>
                  <div className="flex gap-1.5">
                    {aiCount > 0 && (
                      <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 text-xs gap-1">
                        <Sparkles className="h-3 w-3" /> {aiCount}
                      </Badge>
                    )}
                    <Badge className={cn("text-xs", planColors[mod.minPlan])}>
                      {planLabels[mod.minPlan]}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{mod.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="outline" className={cn("text-xs text-white", catMeta?.color)}>
                    {mod.category}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" /> {mod.features.length}
                  </span>
                  {mod.edgeFunctions.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {mod.edgeFunctions.length}
                    </span>
                  )}
                  {mod.pages.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {mod.pages.length}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {modules.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum módulo encontrado com os filtros actuais.
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
        {selectedModule && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl">{selectedModule.name}</DialogTitle>
                <Badge className={cn("text-xs", planColors[selectedModule.minPlan])}>
                  {planLabels[selectedModule.minPlan]}
                </Badge>
                {selectedModule.features.some((f) => f.aiPowered) && (
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 gap-1">
                    <Sparkles className="h-3 w-3" /> AI-Powered
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{selectedModule.description}</p>
            </DialogHeader>

            <Tabs defaultValue="features" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full">
                <TabsTrigger value="features" className="flex-1">Features</TabsTrigger>
                <TabsTrigger value="technical" className="flex-1">Técnico</TabsTrigger>
                <TabsTrigger value="deps" className="flex-1">Dependências</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="features" className="m-0 space-y-2">
                  {selectedModule.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="mt-0.5">
                        {statusIcons[feat.status]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{feat.name}</span>
                          {feat.aiPowered && (
                            <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 text-xs gap-1">
                              <Sparkles className="h-3 w-3" /> IA
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{feat.description}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="technical" className="m-0 space-y-4">
                  {selectedModule.pages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Páginas ({selectedModule.pages.length})
                      </h4>
                      <div className="space-y-1">
                        {selectedModule.pages.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded border text-sm">
                            <span>{p.name}</span>
                            <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.route}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedModule.hooks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Code className="h-4 w-4" /> Hooks ({selectedModule.hooks.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedModule.hooks.map((h, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-mono">{h}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedModule.edgeFunctions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Edge Functions ({selectedModule.edgeFunctions.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedModule.edgeFunctions.map((ef, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-mono">{ef}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedModule.tables.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Database className="h-4 w-4" /> Tabelas ({selectedModule.tables.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedModule.tables.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-mono">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="deps" className="m-0">
                  {selectedModule.dependencies.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium mb-2">Depende de:</h4>
                      {selectedModule.dependencies.map((depId) => {
                        const dep = modules.find((m) => m.id === depId) ||
                          { name: depId, description: "", category: "" };
                        return (
                          <div key={depId} className="p-3 rounded-lg border bg-card">
                            <span className="font-medium text-sm">{(dep as any).name || depId}</span>
                            {(dep as any).description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{(dep as any).description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Este módulo não tem dependências.
                    </div>
                  )}

                  {/* Reverse dependencies */}
                  {(() => {
                    const reverseDeps = modules.filter((m) =>
                      m.dependencies.includes(selectedModule.id)
                    );
                    if (reverseDeps.length === 0) return null;
                    return (
                      <div className="mt-6 space-y-2">
                        <h4 className="text-sm font-medium mb-2">Dependem deste módulo:</h4>
                        {reverseDeps.map((dep) => (
                          <div key={dep.id} className="p-3 rounded-lg border bg-card">
                            <span className="font-medium text-sm">{dep.name}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">{dep.description}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
