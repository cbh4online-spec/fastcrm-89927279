import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import {
  useLoyaltyBalance,
  useLoyaltyHistory,
  usePublicLoyaltySettings,
  useRedeemPoints,
} from "@/hooks/useStoreLoyalty";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, Gift, ArrowLeft, Loader2, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function StoreLoyaltyPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const wsSlug = workspaceSlug || "";

  const { data: storeSettings } = usePublicStoreSettings(wsSlug);
  const { data: settings } = usePublicLoyaltySettings(wsSlug);
  const { data: balance = 0 } = useLoyaltyBalance(wsSlug);
  const { data: history = [] } = useLoyaltyHistory(wsSlug);
  const redeemMutation = useRedeemPoints();

  const [redeemAmount, setRedeemAmount] = useState("");

  const handleRedeem = () => {
    const pts = parseInt(redeemAmount);
    if (!pts || pts <= 0) return;
    redeemMutation.mutate({ workspaceId: wsSlug, pointsToRedeem: pts });
    setRedeemAmount("");
  };

  const minRedeem = settings?.min_redeem_points || 100;
  const canRedeem = balance >= minRedeem;
  const valuePerPoint = (settings?.points_value_cents || 1) / 100;

  const typeConfig = {
    earned: { icon: TrendingUp, label: "Ganhos", color: "text-green-600" },
    redeemed: { icon: Gift, label: "Resgate", color: "text-primary" },
    expired: { icon: Clock, label: "Expirado", color: "text-muted-foreground" },
    adjusted: { icon: TrendingDown, label: "Ajuste", color: "text-yellow-600" },
  };

  return (
    <>
      <Helmet>
        <title>Pontos de Fidelidade | {storeSettings?.store_name || "Loja"}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} storeName={storeSettings?.store_name} logoUrl={storeSettings?.logo_url || undefined} />
        <StoreCartDrawer workspaceSlug={wsSlug} />

        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Back */}
            <Link to={`/store/${wsSlug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-4 w-4" /> Voltar à loja
            </Link>

            <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              Pontos de Fidelidade
            </h1>

            {!settings?.is_active ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>O programa de fidelidade não está ativo nesta loja.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Balance Card */}
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">O seu saldo</p>
                        <p className="text-4xl font-bold text-foreground">{balance}</p>
                        <p className="text-sm text-muted-foreground">pontos</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Equivale a</p>
                        <p className="text-2xl font-bold text-primary">
                          {(balance * valuePerPoint).toFixed(2)}€
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Redeem */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Gift className="h-5 w-5 text-primary" />
                      Resgatar Pontos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Troque os seus pontos por um cupão de desconto. Mínimo: <strong>{minRedeem} pontos</strong> ({(minRedeem * valuePerPoint).toFixed(2)}€).
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Pontos a resgatar</Label>
                        <Input
                          type="number"
                          min={minRedeem}
                          max={balance}
                          value={redeemAmount}
                          onChange={(e) => setRedeemAmount(e.target.value)}
                          placeholder={`Min. ${minRedeem}`}
                          disabled={!canRedeem}
                        />
                      </div>
                      <Button
                        onClick={handleRedeem}
                        disabled={!canRedeem || redeemMutation.isPending || !redeemAmount}
                        className="self-end gap-1"
                      >
                        {redeemMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Resgatar
                      </Button>
                    </div>
                    {redeemAmount && parseInt(redeemAmount) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Receberá um cupão de <strong>{(parseInt(redeemAmount) * valuePerPoint).toFixed(2)}€</strong>
                      </p>
                    )}
                    {!canRedeem && balance > 0 && (
                      <p className="text-xs text-yellow-600">
                        Precisa de mais {minRedeem - balance} pontos para poder resgatar.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Histórico de Movimentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Ainda sem movimentos. Faça compras para acumular pontos!
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Pontos</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((tx) => {
                            const cfg = typeConfig[tx.type] || typeConfig.adjusted;
                            const Icon = cfg.icon;
                            return (
                              <TableRow key={tx.id}>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(tx.created_at), "dd MMM yyyy", { locale: pt })}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Icon className={`h-3 w-3 ${cfg.color}`} />
                                    {cfg.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate">
                                  {tx.description}
                                </TableCell>
                                <TableCell className={`text-right font-semibold ${tx.points > 0 ? "text-green-600" : "text-red-500"}`}>
                                  {tx.points > 0 ? "+" : ""}{tx.points}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {tx.balance_after}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </div>

        <StoreFooter workspaceSlug={wsSlug} storeName={storeSettings?.store_name || "Loja"} footerText={storeSettings?.footer_text} />
      </div>
    </>
  );
}
