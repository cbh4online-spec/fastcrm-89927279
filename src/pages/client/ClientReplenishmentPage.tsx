import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useReplenishmentSuggestions, SuggestedItem } from "@/hooks/client-portal/useReplenishmentSuggestions";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, ShoppingCart, X, Loader2, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

export default function ClientReplenishmentPage() {
  const { activeSuggestions, historySuggestions, isLoading, dismiss, markConverted } = useReplenishmentSuggestions();
  const { addItem } = useCart();

  const handleConvertToCart = async (suggestion: { id: string; suggested_items: SuggestedItem[] }) => {
    suggestion.suggested_items.forEach((item) => {
      addItem({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: null,
        product_image_url: null,
        quantity: item.suggested_qty,
        unit_price_net: item.unit_price_net,
        vat_rate: 23,
      });
    });
    await markConverted(suggestion.id);
    toast.success("Produtos adicionados ao carrinho!");
  };

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
            <RefreshCw className="h-6 w-6" /> Sugestões de Reposição
          </h1>
          <p className="text-muted-foreground">Reposições recomendadas para manutenção dos seus protocolos</p>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              Ativas {activeSuggestions.length > 0 && <Badge variant="secondary" className="ml-2">{activeSuggestions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {activeSuggestions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sem sugestões de reposição de momento.</p>
                </CardContent>
              </Card>
            ) : (
              activeSuggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{suggestion.reason || "Reposição sugerida"}</CardTitle>
                        <CardDescription>
                          {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true, locale: pt })}
                          {suggestion.confidence_score && (
                            <span className="ml-2">• Confiança: {Math.round(suggestion.confidence_score * 100)}%</span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant={suggestion.status === "new" ? "default" : "secondary"}>
                        {suggestion.status === "new" ? "Nova" : "Enviada"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {suggestion.suggested_items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <p className="font-medium text-sm">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{item.suggested_qty} un.</p>
                          <p className="text-xs text-muted-foreground">{item.unit_price_net?.toFixed(2)}€/un</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 gap-2" onClick={() => handleConvertToCart(suggestion)}>
                        <ShoppingCart className="h-4 w-4" /> Repor Agora
                      </Button>
                      <Button variant="outline" onClick={() => dismiss(suggestion.id)}>
                        <X className="h-4 w-4 mr-1" /> Dispensar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            {historySuggestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem histórico</p>
            ) : (
              historySuggestions.map((s) => (
                <Card key={s.id} className="opacity-75">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{s.reason || "Reposição"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: pt })}
                      </p>
                    </div>
                    <Badge variant={s.status === "converted" ? "default" : "outline"}>
                      {s.status === "converted" ? "Convertida" : "Dispensada"}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
