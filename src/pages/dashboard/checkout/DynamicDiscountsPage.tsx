import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Tag } from "lucide-react";
import { CheckoutBackHeader } from "@/components/checkout/admin/CheckoutBackHeader";

const sb = supabase as any;

export default function DynamicDiscountsPage() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: discounts, isLoading } = useQuery({
    queryKey: ["checkout-dynamic-discounts", wid],
    queryFn: async () => {
      const { data, error } = await sb.from("checkout_dynamic_discounts")
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
      <CheckoutBackHeader title="Descontos Dinâmicos" parent={{ label: "Funis de Checkout", to: "/dashboard/checkout" }} />
      <div>
        <h1 className="text-2xl font-bold">Descontos Dinâmicos</h1>
        <p className="text-muted-foreground">Exit intent, timers e descontos automáticos</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !discounts?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Tag className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum desconto dinâmico configurado</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {discounts.map((d: any) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{d.name}</CardTitle>
                  <Badge variant="outline">{d.trigger_type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg font-bold text-primary">
                  {d.discount_type === "percentage" ? `${d.discount_value}%` : `${d.discount_value?.toFixed(2)}€`}
                </p>
                {d.message && <p className="text-sm text-muted-foreground">{d.message}</p>}
                <div className="flex items-center gap-2">
                  <Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? "Ativo" : "Inativo"}</Badge>
                  <span className="text-xs text-muted-foreground">{d.current_uses || 0} usos</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
