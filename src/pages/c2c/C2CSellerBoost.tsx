import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMyC2CListings } from "@/hooks/useC2CListings";
import { useMySellerSubscription, useMyBoosts, useBoostListing, useSubscribePremium } from "@/hooks/useC2CBoost";
import { useMySellerProfile } from "@/hooks/useC2CSellers";
import {
  ArrowLeft, Sparkles, Zap, Crown, Check, TrendingUp, Eye,
  ShieldCheck, Loader2, Rocket,
} from "lucide-react";

const boostOptions = [
  { key: "7days" as const, label: "7 dias", price: "2,99€", desc: "Ideal para testar" },
  { key: "14days" as const, label: "14 dias", price: "4,99€", desc: "Mais visibilidade" },
  { key: "30days" as const, label: "30 dias", price: "7,99€", desc: "Máxima exposição" },
];

const premiumFeatures = [
  { icon: Crown, text: "Badge Premium no perfil" },
  { icon: TrendingUp, text: "Comissão reduzida: 3% (vs 5%)" },
  { icon: Sparkles, text: "+5 anúncios extra" },
  { icon: ShieldCheck, text: "Suporte prioritário" },
  { icon: Eye, text: "Prioridade nos resultados" },
];

export default function C2CSellerBoost() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: seller } = useMySellerProfile(workspaceId);
  const { data: listings = [] } = useMyC2CListings(workspaceId);
  const { data: subscription } = useMySellerSubscription(workspaceId);
  const { data: boosts = [] } = useMyBoosts(workspaceId);
  const boostListing = useBoostListing();
  const subscribePremium = useSubscribePremium();
  const [boostDialog, setBoostDialog] = useState<string | null>(null);

  const activeListings = listings.filter((l) => l.status === "active");
  const activeBoosts = boosts.filter((b) => b.is_active && new Date(b.ends_at) > new Date());

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
          <p className="text-muted-foreground mt-1">Destaca os teus anúncios e subscreve o plano Premium</p>
        </div>

        {/* Premium Section */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
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
                className="w-full sm:w-auto gap-2"
                onClick={() => workspaceId && subscribePremium.mutate({ workspaceId })}
                disabled={subscribePremium.isPending}
              >
                {subscribePremium.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
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
            Dá visibilidade extra a um anúncio com destaque pago. Aparece no topo e com badge "Patrocinado".
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
                              <DialogTitle>Destacar "{listing.title}"</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              {boostOptions.map((opt) => (
                                <button
                                  key={opt.key}
                                  className="w-full flex items-center justify-between p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all text-left"
                                  onClick={() => {
                                    if (!workspaceId) return;
                                    boostListing.mutate({
                                      workspaceId,
                                      listingId: listing.id,
                                      duration: opt.key,
                                    });
                                    setBoostDialog(null);
                                  }}
                                  disabled={boostListing.isPending}
                                >
                                  <div>
                                    <p className="font-medium">{opt.label}</p>
                                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                  </div>
                                  <span className="font-bold text-primary">{opt.price}</span>
                                </button>
                              ))}
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

        {/* Boost History */}
        {boosts.length > 0 && (
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Histórico de Destaques</h3>
            <div className="space-y-2">
              {boosts.slice(0, 10).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Badge variant={b.is_active ? "default" : "secondary"} className="text-[10px]">
                      {b.is_active ? "Ativo" : "Expirado"}
                    </Badge>
                    <span>{b.amount_paid.toFixed(2)}€</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(b.starts_at).toLocaleDateString("pt-PT")} — {new Date(b.ends_at).toLocaleDateString("pt-PT")}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{b.impressions || 0} impressões</span>
                    <span>{b.clicks || 0} cliques</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
