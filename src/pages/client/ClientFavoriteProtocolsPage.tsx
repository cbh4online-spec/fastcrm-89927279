import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useFavoriteProtocols } from "@/hooks/client-portal/useFavoriteProtocols";
import { useProtocolKits } from "@/hooks/client-portal/useProtocolKits";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, Loader2, Heart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function ClientFavoriteProtocolsPage() {
  const { favorites, isLoading, toggleFavorite } = useFavoriteProtocols();
  const { addItem } = useCart();

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" /> Protocolos Favoritos
          </h1>
          <p className="text-muted-foreground">Acesso rápido e recompra em 1 clique</p>
        </div>

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ainda não tem protocolos favoritos.</p>
              <Link to="/client/diagnosis">
                <Button className="mt-4">Explorar Diagnósticos</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => (
              <Card key={fav.id} className="hover:shadow-md transition-shadow">
                {fav.protocol?.image_url && (
                  <div className="h-40 overflow-hidden rounded-t-lg">
                    <img src={fav.protocol.image_url} alt={fav.protocol?.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{fav.protocol?.name || "Protocolo"}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-yellow-500"
                      onClick={() => toggleFavorite({ protocolId: fav.protocol_id })}
                    >
                      <Star className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                  {fav.protocol?.short_description && (
                    <CardDescription className="line-clamp-2">{fav.protocol.short_description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{fav.default_kit_level}</Badge>
                    {fav.protocol?.discount_percentage > 0 && (
                      <Badge variant="default">-{fav.protocol.discount_percentage}%</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/client/protocol/${fav.protocol_id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2" size="sm">
                        Ver Kit <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
