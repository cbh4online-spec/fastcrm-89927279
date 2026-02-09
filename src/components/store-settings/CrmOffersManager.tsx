import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Trash2, Zap, Target, Users, Brain, Tag,
  Eye, EyeOff, Link, ShieldCheck, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useConditionalOffers, useCreateConditionalOffer, useDeleteConditionalOffer, useUpdateConditionalOffer,
  useDynamicPricingRules, useCreateDynamicPricing, useDeleteDynamicPricing,
  useAIOffers, useApproveAIOffer, useRejectAIOffer,
  type ConditionalOffer, type DynamicPricingRule, type AIGeneratedOffer,
} from "@/hooks/useStoreConditionalOffers";

export function CrmOffersManager() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Loja Orientada ao CRM
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ofertas condicionais, preços dinâmicos e recomendações IA baseadas no contexto do CRM
        </p>
      </div>

      <Tabs defaultValue="conditional" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50">
          <TabsTrigger value="conditional" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Ofertas Condicionais
          </TabsTrigger>
          <TabsTrigger value="dynamic" className="gap-1.5 text-xs">
            <Tag className="h-3.5 w-3.5" /> Preços Dinâmicos
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5 text-xs">
            <Brain className="h-3.5 w-3.5" /> Ofertas IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conditional" className="mt-4">
          <ConditionalOffersTab />
        </TabsContent>
        <TabsContent value="dynamic" className="mt-4">
          <DynamicPricingTab />
        </TabsContent>
        <TabsContent value="ai" className="mt-4">
          <AIOffersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ======= Conditional Offers Tab =======

function ConditionalOffersTab() {
  const { data: offers, isLoading } = useConditionalOffers();
  const createOffer = useCreateConditionalOffer();
  const deleteOffer = useDeleteConditionalOffer();
  const updateOffer = useUpdateConditionalOffer();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ofertas aplicadas automaticamente quando o cliente corresponde às condições do CRM
        </p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nova Oferta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Oferta Condicional</DialogTitle>
            </DialogHeader>
            <CreateConditionalOfferForm
              onSubmit={(data) => {
                createOffer.mutate(data, { onSuccess: () => setShowCreate(false) });
              }}
              isLoading={createOffer.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {(offers || []).length === 0 ? (
        <EmptyState icon={Zap} message="Nenhuma oferta condicional criada" />
      ) : (
        <div className="space-y-3">
          {(offers || []).map((offer) => (
            <Card key={offer.id} className={cn(!offer.is_active && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{offer.name}</h4>
                      <Badge variant={offer.is_active ? "default" : "secondary"} className="text-[10px]">
                        {offer.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {offerTypeLabels[offer.offer_type] || offer.offer_type}
                      </Badge>
                    </div>
                    {offer.description && (
                      <p className="text-xs text-muted-foreground mb-2">{offer.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {renderConditionBadges(offer.conditions)}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {offer.discount_percentage && <span>-{offer.discount_percentage}%</span>}
                      {offer.discount_fixed && <span>-€{offer.discount_fixed}</span>}
                      {offer.min_order_value && <span>Min: €{offer.min_order_value}</span>}
                      {offer.usage_limit && <span>{offer.usage_count}/{offer.usage_limit} usos</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={offer.is_active}
                      onCheckedChange={(checked) =>
                        updateOffer.mutate({ id: offer.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => deleteOffer.mutate(offer.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ======= Dynamic Pricing Tab =======

function DynamicPricingTab() {
  const { data: rules, isLoading } = useDynamicPricingRules();
  const createRule = useCreateDynamicPricing();
  const deleteRule = useDeleteDynamicPricing();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Preços automaticamente ajustados com base no segmento, escalão ou tipo de cliente
        </p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Regra de Preço Dinâmico</DialogTitle>
            </DialogHeader>
            <CreateDynamicPricingForm
              onSubmit={(data) => {
                createRule.mutate(data, { onSuccess: () => setShowCreate(false) });
              }}
              isLoading={createRule.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {(rules || []).length === 0 ? (
        <EmptyState icon={Tag} message="Nenhuma regra de preço dinâmico" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rules || []).map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {pricingTypeLabels[rule.pricing_type] || rule.pricing_type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {rule.pricing_type === "percentage_discount" ? `-${rule.value}%` : `€${rule.value}`}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {rule.client_type && <Badge variant="secondary" className="text-[10px] mr-1">{rule.client_type}</Badge>}
                  {rule.segment_id && <Badge variant="secondary" className="text-[10px]">Segmento</Badge>}
                  {rule.price_tier_id && <Badge variant="secondary" className="text-[10px]">Escalão</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant={rule.is_active ? "default" : "secondary"} className="text-[10px]">
                    {rule.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ======= AI Offers Tab =======

function AIOffersTab() {
  const { data: offers, isLoading } = useAIOffers();
  const approveOffer = useApproveAIOffer();
  const rejectOffer = useRejectAIOffer();

  if (isLoading) return <LoadingSkeleton />;

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Pendente", color: "text-warning", icon: Clock },
    approved: { label: "Aprovada", color: "text-success", icon: CheckCircle2 },
    delivered: { label: "Entregue", color: "text-primary", icon: ShieldCheck },
    redeemed: { label: "Resgatada", color: "text-success", icon: CheckCircle2 },
    expired: { label: "Expirada", color: "text-muted-foreground", icon: Clock },
    rejected: { label: "Rejeitada", color: "text-destructive", icon: XCircle },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ofertas personalizadas geradas pela IA com base no histórico e comportamento do cliente
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => {
          // Trigger AI offer generation via edge function
          import("@/integrations/supabase/client").then(({ supabase }) => {
            supabase.functions.invoke("ai-store-offers", { body: { action: "generate" } });
          });
        }}>
          <Brain className="h-3.5 w-3.5" /> Gerar Ofertas IA
        </Button>
      </div>

      {(offers || []).length === 0 ? (
        <EmptyState icon={Brain} message="Nenhuma oferta IA gerada ainda" />
      ) : (
        <div className="space-y-3">
          {(offers || []).map((offer) => {
            const st = statusConfig[offer.status] || statusConfig.pending;
            return (
              <Card key={offer.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{offer.title}</h4>
                        <Badge variant="outline" className={cn("text-[10px]", st.color)}>
                          <st.icon className="h-3 w-3 mr-1" />
                          {st.label}
                        </Badge>
                        {offer.confidence_score && (
                          <Badge variant="outline" className="text-[10px]">
                            {Math.round(offer.confidence_score * 100)}% confiança
                          </Badge>
                        )}
                      </div>
                      {offer.description && (
                        <p className="text-xs text-muted-foreground mb-1">{offer.description}</p>
                      )}
                      {offer.ai_reasoning && (
                        <p className="text-xs text-muted-foreground/80 italic mb-2">💡 {offer.ai_reasoning}</p>
                      )}
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {offer.discount_percentage && <span>-{offer.discount_percentage}%</span>}
                        {offer.coupon_code && <span className="font-mono">{offer.coupon_code}</span>}
                        <span>{offer.delivery_channel}</span>
                      </div>
                    </div>
                    {offer.status === "pending" && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-success" onClick={() => approveOffer.mutate(offer.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 gap-1 text-destructive" onClick={() => rejectOffer.mutate(offer.id)}>
                          <XCircle className="h-3.5 w-3.5" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ======= Forms =======

function CreateConditionalOfferForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [name, setName] = useState("");
  const [offerType, setOfferType] = useState("discount");
  const [discountPct, setDiscountPct] = useState("");
  const [minSpent, setMinSpent] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [clientType, setClientType] = useState("");
  const [pipelineStage, setPipelineStage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const conditions: Record<string, any> = {};
    if (clientType) conditions.client_type = [clientType];
    if (pipelineStage) conditions.pipeline_stages = [pipelineStage];
    if (minSpent) conditions.min_total_spent = Number(minSpent);
    if (minOrders) conditions.min_orders = Number(minOrders);

    onSubmit({
      name,
      offer_type: offerType,
      discount_percentage: discountPct ? Number(discountPct) : null,
      conditions,
      applies_to: "all",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nome da Oferta</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Desconto VIP B2B" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo de Oferta</Label>
          <Select value={offerType} onValueChange={setOfferType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="discount">Desconto %</SelectItem>
              <SelectItem value="special_price">Preço Especial</SelectItem>
              <SelectItem value="free_shipping">Envio Grátis</SelectItem>
              <SelectItem value="bundle_deal">Bundle Deal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Desconto (%)</Label>
          <Input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="10" />
        </div>
      </div>

      <div className="border-t pt-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Condições CRM</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Tipo de Cliente</Label>
            <Select value={clientType} onValueChange={setClientType}>
              <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Qualquer</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Fase Pipeline</Label>
            <Select value={pipelineStage} onValueChange={setPipelineStage}>
              <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Qualquer</SelectItem>
                <SelectItem value="qualification">Qualificação</SelectItem>
                <SelectItem value="proposal">Proposta</SelectItem>
                <SelectItem value="negotiation">Negociação</SelectItem>
                <SelectItem value="closing">Fecho</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Min. Gasto Total (€)</Label>
            <Input type="number" value={minSpent} onChange={(e) => setMinSpent(e.target.value)} placeholder="500" />
          </div>
          <div>
            <Label className="text-xs">Min. Encomendas</Label>
            <Input type="number" value={minOrders} onChange={(e) => setMinOrders(e.target.value)} placeholder="3" />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={!name || isLoading}>
        {isLoading ? "A criar..." : "Criar Oferta Condicional"}
      </Button>
    </form>
  );
}

function CreateDynamicPricingForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [name, setName] = useState("");
  const [pricingType, setPricingType] = useState("percentage_discount");
  const [value, setValue] = useState("");
  const [clientType, setClientType] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          pricing_type: pricingType,
          value: Number(value),
          client_type: clientType || null,
          applies_to: "all",
        });
      }}
      className="space-y-4"
    >
      <div>
        <Label>Nome da Regra</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Desconto B2B 15%" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo de Preço</Label>
          <Select value={pricingType} onValueChange={setPricingType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage_discount">Desconto %</SelectItem>
              <SelectItem value="fixed_discount">Desconto Fixo (€)</SelectItem>
              <SelectItem value="fixed_price">Preço Fixo</SelectItem>
              <SelectItem value="markup">Markup %</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Valor</Label>
          <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="15" required />
        </div>
      </div>
      <div>
        <Label>Tipo de Cliente</Label>
        <Select value={clientType} onValueChange={setClientType}>
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="b2b">B2B</SelectItem>
            <SelectItem value="b2c">B2C</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={!name || !value || isLoading}>
        {isLoading ? "A criar..." : "Criar Regra de Preço"}
      </Button>
    </form>
  );
}

// ======= Helpers =======

const offerTypeLabels: Record<string, string> = {
  discount: "Desconto",
  special_price: "Preço Especial",
  free_product: "Produto Grátis",
  bundle_deal: "Bundle Deal",
  free_shipping: "Envio Grátis",
};

const pricingTypeLabels: Record<string, string> = {
  percentage_discount: "Desconto %",
  fixed_discount: "Desconto Fixo",
  fixed_price: "Preço Fixo",
  markup: "Markup %",
};

function renderConditionBadges(conditions: any) {
  const badges: React.ReactNode[] = [];
  if (conditions.client_type?.length)
    badges.push(<Badge key="ct" variant="secondary" className="text-[10px] gap-1"><Users className="h-3 w-3" />{conditions.client_type.join(", ")}</Badge>);
  if (conditions.pipeline_stages?.length)
    badges.push(<Badge key="ps" variant="secondary" className="text-[10px] gap-1"><Target className="h-3 w-3" />{conditions.pipeline_stages.join(", ")}</Badge>);
  if (conditions.min_total_spent)
    badges.push(<Badge key="ms" variant="secondary" className="text-[10px]">Min €{conditions.min_total_spent}</Badge>);
  if (conditions.min_orders)
    badges.push(<Badge key="mo" variant="secondary" className="text-[10px]">Min {conditions.min_orders} encomendas</Badge>);
  if (conditions.tags?.length)
    badges.push(<Badge key="tg" variant="secondary" className="text-[10px]">{conditions.tags.join(", ")}</Badge>);
  if (badges.length === 0)
    badges.push(<Badge key="all" variant="outline" className="text-[10px]">Todos os clientes</Badge>);
  return badges;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
    </div>
  );
}
