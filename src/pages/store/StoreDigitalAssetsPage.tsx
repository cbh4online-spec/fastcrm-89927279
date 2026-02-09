import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Key, BookOpen, Shield, FileDown, Loader2, Package } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

interface DeliveryItem {
  id: string;
  order_id: string;
  deliverable_id: string;
  status: string;
  delivery_data: Record<string, unknown> | null;
  delivered_at: string | null;
  created_at: string;
  error_message: string | null;
  product_deliverables?: {
    deliverable_type: string;
    name: string;
    config: Record<string, unknown>;
    product_id: string;
    products?: { name: string; images: string[] | null } | null;
  } | null;
  store_orders?: {
    order_number: string | null;
    status: string;
  } | null;
}

function useDigitalAssets() {
  return useQuery({
    queryKey: ["store-digital-assets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("order_deliveries")
        .select(`
          id, order_id, deliverable_id, status, delivery_data, delivered_at, created_at, error_message,
          product_deliverables:deliverable_id(deliverable_type, name, config, product_id, products:product_id(name, images)),
          store_orders:order_id(order_number, status)
        `)
        .eq("status", "delivered")
        .order("delivered_at", { ascending: false });

      if (error) throw error;

      // Filter only orders belonging to this user
      const { data: userOrders } = await supabase
        .from("store_orders")
        .select("id")
        .eq("user_id", user.id);

      const userOrderIds = new Set((userOrders || []).map(o => o.id));
      return ((data || []) as unknown as DeliveryItem[]).filter(d => userOrderIds.has(d.order_id));
    },
  });
}

const DELIVERABLE_ICONS: Record<string, typeof Download> = {
  file: FileDown,
  license_key: Key,
  course_enrollment: BookOpen,
  portal_access: Shield,
};

export default function StoreDigitalAssetsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const wsSlug = workspaceSlug || "";
  const { data: assets = [], isLoading } = useDigitalAssets();

  const handleDownload = async (asset: DeliveryItem) => {
    const deliveryData = asset.delivery_data;
    if (!deliveryData) return;

    const downloadUrl = deliveryData.download_url as string | undefined;
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    } else {
      toast.info("Download não disponível. Contacte o suporte.");
    }
  };

  const groupedByType = assets.reduce<Record<string, DeliveryItem[]>>((acc, asset) => {
    const type = (asset.product_deliverables as any)?.deliverable_type || "unknown";
    if (!acc[type]) acc[type] = [];
    acc[type].push(asset);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    file: "Ficheiros & Downloads",
    license_key: "Chaves de Licença",
    course_enrollment: "Cursos & Formação",
    portal_access: "Acessos ao Portal",
  };

  return (
    <>
      <Helmet><title>Os Meus Downloads | Loja</title></Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <StoreCartDrawer workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link to={`/store/${wsSlug}`}>
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-2xl font-bold">Os Meus Produtos Digitais</h1>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <Package className="h-16 w-16 mx-auto opacity-20" />
              <p>Ainda não tem produtos digitais</p>
              <Link to={`/store/${wsSlug}`}>
                <Button variant="outline">Explorar produtos</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedByType).map(([type, items]) => {
                const Icon = DELIVERABLE_ICONS[type] || Package;
                return (
                  <div key={type}>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {typeLabels[type] || type}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((asset) => {
                        const deliverable = asset.product_deliverables as any;
                        const productName = deliverable?.products?.name || deliverable?.name || "Produto";
                        const deliveryData = asset.delivery_data || {};

                        return (
                          <Card key={asset.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium">{productName}</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {asset.delivered_at && format(new Date(asset.delivered_at), "d MMM yyyy", { locale: pt })}
                                {asset.store_orders && (
                                  <> • Encomenda #{(asset.store_orders as any).order_number || asset.order_id.slice(0, 8)}</>
                                )}
                              </p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {type === "file" && (
                                <div className="space-y-2">
                                  {(deliveryData as any).file_name && (
                                    <p className="text-sm text-muted-foreground truncate">{(deliveryData as any).file_name}</p>
                                  )}
                                  <Button size="sm" className="w-full gap-2" onClick={() => handleDownload(asset)}>
                                    <Download className="h-4 w-4" /> Download
                                  </Button>
                                </div>
                              )}

                              {type === "license_key" && (
                                <div className="space-y-2">
                                  <div className="bg-muted rounded-lg p-3 text-center">
                                    <p className="font-mono text-sm font-bold tracking-wider">
                                      {(deliveryData as any).license_key || "—"}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                      navigator.clipboard.writeText((deliveryData as any).license_key || "");
                                      toast.success("Chave copiada!");
                                    }}
                                  >
                                    Copiar Chave
                                  </Button>
                                </div>
                              )}

                              {type === "course_enrollment" && (
                                <div className="space-y-2">
                                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                    Inscrito
                                  </Badge>
                                  <p className="text-sm text-muted-foreground">
                                    Acesso ao curso ativo. Verifique o portal do cliente para mais detalhes.
                                  </p>
                                </div>
                              )}

                              {type === "portal_access" && (
                                <div className="space-y-2">
                                  <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                                    Acesso Ativo
                                  </Badge>
                                  {(deliveryData as any).entitlements_activated && (
                                    <p className="text-xs text-muted-foreground">
                                      {((deliveryData as any).entitlements_activated as string[]).length} permissão(ões) ativada(s)
                                    </p>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
