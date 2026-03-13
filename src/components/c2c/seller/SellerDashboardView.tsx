import { useC2CTransactions } from "@/hooks/useC2CTransactions";
import { useSellerReviews } from "@/hooks/useC2CReviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Wallet, Clock, TrendingUp } from "lucide-react";
import { ReviewsList } from "@/components/c2c/reviews/ReviewsList";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface SellerDashboardViewProps {
  sellerId: string;
  seller: any;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  escrow: "bg-blue-100 text-blue-800",
  released: "bg-emerald-100 text-emerald-800",
  refunded: "bg-red-100 text-red-800",
  disputed: "bg-destructive/10 text-destructive",
};

export function SellerDashboardView({ sellerId, seller }: SellerDashboardViewProps) {
  const { transactions, isLoading } = useC2CTransactions({ sellerId });

  const totalRevenue = transactions.reduce((sum: number, t: any) => t.status === "released" ? sum + t.amount_seller : sum, 0);
  const pendingEscrow = transactions.reduce((sum: number, t: any) => t.status === "escrow" ? sum + t.amount_seller : sum, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <ShoppingBag className="h-3.5 w-3.5" /> Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{seller?.total_sales || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{(totalRevenue / 100).toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" /> Disponível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{((seller?.balance_available || 0) / 100).toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Em Escrow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{(pendingEscrow / 100).toFixed(2)}€</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem transações</p>
          ) : (
            transactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {t.c2c_listings?.title || "Anúncio removido"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.buyer_email} • {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: pt })}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <Badge className={statusColors[t.status] || ""}>{t.status}</Badge>
                  <p className="font-bold text-sm text-foreground">{(t.amount_total / 100).toFixed(2)}€</p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <ReviewsList sellerId={sellerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
