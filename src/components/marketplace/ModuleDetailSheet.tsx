import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketplaceModule, CATEGORY_INFO } from "@/types/marketplace";
import { Star, Users, Check, Shield, Sparkles, Clock, Building2, ExternalLink, Play } from "lucide-react";
import { getIconByName } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ModuleDetailSheetProps {
  module: MarketplaceModule | null;
  open: boolean;
  onClose: () => void;
  isInstalled?: boolean;
}

export function ModuleDetailSheet({ module, open, onClose, isInstalled = false }: ModuleDetailSheetProps) {
  if (!module) return null;

  const category = CATEGORY_INFO[module.category];
  const IconComponent = getIconByName(module.icon);
  const CategoryIcon = getIconByName(category.icon);

  const formatPrice = () => {
    if (module.pricing.type === "free") return "Grátis";
    if (module.pricing.base_price === 0) return "Grátis";
    return `${module.pricing.base_price}€`;
  };

  const handleInstall = () => {
    toast.success(`Módulo "${module.name}" instalado com sucesso!`);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-start gap-4">
            <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0", "bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20")}>
              <IconComponent className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-xl">{module.name}</SheetTitle>
                {module.is_featured && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />Destaque
                  </Badge>
                )}
              </div>
              <SheetDescription className="mt-1">{module.tagline}</SheetDescription>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><Building2 className="w-4 h-4" /><span>{module.publisher}</span></div>
                {module.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-foreground">{module.rating}</span>
                  </div>
                )}
                <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{module.installs_count}</span></div>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 p-4 rounded-xl bg-muted/50 border">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold">{formatPrice()}</span>
            {module.pricing.type !== "free" && <span className="text-muted-foreground">/mês</span>}
          </div>
          {module.pricing.trial_days && !isInstalled && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 mb-3">
              <Clock className="w-4 h-4" /><span>{module.pricing.trial_days} dias de teste grátis</span>
            </div>
          )}
          {isInstalled ? (
            <Button className="w-full" variant="outline"><ExternalLink className="w-4 h-4 mr-2" />Abrir</Button>
          ) : (
            <Button className="w-full" size="lg" onClick={handleInstall}>
              <Play className="w-4 h-4 mr-2" />{module.pricing.trial_days ? "Começar teste grátis" : "Instalar agora"}
            </Button>
          )}
        </div>

        <Separator className="my-6" />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="features">Funcionalidades</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            <div><h4 className="font-medium mb-2">Descrição</h4><p className="text-sm text-muted-foreground">{module.description}</p></div>
            <div><h4 className="font-medium mb-2">Para quem</h4><p className="text-sm text-muted-foreground">{module.target_audience}</p></div>
            <div>
              <h4 className="font-medium mb-2">Resultados esperados</h4>
              <div className="space-y-2">
                {module.expected_results.map((result, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{result}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="features" className="mt-4 space-y-6">
            <div>
              <h4 className="font-medium mb-3">Casos de uso</h4>
              <div className="grid gap-2">
                {module.use_cases.map((useCase, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">{idx + 1}</span>
                    </div>
                    <span className="text-sm">{useCase}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Categoria</h4>
              <Badge variant="outline" className="gap-2">
                <CategoryIcon className={cn("w-4 h-4", category.color)} />
                {category.name}
              </Badge>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4 space-y-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Acesso a dados</h4>
              <div className="space-y-2">
                {module.permissions.data_permissions.map((perm, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                    <span className="text-sm font-medium capitalize">{perm.entity}</span>
                    <div className="flex gap-2">
                      {perm.read && <Badge variant="outline" className="text-xs">Ler</Badge>}
                      {perm.write && <Badge variant="outline" className="text-xs">Escrever</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Isolamento de dados</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Este módulo só tem acesso aos dados do seu workspace.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
