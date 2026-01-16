import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MarketplaceModule, CATEGORY_INFO } from "@/types/marketplace";
import { Star, Sparkles, Users, Check, ArrowRight } from "lucide-react";
import { getIconByName } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  module: MarketplaceModule;
  onViewDetails: (module: MarketplaceModule) => void;
  isInstalled?: boolean;
}

export function ModuleCard({ module, onViewDetails, isInstalled = false }: ModuleCardProps) {
  const category = CATEGORY_INFO[module.category];
  
  // Dynamically get icon component
  const IconComponent = getIconByName(module.icon);
  const CategoryIcon = getIconByName(category.icon);

  const formatPrice = () => {
    if (module.pricing.type === "free") return "Grátis";
    if (module.pricing.base_price === 0) return "Grátis";
    return `${module.pricing.base_price}€/mês`;
  };

  return (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
      {/* Featured/New badges */}
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        {module.is_featured && (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md">
            <Sparkles className="w-3 h-3 mr-1" />
            Destaque
          </Badge>
        )}
        {module.is_new && (
          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-md">
            Novo
          </Badge>
        )}
      </div>

      {/* Installed indicator */}
      {isInstalled && (
        <div className="absolute top-3 left-3 z-10">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            <Check className="w-3 h-3 mr-1" />
            Instalado
          </Badge>
        </div>
      )}

      <CardContent className="p-6 pt-8">
        {/* Icon and Category */}
        <div className="flex items-start gap-4 mb-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
          )}>
            <IconComponent className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground truncate">{module.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <CategoryIcon className={cn("w-3.5 h-3.5", category.color)} />
              <span className="text-xs text-muted-foreground">{category.name}</span>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {module.tagline}
        </p>

        {/* Expected Results Preview */}
        <div className="space-y-1.5 mb-4">
          {module.expected_results.slice(0, 2).map((result, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-muted-foreground truncate">{result}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {module.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{module.rating}</span>
              <span>({module.reviews_count})</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{module.installs_count.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-6 py-4 bg-muted/30 border-t border-border/50 flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-foreground">{formatPrice()}</span>
          {module.pricing.trial_days && (
            <span className="text-xs text-muted-foreground ml-2">
              {module.pricing.trial_days} dias grátis
            </span>
          )}
        </div>
        <Button 
          size="sm" 
          onClick={() => onViewDetails(module)}
          className="group/btn"
        >
          Ver mais
          <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
        </Button>
      </CardFooter>
    </Card>
  );
}
