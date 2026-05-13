import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChefHat, Wallet, Trophy, Users, TrendingUp, Loader2 } from "lucide-react";
import { useAmbassadorProfile, useAmbassadorReferrals, useAmbassadorPayouts } from "@/hooks/leadchef/useAmbassadorProfile";
import { LeadChefShareCard } from "@/components/leadchef/LeadChefShareCard";
import { AMBASSADOR_TIERS, calcAmbassadorTier, nextAmbassadorTier, formatPercent, AMBASSADOR_MIN_PAYOUT } from "@/config/leadchef/ambassadorTiers";
import { formatEuro } from "@/config/leadchef/pricing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function LeadChefAmbassadorDashboardPage() {
  const { data: amb, isLoading } = useAmbassadorProfile();
  const { data: referrals = [] } = useAmbassadorReferrals(amb?.id);
  const { data: payouts = [] } = useAmbassadorPayouts(amb?.id);
  const qc = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [requesting, setRequesting] = useState(false);

  const referralLink = useMemo(() => {
    if (!amb?.slug) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "https://fastcrm.lovable.app";
    return `${base}/leadchef?ref=${amb.slug}`;
  }, [amb?.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!amb) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Ainda não és embaixador</CardTitle>
            <CardDescription>Regista o teu perfil para começar a ganhar comissões.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/embaixador/registo"><Button className="w-full">Criar perfil de embaixador</Button></Link>
            <Link to="/embaixador-programa"><Button variant="outline" className="w-full">Ver programa</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tier = calcAmbassadorTier(Number(amb.monthly_revenue_generated || 0));
  const next = nextAmbassadorTier(tier.slug);
  const progressToNext = next
    ? Math.min(100, (Number(amb.monthly_revenue_generated || 0) / next.minMonthlyRevenue) * 100)
    : 100;

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado!");
  };

  const requestPayout = async () => {
    const amt = Number(payoutAmount);
    if (!amt || amt < AMBASSADOR_MIN_PAYOUT) {
      toast.error(`Mínimo ${AMBASSADOR_MIN_PAYOUT}€`);
      return;
    }
    if (amt > Number(amb.available_balance)) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (!amb.iban) {
      toast.error("Adiciona o IBAN no teu perfil antes de pedir levantamento.");
      return;
    }
    setRequesting(true);
    try {
      const { error } = await supabase.rpc("leadchef_request_ambassador_payout" as any, { _amount: amt });
      if (error) throw error;
      toast.success("Pedido de levantamento criado!");
      setPayoutAmount("");
      qc.invalidateQueries({ queryKey: ["ambassador-profile"] });
      qc.invalidateQueries({ queryKey: ["ambassador-payouts", amb.id] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao pedir levantamento");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Painel Embaixador — LeadChef</title></Helmet>

      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ChefHat className="h-5 w-5 text-primary" /> LeadChef · Embaixador
          </Link>
          <Badge variant="secondary" className="capitalize gap-1"><Trophy className="h-3 w-3" /> {tier.name}</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Wallet className="h-3 w-3" /> Saldo disponível</div>
            <div className="text-2xl font-bold">{formatEuro(Number(amb.available_balance))}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3 w-3" /> Receita mensal gerada</div>
            <div className="text-2xl font-bold">{formatEuro(Number(amb.monthly_revenue_generated))}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="h-3 w-3" /> Referidos ativos</div>
            <div className="text-2xl font-bold">{amb.active_referrals_count}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">Total ganho · pago</div>
            <div className="text-lg font-semibold">{formatEuro(Number(amb.total_earned))} <span className="text-muted-foreground text-sm">· {formatEuro(Number(amb.total_paid))}</span></div>
          </CardContent></Card>
        </div>

        {/* Link de partilha */}
        <LeadChefShareCard
          url={referralLink}
          title="O teu link de embaixador"
          description={`Comissão atual: ${formatPercent(tier.commissionRate)} recorrente vitalícia.`}
          message={`Conhece o LeadChef — o CRM que gera mais vendas para Consultoras Bimby. Usa o meu link:`}
        />

        {/* Tier progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso de nível</CardTitle>
            <CardDescription>
              {next
                ? `Faltam ${formatEuro(Math.max(0, next.minMonthlyRevenue - Number(amb.monthly_revenue_generated)))} de receita mensal para ${next.name} (${formatPercent(next.commissionRate)}).`
                : `Estás no nível máximo — comissão ${formatPercent(tier.commissionRate)}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressToNext} />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{tier.name} · {formatPercent(tier.commissionRate)}</span>
              {next && <span>{next.name} · {formatPercent(next.commissionRate)}</span>}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="referrals">
          <TabsList>
            <TabsTrigger value="referrals">Referidos</TabsTrigger>
            <TabsTrigger value="payouts">Levantamentos</TabsTrigger>
            <TabsTrigger value="tiers">Níveis</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals">
            <Card>
              <CardContent className="pt-6">
                {referrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Ainda não tens referidos. Partilha o teu link para começar.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome / Email</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Mensalidade</TableHead>
                        <TableHead>Desde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-medium">{r.referred_name ?? r.referred_email ?? "—"}</div>
                            {r.referred_name && r.referred_email && (
                              <div className="text-xs text-muted-foreground">{r.referred_email}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === "active" ? "default" : r.status === "cancelled" ? "destructive" : "secondary"}>
                              {r.status === "active" ? "Ativo" : r.status === "cancelled" ? "Cancelado" : "Lead"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatEuro(Number(r.monthly_amount || 0))}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString("pt-PT")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pedir levantamento</CardTitle>
                  <CardDescription>Mínimo {formatEuro(AMBASSADOR_MIN_PAYOUT)}. Saldo: {formatEuro(Number(amb.available_balance))}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Valor (€)</Label>
                    <Input type="number" min={AMBASSADOR_MIN_PAYOUT} step="0.01" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label>IBAN</Label>
                    <Input readOnly value={amb.iban ?? "— por configurar —"} />
                  </div>
                  <Button onClick={requestPayout} disabled={requesting || !amb.iban} className="w-full">
                    {requesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Pedir levantamento
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
                <CardContent>
                  {payouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sem pedidos.</p>
                  ) : (
                    <div className="space-y-2">
                      {payouts.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center border-b border-border/40 py-2 text-sm">
                          <div>
                            <div className="font-medium">{formatEuro(Number(p.amount))}</div>
                            <div className="text-xs text-muted-foreground">{new Date(p.requested_at).toLocaleDateString("pt-PT")}</div>
                          </div>
                          <Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                            {p.status === "paid" ? "Pago" : p.status === "rejected" ? "Recusado" : "Pendente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tiers">
            <Card>
              <CardContent className="pt-6 grid md:grid-cols-5 gap-3">
                {AMBASSADOR_TIERS.map((t) => (
                  <div key={t.slug} className={`rounded-lg border p-4 ${t.slug === tier.slug ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="text-xs uppercase text-muted-foreground">{t.name}</div>
                    <div className="text-2xl font-bold text-primary">{formatPercent(t.commissionRate)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t.maxMonthlyRevenue ? `${formatEuro(t.minMonthlyRevenue)}–${formatEuro(t.maxMonthlyRevenue)}` : `${formatEuro(t.minMonthlyRevenue)}+`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
