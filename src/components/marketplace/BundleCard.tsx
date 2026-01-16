import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Zap, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceBundle } from "@/hooks/useMarketplaceBundles";

interface BundleCardProps {
  bundle: MarketplaceBundle;
  modules?: Array<{ id: string; name: string; icon: string }>;
  isOwned?: boolean;
  onPurchase?: () => void;
  isLoading?: boolean;
}

export function BundleCard({
  bundle,
  modules = [],
  isOwned = false,
  onPurchase,
  isLoading = false,
}: BundleCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-lg",
      isOwned && "border-primary/50 bg-primary/5"
    )}>
      {bundle.discount_percent > 0 && (
        <Badge 
          className="absolute top-3 right-3 bg-green-500 hover:bg-green-600"
        >
          -{bundle.discount_percent}%
        </Badge>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{bundle.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{bundle.tagline}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {bundle.description}
        </p>
        
        {/* Included modules */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Inclui
          </p>
          <div className="space-y-1">
            {modules.map((module) => (
              <div 
                key={module.id}
                className="flex items-center gap-2 text-sm"
              >
                <Check className="w-4 h-4 text-green-500" />
                <span>{module.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Pricing */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            €{bundle.bundle_price}
          </span>
          <span className="text-sm text-muted-foreground">/mês</span>
          {bundle.original_price !== bundle.bundle_price && (
            <span className="text-sm text-muted-foreground line-through">
              €{bundle.original_price}
            </span>
          )}
        </div>
        
        {/* Target audience */}
        {bundle.target_audience && (
          <p className="text-xs text-muted-foreground">
            Ideal para: {bundle.target_audience}
          </p>
        )}
        
        {/* Action button */}
        {isOwned ? (
          <Button variant="outline" className="w-full" disabled>
            <Check className="w-4 h-4 mr-2" />
            Já tens este bundle
          </Button>
        ) : (
          <Button 
            className="w-full" 
            onClick={onPurchase}
            disabled={isLoading}
          >
            <Zap className="w-4 h-4 mr-2" />
            Ativar Bundle
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
