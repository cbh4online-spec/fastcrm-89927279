import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { usePartnerAccount } from "@/hooks/partner/usePartnerAccount";
import { usePartnerDashboard } from "@/hooks/partner/usePartnerDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, Package, FileText, AlertCircle, ShoppingCart, CreditCard } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { Link } from "react-router-dom";
import { partnerOrderStatusConfig } from "@/types/partner";

export default function PartnerDashboardPage() {
  const { partnerUser } = usePartnerAuth();
  const { account, creditAvailable, creditUsagePercent } = usePartnerAccount(partnerUser?.partner_account_id);
  const { stats, isLoading } = usePartnerDashboard(partnerUser?.partner_account_id, partnerUser?.workspace_id);

  return (
    <PartnerLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {partnerUser?.full_name} — {account?.trade_name || account?.legal_name}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/partner/catalog">
              <Button><ShoppingCart className="h-4 w-4 mr-2" />Nova Encomenda</Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Volume Mensal</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatMoneyEur(stats?.monthRevenue || 0)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Volume Trimestral</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatMoneyEur(stats?.quarterRevenue || 0)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Encomendas Abertas</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats?.openOrders || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Aprovações Pendentes</CardTitle>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats?.pendingApprovals || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Credit + Tier */}
            {account && account.credit_limit > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Crédito Disponível
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilizado: {formatMoneyEur(account.current_credit_exposure)}</span>
                    <span className="font-medium">Limite: {formatMoneyEur(account.credit_limit)}</span>
                  </div>
                  <Progress value={creditUsagePercent} className="h-2" />
                  <p className="text-sm font-medium text-green-600">Disponível: {formatMoneyEur(creditAvailable)}</p>
                </CardContent>
              </Card>
            )}

            {/* Recent orders */}
            {stats?.recentOrders && stats.recentOrders.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Encomendas Recentes</CardTitle>
                  <Link to="/partner/orders"><Button variant="ghost" size="sm">Ver Todas</Button></Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recentOrders.map((order: any) => {
                      const config = partnerOrderStatusConfig[order.status as keyof typeof partnerOrderStatusConfig];
                      return (
                        <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div>
                            <p className="text-sm font-medium">{formatMoneyEur(order.total_net)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('pt-PT')}</p>
                          </div>
                          <Badge variant="outline" className={config?.color}>{config?.label || order.status}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PartnerLayout>
  );
}
