import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Percent } from "lucide-react";
import { CheckoutBackHeader } from "@/components/checkout/admin/CheckoutBackHeader";

const sb = supabase as any;

export default function BundlesPage() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["checkout-bundles", wid],
    queryFn: async () => {
      const { data, error } = await sb.from("checkout_smart_bundles")
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!wid,
  });

  return (
    <div className="space-y-6 p-6">
      <CheckoutBackHeader title="Bundles Inteligentes" parent={{ label: "Funis de Checkout", to: "/dashboard/checkout" }} />
      <div>
        <h1 className="text-2xl font-bold">Bundles Inteligentes</h1>
        <p className="text-muted-foreground">Crie pacotes de produtos com descontos</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !bundles?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Package className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum bundle criado</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b: any) => (
            <Card key={b.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{b.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{b.bundle_price?.toFixed(2)}€</span>
                  <span className="text-sm text-muted-foreground line-through">{b.original_price?.toFixed(2)}€</span>
                </div>
                {b.savings_percentage > 0 && (
                  <Badge variant="secondary"><Percent className="mr-1 h-3 w-3" /> Poupa {b.savings_percentage}%</Badge>
                )}
                <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Ativo" : "Inativo"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
