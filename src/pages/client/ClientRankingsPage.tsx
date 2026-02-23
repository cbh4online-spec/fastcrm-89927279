import { useState } from "react";
import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useProductRankings, RankingPeriod } from "@/hooks/client-portal/useProductRankings";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, Minus, ShoppingCart, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

const periodLabels: Record<string, string> = {
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
  "180": "Últimos 180 dias",
};

export default function ClientRankingsPage() {
  const { clientUser } = useClientAuth();
  const [periodDays, setPeriodDays] = useState<RankingPeriod>(30);
  const { data: rankings = [], isLoading } = useProductRankings(clientUser?.id, clientUser?.workspace_id, periodDays);
  const { addItem } = useCart();

  const handleReorder = (ranking: typeof rankings[0]) => {
    addItem({
      product_id: ranking.product_id,
      product_name: ranking.product_name,
      product_sku: null,
      product_image_url: ranking.images?.[0] || null,
      quantity: 1,
      unit_price_net: ranking.total_value / ranking.total_qty, // avg price
      vat_rate: 23,
    });
    toast.success(`${ranking.product_name} adicionado ao carrinho`);
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Produtos Mais Comprados
            </h1>
            <p className="text-muted-foreground mt-1">Os seus produtos mais encomendados</p>
          </div>
          <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v) as RankingPeriod)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rankings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem dados de compras para o período selecionado.</p>
              <Link to="/client/catalog">
                <Button className="mt-4">Ir ao Catálogo</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rankings.map((ranking, index) => (
              <Card key={ranking.product_id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Rank */}
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className={`font-bold ${index < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Image */}
                  {ranking.images?.[0] ? (
                    <img
                      src={ranking.images[0]}
                      alt={ranking.product_name}
                      className="w-12 h-12 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ranking.product_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {ranking.total_qty} un.
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {ranking.total_value.toFixed(2)}€
                      </span>
                      <TrendIcon trend={ranking.trend} />
                      {index === 0 && <Badge className="text-xs">Mais Comprado</Badge>}
                      {ranking.trend === "up" && <Badge variant="outline" className="text-xs text-green-600">Tendência</Badge>}
                    </div>
                  </div>

                  {/* Re-order */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => handleReorder(ranking)}
                  >
                    <ShoppingCart className="h-4 w-4" /> Re-encomendar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
