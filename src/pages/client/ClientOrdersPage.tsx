import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientOrders } from "@/hooks/client-portal/useClientOrders";
import { Button } from "@/components/ui/button";
import { OrderCard } from "@/components/client-portal/orders/OrderCard";
import { 
  FileText, 
  Package,
  Loader2
} from "lucide-react";

export default function ClientOrdersPage() {
  const { clientUser } = useClientAuth();
  const { orders, loading } = useClientOrders(clientUser?.id);

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Histórico de Encomendas</h1>
            <p className="text-muted-foreground">
              {orders.length} {orders.length === 1 ? "encomenda" : "encomendas"}
            </p>
          </div>
          <Link to="/client/catalog">
            <Button>
              <Package className="h-4 w-4 mr-2" />
              Nova Encomenda
            </Button>
          </Link>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-6">
              Ainda não tem encomendas registadas.
            </p>
            <Link to="/client/catalog">
              <Button>Fazer primeira encomenda</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
