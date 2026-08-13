import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FlaskConical } from "lucide-react";
import { CheckoutBackHeader } from "@/components/checkout/admin/CheckoutBackHeader";

const sb = supabase as any;

export default function ABTestsPage() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: tests, isLoading } = useQuery({
    queryKey: ["checkout-ab-tests", wid],
    queryFn: async () => {
      const { data, error } = await sb.from("checkout_ab_tests")
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
      <CheckoutBackHeader title="A/B Tests" parent={{ label: "Funis de Checkout", to: "/dashboard/checkout" }} />
      <div>
        <h1 className="text-2xl font-bold">A/B Tests</h1>
        <p className="text-muted-foreground">Otimize as suas taxas de conversão</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !tests?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <FlaskConical className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum teste A/B criado</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {tests.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <div className="mt-2 flex gap-4 text-xs">
                    <span>A: {t.variant_a_sessions || 0} sessões, {t.variant_a_conversions || 0} conv.</span>
                    <span>B: {t.variant_b_sessions || 0} sessões, {t.variant_b_conversions || 0} conv.</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.status === "running" ? "default" : "secondary"}>{t.status}</Badge>
                  {t.winner && <Badge variant="outline">Vencedor: {t.winner}</Badge>}
                  {t.statistical_significance && (
                    <Badge variant="outline">{t.statistical_significance}% sig.</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
