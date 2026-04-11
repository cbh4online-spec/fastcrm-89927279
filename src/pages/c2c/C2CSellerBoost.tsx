import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMyC2CListings } from "@/hooks/useC2CListings";
import { useMySellerSubscription, useMyBoosts, useSubscribePremium } from "@/hooks/useC2CBoost";
import { useMySellerProfile } from "@/hooks/useC2CSellers";
import { useBoostWallet } from "@/hooks/useBoostWallet";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, Zap, Crown, Check, TrendingUp, Eye,
  ShieldCheck, Loader2, Rocket, Wallet, ShoppingCart, History,
  Plus, Minus, MousePointerClick,
} from "lucide-react";

const premiumFeatures = [
  { icon: Crown, text: "Badge Premium no perfil" },
  { icon: TrendingUp, text: "Comissão reduzida: 3% (vs 5%)" },
  { icon: Sparkles, text: "+5 anúncios extra" },
  { icon: ShieldCheck, text: "Suporte prioritário" },
  { icon: Eye, text: "Prioridade nos resultados" },
];

export default function C2CSellerBoost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: seller } = useMySellerProfile(workspaceId);
  const { data: listings = [] } = useMyC2CListings(workspaceId);
  const { data: subscription } = useMySellerSubscription(workspaceId);
  const { data: boosts = [] } = useMyBoosts(workspaceId);
  const subscribePremium = useSubscribePremium();

  const {
    balance, walletLoading, transactions, txLoading,
    unitPrice, highlightCostPerDay, cpcCostPerClick,
    buyCredits, spendCredits,
  } = useBoostWallet();

  const [buyAmount, setBuyAmount] = useState(20);
  const [boostDialog, setBoostDialog] = useState<string | null>(null);
  const [boostType, setBoostType] = useState<"highlight" | "cpc" | "both">("highlight");
  const [boostDays, setBoostDays] = useState(7);
  const [cpcBudget, setCpcBudget] = useState(10);

  // Check purchase success
  useEffect(() => {
    if (searchParams.get("purchase") === "success") {
      toast.success(`Créditos adicionados com sucesso!`);
    }
  }, [searchParams]);

  const activeListings = listings.filter((l) => l.status === "active");
  const activeBoosts = boosts.filter((b) => b.is_active && new Date(b.ends_at) > new Date());

  const calculateBoostCost = () => {
    let cost = 0;
    if (boostType === "highlight" || boostType === "both") {
      cost += highlightCostPerDay * boostDays;
    }
    if (boostType === "cpc" || boostType === "both") {
      cost += cpcBudget;
    }
    return cost;
  };

  if (!seller || seller.status !== "approved") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Crown className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <h2 className="text-xl font-semibold">Acesso restrito</h2>
          <p className="text-muted-foreground">Precisas ser um vendedor aprovado para aceder a esta página.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/c2c/my-listings")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/c2c/my-listings")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Meus Anúncios
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Impulsionar Vendas
          </h1>
          <p className="text-muted-foreground mt-1">Gere a tua carteira de créditos e destaca os teus anúncios</p>
        </div>

        {/* Wallet Section */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Carteira de Créditos
            </CardTitle>
            <CardDescription>Compra créditos para impulsionar os teus anúncios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-3xl font-bold text-primary">{walletLoading ? "…" : balance}</p>
                <p className="text-xs text-muted-foreground">Créditos disponíveis</p>
              </div>
              <div className="h-12 border-l border-border" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Destaque: {highlightCostPerDay} créditos/dia</p>
                <p className="flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5" /> CPC: {cpcCostPerClick} crédito/clique</p>
              </div>
            </div>

            <div className="flex items-end gap-3 pt-2">
              <div className="flex-1 max-w-[200px]">
                <Label className="text-xs text-muted-foreground">Quantidade</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => setBuyAmount(Math.max(1, buyAmount - 10))}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number" min={1} max={10000}
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
                    className="h-8 text-center"
                  />
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => setBuyAmount(Math.min(10000, buyAmount + 10))}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Button
                className="gap-2"
                onClick={() => buyCredits.mutate(buyAmount)}
                disabled={buyCredits.isPending}
              >
                {buyCredits.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Comprar — {(buyAmount * unitPrice).toFixed(2)}€
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Premium Section */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Vendedor Premium
                </CardTitle>
                <CardDescription className="mt-1">9,99€/mês · Cancela quando quiseres</CardDescription>
              </div>
              {subscription ? (
                <Badge className="bg-primary text-primary-foreground gap-1">
                  <Check className="h-3 w-3" /> Ativo
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {premiumFeatures.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            {!subscription ? (
              <Button
                variant="outline" className="w-full sm:w-auto gap-2"
                onClick={() => workspaceId && subscribePremium.mutate({ workspaceId })}
                disabled={subscribePremium.isPending}
              >
                {subscribePremium.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                Subscrever Premium
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ativo desde {new Date(subscription.starts_at).toLocaleDateString("pt-PT")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Boost Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Destacar Anúncios
          </h2>
          <p className="text-sm text-muted-foreground">
            Ativa destaque no topo, CPC (custo por clique) ou ambos.
          </p>

          {activeListings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Não tens anúncios ativos para destacar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeListings.map((listing) => {
                const hasActiveBoost = activeBoosts.some((b) => b.listing_id === listing.id);
                return (
                  <Card key={listing.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                        {listing.photos?.[0] ? (
                          <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{listing.title}</h3>
                        <p className="text-sm font-bold">{listing.price.toFixed(2)}€</p>
                      </div>
                      {hasActiveBoost ? (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" /> Destacado
                        </Badge>
                      ) : (
                        <Dialog open={boostDialog === listing.id} onOpenChange={(o) => setBoostDialog(o ? listing.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1 shrink-0">
                              <Zap className="h-3 w-3" /> Destacar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Impulsionar "{listing.title}"</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-5">
                              {/* Type */}
                              <div>
                                <Label className="text-sm">Tipo de impulso</Label>
                                <Select value={boostType} onValueChange={(v) => setBoostType(v as any)}>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="highlight">Destaque no topo</SelectItem>
                                    <SelectItem value="cpc">CPC (custo por clique)</SelectItem>
                                    <SelectItem value="both">Ambos</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Duration (highlight) */}
                              {(boostType === "highlight" || boostType === "both") && (
                                <div>
                                  <Label className="text-sm">Duração: {boostDays} dias</Label>
                                  <Slider
                                    min={1} max={30} step={1}
                                    value={[boostDays]}
                                    onValueChange={([v]) => setBoostDays(v)}
                                    className="mt-2"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Custo: {highlightCostPerDay * boostDays} créditos ({highlightCostPerDay}/dia)
                                  </p>
                                </div>
                              )}

                              {/* CPC budget */}
                              {(boostType === "cpc" || boostType === "both") && (
                                <div>
                                  <Label className="text-sm">Orçamento CPC: {cpcBudget} créditos</Label>
                                  <Slider
                                    min={5} max={500} step={5}
                                    value={[cpcBudget]}
                                    onValueChange={([v]) => setCpcBudget(v)}
                                    className="mt-2"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ≈ {cpcBudget} cliques ({cpcCostPerClick} crédito/clique)
                                  </p>
                                </div>
                              )}

                              {/* Summary */}
                              <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Custo total</span>
                                  <span className="font-bold">{calculateBoostCost()} créditos</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Saldo atual</span>
                                  <span className={balance < calculateBoostCost() ? "text-destructive font-medium" : ""}>
                                    {balance} créditos
                                  </span>
                                </div>
                                {balance < calculateBoostCost() && (
                                  <p className="text-xs text-destructive mt-1">Saldo insuficiente. Compra mais créditos.</p>
                                )}
                              </div>

                              <Button
                                className="w-full gap-2"
                                disabled={balance < calculateBoostCost() || spendCredits.isPending}
                                onClick={() => {
                                  spendCredits.mutate({
                                    listingId: listing.id,
                                    boostType,
                                    days: boostDays,
                                    cpcBudget,
                                  });
                                  setBoostDialog(null);
                                }}
                              >
                                {spendCredits.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Zap className="h-4 w-4" />
                                )}
                                Ativar Impulso — {calculateBoostCost()} créditos
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Transações
          </h3>
          {txLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Sem transações ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between text-sm p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Badge variant={tx.type === "purchase" ? "default" : tx.type === "refund" ? "secondary" : "outline"} className="text-[10px]">
                      {tx.type === "purchase" ? "Compra" : tx.type === "spend" ? "Gasto" : "Reembolso"}
                    </Badge>
                    <span className="text-muted-foreground">{tx.description || "—"}</span>
                  </div>
                  <span className={tx.amount > 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
