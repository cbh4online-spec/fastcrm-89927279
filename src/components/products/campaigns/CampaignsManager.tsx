import { useMemo, useState } from "react";
import { Plus, Search, Calendar, Tag, Users, Gift, Percent, Truck, Sparkles, Zap, Flame, Crown, Cake, Share2, Award, Layers, ShoppingCart, Clock, Pause, Play, Archive, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaigns, useDeleteCampaign, useToggleCampaignStatus, type Campaign, type CampaignMechanic, type CampaignStatus } from "@/hooks/useCampaigns";
import { CampaignDialog } from "./CampaignDialog";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const MECHANIC_META: Record<CampaignMechanic, { label: string; icon: any; color: string; group: "basic" | "advanced" | "temporal" | "segment" }> = {
  percentage_discount:    { label: "Desconto %",            icon: Percent,    color: "bg-blue-500/10 text-blue-700",       group: "basic" },
  fixed_amount_discount:  { label: "Desconto €",            icon: Tag,        color: "bg-blue-500/10 text-blue-700",       group: "basic" },
  fixed_price:            { label: "Preço fixo",            icon: Tag,        color: "bg-blue-500/10 text-blue-700",       group: "basic" },
  free_shipping:          { label: "Portes grátis",         icon: Truck,      color: "bg-emerald-500/10 text-emerald-700", group: "basic" },
  bogo:                   { label: "BOGO (Compra X leva Y)",icon: Gift,       color: "bg-purple-500/10 text-purple-700",   group: "advanced" },
  buy_n_get_n_pct:        { label: "Compra N, leva N% off", icon: Gift,       color: "bg-purple-500/10 text-purple-700",   group: "advanced" },
  bundle:                 { label: "Bundle / Combo",        icon: Layers,     color: "bg-purple-500/10 text-purple-700",   group: "advanced" },
  volume_tiered:          { label: "Volume escalonado",     icon: ShoppingCart,color:"bg-purple-500/10 text-purple-700",   group: "advanced" },
  gift_product:           { label: "Brinde",                icon: Gift,       color: "bg-purple-500/10 text-purple-700",   group: "advanced" },
  cart_progressive:       { label: "Carrinho progressivo",  icon: ShoppingCart,color:"bg-purple-500/10 text-purple-700",   group: "advanced" },
  cashback:               { label: "Cashback",              icon: Sparkles,   color: "bg-purple-500/10 text-purple-700",   group: "advanced" },
  store_credit:           { label: "Crédito loja",          icon: Sparkles,   color: "bg-purple-500/10 text-purple-700",   group: "advanced" },
  flash_sale:             { label: "Flash Sale",            icon: Zap,        color: "bg-orange-500/10 text-orange-700",   group: "temporal" },
  happy_hour:             { label: "Happy Hour",            icon: Clock,      color: "bg-orange-500/10 text-orange-700",   group: "temporal" },
  seasonal:               { label: "Sazonal",               icon: Calendar,   color: "bg-orange-500/10 text-orange-700",   group: "temporal" },
  launch_price:           { label: "Preço de lançamento",   icon: Sparkles,   color: "bg-orange-500/10 text-orange-700",   group: "temporal" },
  clearance:              { label: "Liquidação",            icon: Flame,      color: "bg-orange-500/10 text-orange-700",   group: "temporal" },
  first_purchase:         { label: "1ª compra",             icon: Users,      color: "bg-pink-500/10 text-pink-700",       group: "segment" },
  birthday:               { label: "Aniversário",           icon: Cake,       color: "bg-pink-500/10 text-pink-700",       group: "segment" },
  referral:               { label: "Referral",              icon: Share2,     color: "bg-pink-500/10 text-pink-700",       group: "segment" },
  loyalty:                { label: "Fidelização",           icon: Award,      color: "bg-pink-500/10 text-pink-700",       group: "segment" },
};

const STATUS_META: Record<CampaignStatus, { label: string; variant: any }> = {
  draft:     { label: "Rascunho",  variant: "secondary" },
  scheduled: { label: "Agendada",  variant: "outline" },
  active:    { label: "Activa",    variant: "default" },
  paused:    { label: "Em pausa",  variant: "secondary" },
  expired:   { label: "Expirada",  variant: "outline" },
  archived:  { label: "Arquivada", variant: "outline" },
};

export function CampaignsManager() {
  const { data: campaigns, isLoading } = useCampaigns();
  const del = useDeleteCampaign();
  const toggle = useToggleCampaignStatus();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "scheduled" | "draft" | "archived">("all");
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    let list = campaigns ?? [];
    if (tab !== "all") list = list.filter(c => c.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.internal_code?.toLowerCase().includes(q));
    }
    return list;
  }, [campaigns, tab, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Campanhas e Promoções</h2>
          <p className="text-sm text-muted-foreground">Crie todas as variantes de campanha: descontos, BOGO, bundles, flash sales, cupões e mais.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="w-4 h-4" />Nova campanha</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar campanhas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos</TabsTrigger>
          <TabsTrigger value="archived">Arquivadas</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Sem campanhas {tab !== "all" ? `(${STATUS_META[tab as CampaignStatus]?.label})` : ""}.</p>
              <Button variant="link" onClick={() => setCreating(true)}>Criar primeira campanha</Button>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map(c => {
                const meta = MECHANIC_META[c.mechanic];
                const Icon = meta?.icon ?? Tag;
                return (
                  <Card key={c.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${meta?.color ?? "bg-muted"}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold truncate">{c.name}</h3>
                              <Badge variant={STATUS_META[c.status].variant}>{STATUS_META[c.status].label}</Badge>
                              <Badge variant="outline" className="text-xs">{meta?.label ?? c.mechanic}</Badge>
                              {c.requires_coupon && <Badge variant="outline" className="text-xs">Requer cupão</Badge>}
                              {c.stackable && <Badge variant="outline" className="text-xs">Acumulável</Badge>}
                            </div>
                            {c.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                              {c.starts_at && <span>Início: {format(new Date(c.starts_at), "dd MMM yyyy HH:mm", { locale: pt })}</span>}
                              {c.ends_at && <span>Fim: {format(new Date(c.ends_at), "dd MMM yyyy HH:mm", { locale: pt })}</span>}
                              <span>Usos: {c.uses_count}{c.max_total_uses ? `/${c.max_total_uses}` : ""}</span>
                              {c.discount_given > 0 && <span>Desconto dado: €{c.discount_given.toFixed(2)}</span>}
                              <span>Canais: {c.channels.join(", ")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {c.status === "active" ? (
                            <Button size="icon" variant="ghost" onClick={() => toggle.mutate({ id: c.id, status: "paused" })} title="Pausar"><Pause className="w-4 h-4" /></Button>
                          ) : c.status === "paused" || c.status === "draft" ? (
                            <Button size="icon" variant="ghost" onClick={() => toggle.mutate({ id: c.id, status: "active" })} title="Activar"><Play className="w-4 h-4" /></Button>
                          ) : null}
                          <Button size="icon" variant="ghost" onClick={() => setEditing(c)} title="Editar"><Edit className="w-4 h-4" /></Button>
                          {c.status !== "archived" && (
                            <Button size="icon" variant="ghost" onClick={() => toggle.mutate({ id: c.id, status: "archived" })} title="Arquivar"><Archive className="w-4 h-4" /></Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Eliminar campanha?")) del.mutate(c.id); }} title="Eliminar"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {(creating || editing) && (
        <CampaignDialog
          open={creating || !!editing}
          campaign={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

export { MECHANIC_META };
