import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleCard } from "@/components/marketplace/ModuleCard";
import { CategoryFilter } from "@/components/marketplace/CategoryFilter";
import { ModuleDetailSheet } from "@/components/marketplace/ModuleDetailSheet";
import { FeaturedModules } from "@/components/marketplace/FeaturedModules";
import { MarketplaceModule, ModuleCategory, SAMPLE_MODULES } from "@/types/marketplace";
import { Search, Store, Package, Sparkles } from "lucide-react";

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | "all">("all");
  const [selectedModule, setSelectedModule] = useState<MarketplaceModule | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "installed">("all");

  // Simulated installed modules (in real app, this would come from the backend)
  const installedModuleIds = ["whatsapp-business", "zapier-integration"];

  const filteredModules = useMemo(() => {
    let modules = SAMPLE_MODULES;

    // Filter by tab
    if (activeTab === "installed") {
      modules = modules.filter(m => installedModuleIds.includes(m.id));
    }

    // Filter by category
    if (selectedCategory !== "all") {
      modules = modules.filter(m => m.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      modules = modules.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.tagline.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
      );
    }

    return modules;
  }, [searchQuery, selectedCategory, activeTab]);

  const featuredModules = useMemo(() => {
    return SAMPLE_MODULES.filter(m => m.is_featured);
  }, []);

  const moduleCounts = useMemo(() => {
    const counts: Record<ModuleCategory | "all", number> = {
      all: SAMPLE_MODULES.length,
      prospecting: 0,
      real_estate: 0,
      customer_service: 0,
      sales: 0,
      marketing: 0,
      finance: 0,
      analytics: 0,
      communication: 0,
      automation: 0,
      ai: 0,
      integrations: 0,
    };

    SAMPLE_MODULES.forEach(m => {
      counts[m.category]++;
    });

    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 via-primary/3 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Marketplace de Módulos</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Expanda as capacidades do seu CRM com módulos de negócio. 
            Cada módulo resolve um problema específico, sem complexidade técnica.
          </p>

          {/* Search */}
          <div className="relative mt-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar módulos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "installed")} className="mb-6">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Descobrir
            </TabsTrigger>
            <TabsTrigger value="installed" className="gap-2">
              <Package className="w-4 h-4" />
              Instalados ({installedModuleIds.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "all" && (
          <>
            {/* Featured Modules */}
            {!searchQuery && selectedCategory === "all" && (
              <FeaturedModules 
                modules={featuredModules} 
                onViewDetails={setSelectedModule} 
              />
            )}

            {/* Category Filter */}
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              moduleCounts={moduleCounts}
            />
          </>
        )}

        {/* Modules Grid */}
        {filteredModules.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onViewDetails={setSelectedModule}
                isInstalled={installedModuleIds.includes(module.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum módulo encontrado</h3>
            <p className="text-muted-foreground">
              {activeTab === "installed" 
                ? "Ainda não instalaste nenhum módulo. Explora o marketplace!"
                : "Tenta ajustar os filtros ou a pesquisa."}
            </p>
            {activeTab === "installed" && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setActiveTab("all")}
              >
                Explorar módulos
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Module Detail Sheet */}
      <ModuleDetailSheet
        module={selectedModule}
        open={!!selectedModule}
        onClose={() => setSelectedModule(null)}
        isInstalled={selectedModule ? installedModuleIds.includes(selectedModule.id) : false}
      />
    </div>
  );
}
