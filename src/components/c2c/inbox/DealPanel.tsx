import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, Package, HandCoins, Shield, Star, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { C2CConversation } from "@/hooks/useC2CMessages";
import type { C2COffer } from "@/hooks/useC2COffers";
import { useAuth } from "@/contexts/AuthContext";

interface DealPanelProps {
  conversation: C2CConversation | null;
  offers: C2COffer[];
  onMakeOffer: (price: number) => void;
}

export function DealPanel({ conversation, offers, onMakeOffer }: DealPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!conversation) {
    return (
      <div className="glass-premium rounded-xl h-full flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Seleciona uma conversa</p>
      </div>
    );
  }

  const isSeller = conversation.listing_seller_id === user?.id;
  const price = conversation.listing_price;
  const lastOffer = offers[0];
  const quickOffers = [-5, -10, -15].map(pct => ({
    label: `${pct}%`,
    value: Math.round(price * (1 + pct / 100) * 100) / 100,
  }));

  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: "Disponível", color: "bg-[hsl(142,76%,36%)]/20 text-[hsl(142,76%,36%)]" },
    reserved: { label: "Reservado", color: "bg-[hsl(38,92%,50%)]/20 text-[hsl(38,92%,50%)]" },
    sold: { label: "Vendido", color: "bg-destructive/20 text-destructive" },
  };
  const st = statusConfig[conversation.listing_status] || statusConfig.active;

  return (
    <div className="glass-premium rounded-xl h-full flex flex-col overflow-y-auto">
      {/* Product Card */}
      <div className="p-4 border-b border-border/30">
        <div className="aspect-[4/3] rounded-lg bg-muted/30 overflow-hidden mb-3">
          {conversation.listing_photo ? (
            <img src={conversation.listing_photo} alt={conversation.listing_title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <h3 className="font-semibold text-sm text-foreground">{conversation.listing_title}</h3>
        <p className="text-lg font-bold text-[hsl(var(--gold))] mt-1">{price.toFixed(2)} €</p>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
          {conversation.listing_location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {conversation.listing_location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" /> {conversation.listing_condition === "new" ? "Novo" : "Usado"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 text-xs"
          onClick={() => navigate(`/dashboard/c2c/${conversation.listing_id}`)}
        >
          <ExternalLink className="h-3 w-3 mr-1.5" /> Ver anúncio
        </Button>
      </div>

      {/* Negotiation */}
      <div className="p-4 border-b border-border/30">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <HandCoins className="h-3.5 w-3.5 text-[hsl(var(--gold))]" /> Negociação
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Preço anunciado</span>
            <span className="font-medium text-foreground">{price.toFixed(2)} €</span>
          </div>
          {lastOffer && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última proposta</span>
              <span className="font-semibold text-[hsl(var(--gold))]">{lastOffer.offer_price.toFixed(2)} €</span>
            </div>
          )}
        </div>

        {/* Quick offers for buyer */}
        {!isSeller && conversation.listing_status === "active" && (
          <div className="mt-3">
            <p className="text-[10px] text-muted-foreground mb-1.5">Proposta rápida</p>
            <div className="flex gap-1.5">
              {quickOffers.map(qo => (
                <button
                  key={qo.label}
                  onClick={() => onMakeOffer(qo.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-muted/50 hover:bg-primary/10 border border-border/30 hover:border-primary/30 transition-colors text-center"
                >
                  <p className="text-[10px] text-muted-foreground">{qo.label}</p>
                  <p className="text-xs font-semibold text-foreground">{qo.value.toFixed(0)} €</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Offers timeline */}
        {offers.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Histórico</p>
            {offers.slice(0, 5).map(offer => {
              const isMe = offer.buyer_id === user?.id;
              const statusLabel: Record<string, string> = {
                pending: "Pendente",
                accepted: "Aceite",
                rejected: "Recusada",
                countered: "Contraproposta",
                expired: "Expirada",
              };
              const statusColor: Record<string, string> = {
                pending: "text-[hsl(38,92%,50%)]",
                accepted: "text-[hsl(142,76%,36%)]",
                rejected: "text-destructive",
                countered: "text-[hsl(var(--gold))]",
                expired: "text-muted-foreground",
              };
              return (
                <div key={offer.id} className="flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-muted-foreground">{isMe ? "Tu" : "Vendedor"}</span>
                    <span className="text-muted-foreground/50 mx-1">·</span>
                    <span className="font-medium text-foreground">{offer.offer_price.toFixed(2)} €</span>
                    {offer.counter_price && (
                      <span className="text-[hsl(var(--gold))] ml-1">→ {offer.counter_price.toFixed(2)} €</span>
                    )}
                  </div>
                  <span className={`font-medium ${statusColor[offer.status] || "text-muted-foreground"}`}>
                    {statusLabel[offer.status] || offer.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="p-4 border-b border-border/30">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Estado</h4>
        <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
      </div>

      {/* Trust */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-[hsl(var(--gold))]" /> Confiança
        </h4>
        <div className="space-y-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Star className="h-3 w-3 text-[hsl(var(--gold))]" />
            <span>Vendedor verificado</span>
          </div>
          <div className="p-2 rounded-lg bg-[hsl(38,92%,50%)]/5 border border-[hsl(38,92%,50%)]/10 mt-2">
            <p className="text-[10px] text-[hsl(38,92%,50%)]">
              ⚠️ Nunca partilhes dados pessoais ou faças pagamentos fora da plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
