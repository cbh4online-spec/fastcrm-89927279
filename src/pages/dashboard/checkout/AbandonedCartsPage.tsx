import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CheckoutBackHeader } from "@/components/checkout/admin/CheckoutBackHeader";

const sb = supabase as any;

export default function AbandonedCartsPage() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: carts, isLoading } = useQuery({
    queryKey: ["checkout-abandoned", wid],
    queryFn: async () => {
      const { data, error } = await sb.from("checkout_abandoned_carts")
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!wid,
  });

  const statusColors: Record<string, string> = {
    pending: "secondary",
    email_1_sent: "outline",
    email_2_sent: "outline",
    email_3_sent: "outline",
    recovered: "default",
    expired: "destructive",
  };

  return (
    <div className="space-y-6 p-6">
      <CheckoutBackHeader title="Carrinhos Abandonados" parent={{ label: "Funis de Checkout", to: "/dashboard/checkout" }} />
      <div>
        <h1 className="text-2xl font-bold">Carrinhos Abandonados</h1>
        <p className="text-muted-foreground">Recupere vendas perdidas com emails automáticos</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !carts?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum carrinho abandonado</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {carts.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <p className="font-medium">{c.customer_email || "Visitante anónimo"}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{new Date(c.created_at).toLocaleDateString("pt-PT")}</span>
                    <span>•</span>
                    <span>{(c.total_value || 0).toFixed(2)}€</span>
                    {c.step_abandoned && <><span>•</span><span>Saiu em: {c.step_abandoned}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={(statusColors[c.recovery_status] || "secondary") as any}>
                    {c.recovery_status}
                  </Badge>
                  {c.recovered_at && <Badge variant="default">Recuperado!</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
