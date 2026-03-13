import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowRight } from "lucide-react";

interface SmartBundleCardProps {
  bundle: {
    name: string;
    description?: string;
    bundle_price: number;
    original_price: number;
    savings_percentage: number;
    image_url?: string;
  };
  onAdd?: () => void;
  currency?: string;
}

export function SmartBundleCard({ bundle, onAdd, currency = "EUR" }: SmartBundleCardProps) {
  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {bundle.image_url ? (
            <img src={bundle.image_url} alt="" className="h-20 w-20 rounded-lg object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-8 w-8 text-primary" />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{bundle.name}</p>
                {bundle.description && <p className="text-xs text-muted-foreground">{bundle.description}</p>}
              </div>
              {bundle.savings_percentage > 0 && (
                <Badge variant="destructive">-{bundle.savings_percentage}%</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">{bundle.bundle_price.toFixed(2)} {currency}</span>
              <span className="text-sm text-muted-foreground line-through">{bundle.original_price.toFixed(2)} {currency}</span>
            </div>
            {onAdd && (
              <Button size="sm" onClick={onAdd} className="w-full">
                Comprar Bundle <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
