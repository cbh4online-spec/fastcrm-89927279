import { ShoppingCart, Package, ExternalLink, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyOrderNotes } from "@/hooks/useCompanyOrderNotes";
import { orderNoteStatusConfig } from "@/types/order-note";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "react-router-dom";

interface CompanyOrderNotesSectionProps {
  companyId: string;
}

export function CompanyOrderNotesSection({ companyId }: CompanyOrderNotesSectionProps) {
  const { orders, stats, loading, error } = useCompanyOrderNotes(companyId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Encomendas B2B
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Encomendas B2B
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Erro ao carregar encomendas: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Encomendas B2B
          </CardTitle>
          <CardDescription>
            Encomendas de todos os clientes B2B desta empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              Sem encomendas B2B associadas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              As encomendas aparecerão aqui quando a empresa tiver clientes B2B com encomendas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Encomendas</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  {stats.totalValue.toLocaleString('pt-PT', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Encomendas Recentes
            <Badge variant="secondary" className="ml-auto">
              {orders.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Histórico de encomendas via Portal B2B
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orders.map((order) => {
            const statusConfig = order.status ? orderNoteStatusConfig[order.status] : null;
            
            return (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {order.order_number}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {order.created_at && format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: pt })}
                      </span>
                      {order.client_user && (
                        <>
                          <span>•</span>
                          <span>{order.client_user.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {order.installment_requested && (
                    <Badge variant="outline" className="text-xs">
                      {order.installment_count}x prestações
                    </Badge>
                  )}
                  
                  <span className="font-semibold text-sm">
                    {order.total_gross?.toLocaleString('pt-PT', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    })}
                  </span>
                  
                  {statusConfig && (
                    <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                      {statusConfig.labelPT}
                    </Badge>
                  )}
                  
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/dashboard/order-notes/${order.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
