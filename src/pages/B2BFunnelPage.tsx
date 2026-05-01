import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, ArrowRight, TrendingUp, MailCheck } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePartnerFunnel, useAbandonedPartnerCarts } from "@/hooks/b2b/useB2BPromotions";

const STAGE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  none: "secondary",
  first: "outline",
  second: "outline",
  third: "outline",
  recovered: "default",
  expired: "destructive",
};

const STAGE_LABELS: Record<string, string> = {
  none: "Ativo",
  first: "1.º email enviado",
  second: "2.º email enviado",
  third: "3.º email enviado",
  recovered: "Recuperado",
  expired: "Expirado",
};

export default function B2BFunnelPage() {
  const [days, setDays] = useState(30);
  const funnel = usePartnerFunnel(days);
  const carts = useAbandonedPartnerCarts();

  const counts = funnel.data || {};
  const viewCart = counts.view_cart || 0;
  const startCheckout = counts.start_checkout || 0;
  const complete = counts.complete_order || 0;
  const recovered = counts.cart_recovered || 0;
  const emailsSent = counts.recovery_email_sent || 0;
  const checkoutRate = viewCart > 0 ? ((startCheckout / viewCart) * 100).toFixed(1) : "0";
  const conversionRate = startCheckout > 0 ? ((complete / startCheckout) * 100).toFixed(1) : "0";

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Funil & Recuperação B2B</h1>
            <p className="text-muted-foreground">
              Acompanhe a jornada do parceiro e recupere encomendas abandonadas.
            </p>
          </div>
          <Tabs value={String(days)} onValueChange={(v) => setDays(+v)}>
            <TabsList>
              <TabsTrigger value="7">7d</TabsTrigger>
              <TabsTrigger value="30">30d</TabsTrigger>
              <TabsTrigger value="90">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {/* Funnel KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Vistas catálogo" value={counts.view_catalog || 0}/>
          <KpiCard label="Add to cart" value={counts.add_to_cart || 0}/>
          <KpiCard label="Vistas carrinho" value={viewCart}/>
          <KpiCard label="Checkout iniciado" value={startCheckout}/>
          <KpiCard label="Encomendas" value={complete} highlight/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Taxa carrinho → checkout</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{checkoutRate}%</p>
              <p className="text-xs text-muted-foreground">{startCheckout} de {viewCart}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Taxa checkout → encomenda</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground">{complete} de {startCheckout}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MailCheck className="h-4 w-4"/>Recuperação</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{recovered}</p>
              <p className="text-xs text-muted-foreground">{emailsSent} emails enviados</p>
            </CardContent>
          </Card>
        </div>

        {/* Abandoned carts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5"/>Carrinhos abandonados</CardTitle>
            <CardDescription>Carrinhos com pelo menos uma fase de recuperação iniciada.</CardDescription>
          </CardHeader>
          <CardContent>
            {carts.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin"/></div>
            ) : !carts.data?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem carrinhos abandonados.</p>
            ) : (
              <div className="divide-y">
                {carts.data.map((c: any) => {
                  const items = Array.isArray(c.items) ? c.items : [];
                  const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
                  return (
                    <div key={c.id} className="flex items-center justify-between py-3">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {c.partner_accounts?.business_name || "Parceiro"}
                          {c.partner_accounts?.contact_email && (
                            <span className="text-muted-foreground font-normal text-sm ml-2">
                              · {c.partner_accounts.contact_email}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {items.length} produtos · {totalQty} un. · {(c.subtotal_net || 0).toFixed(2)}€
                          {" · "}
                          última atividade {new Date(c.last_activity_at).toLocaleString("pt-PT")}
                        </p>
                      </div>
                      <Badge variant={STAGE_COLORS[c.recovery_stage] || "secondary"}>
                        {STAGE_LABELS[c.recovery_stage] || c.recovery_stage}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary" : ""}>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
