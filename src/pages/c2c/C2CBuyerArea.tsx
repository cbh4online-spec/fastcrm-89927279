import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMyBuyerProfile, useUpdateBuyerProfile } from "@/hooks/useC2CBuyers";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Euro, Star, Package, MapPin, Heart, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const supabase = _supabase as any;

export default function C2CBuyerArea() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: profile, isLoading: profileLoading } = useMyBuyerProfile();
  const updateProfile = useUpdateBuyerProfile();
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState({
    address: "",
    city: "",
    postalCode: "",
    country: "PT",
  });

  // Orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["c2c-buyer-orders", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data: { user } } = await _supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("c2c_orders")
        .select("*, c2c_listings(title, photos)")
        .eq("workspace_id", workspaceId)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Favorites count
  const { data: favCount = 0 } = useQuery({
    queryKey: ["c2c-buyer-favs-count", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data: { user } } = await _supabase.auth.getUser();
      if (!user) return 0;
      const { count, error } = await supabase
        .from("c2c_favorites")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id);
      if (error) return 0;
      return count || 0;
    },
  });

  const handleSaveAddress = () => {
    updateProfile.mutate({ shipping_address: address });
    setEditingAddress(false);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Ainda não tens perfil de comprador</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              O teu perfil de comprador será criado automaticamente quando fizeres a tua primeira compra no marketplace.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shippingAddr = profile.shipping_address as Record<string, string> || {};
  const statusMap: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    shipped: "Enviado",
    delivered: "Entregue",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Área do Comprador</h1>
        <p className="text-sm text-muted-foreground">Gere as tuas compras, favoritos e dados de envio.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile.total_purchases}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Euro className="h-4 w-4" /> Total gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(profile.total_spent).toFixed(2)}€</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> Pontos fidelidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile.loyalty_points}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Heart className="h-4 w-4" /> Favoritos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{favCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Orders */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Histórico de encomendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <p className="text-sm text-muted-foreground">A carregar...</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não tens encomendas.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order: any) => {
                    const photos = order.c2c_listings?.photos as string[] | null;
                    return (
                      <div key={order.id} className="border rounded-lg p-3 flex items-center gap-3">
                        {photos?.[0] && (
                          <img src={photos[0]} alt="" className="w-12 h-12 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{order.c2c_listings?.title || "Artigo"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "dd MMM yyyy", { locale: pt })}
                          </p>
                        </div>
                        <Badge variant="secondary">{statusMap[order.status] || order.status}</Badge>
                        <p className="font-semibold text-sm">{Number(order.total_price).toFixed(2)}€</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Shipping address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Morada de envio
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingAddress ? (
                <div className="space-y-3">
                  <div>
                    <Label>Morada</Label>
                    <Input value={address.address} onChange={(e) => setAddress((p) => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Cidade</Label>
                      <Input value={address.city} onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Código Postal</Label>
                      <Input value={address.postalCode} onChange={(e) => setAddress((p) => ({ ...p, postalCode: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveAddress} disabled={updateProfile.isPending}>Guardar</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingAddress(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div>
                  {shippingAddr.address ? (
                    <div className="text-sm space-y-1">
                      <p>{shippingAddr.address}</p>
                      <p>{shippingAddr.postalCode} {shippingAddr.city}</p>
                      <p>{shippingAddr.country || "PT"}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma morada definida</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setAddress({
                        address: shippingAddr.address || "",
                        city: shippingAddr.city || "",
                        postalCode: shippingAddr.postalCode || "",
                        country: shippingAddr.country || "PT",
                      });
                      setEditingAddress(true);
                    }}
                  >
                    {shippingAddr.address ? "Editar" : "Adicionar morada"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {profile.is_verified ? (
                  <Badge className="bg-green-100 text-green-800">Verificado</Badge>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Conta não verificada</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
