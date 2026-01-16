import { MarketplaceModule } from "@/types/marketplace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { getIconByName } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface FeaturedModulesProps {
  modules: MarketplaceModule[];
  onViewDetails: (module: MarketplaceModule) => void;
}

export function FeaturedModules({ modules, onViewDetails }: FeaturedModulesProps) {
  if (modules.length === 0) return null;

  const mainFeatured = modules[0];
  const otherFeatured = modules.slice(1, 3);
  const MainIcon = getIconByName(mainFeatured.icon);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-semibold">Módulos em Destaque</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6">
          <div className="absolute top-4 right-4">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
              <Sparkles className="w-3 h-3 mr-1" />
              Destaque
            </Badge>
          </div>

          <div className="flex flex-col h-full">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
                <MainIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{mainFeatured.name}</h3>
                <p className="text-muted-foreground">{mainFeatured.tagline}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 flex-1">{mainFeatured.description}</p>

            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {mainFeatured.pricing.type === "free" ? "Grátis" : `${mainFeatured.pricing.base_price}€/mês`}
              </span>
              <Button onClick={() => onViewDetails(mainFeatured)} className="group">
                Ver detalhes
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {otherFeatured.map((module) => {
            const Icon = getIconByName(module.icon);
            return (
              <div key={module.id} className="flex-1 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails(module)}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{module.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{module.tagline}</p>
                    {module.rating && (
                      <div className="flex items-center gap-0.5 text-xs mt-2">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{module.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
