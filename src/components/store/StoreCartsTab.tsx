import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEmailSequences } from "@/hooks/useEmailSequences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Clock, Smartphone, Monitor, Tablet, AlertTriangle, Eye, DollarSign, MoreHorizontal, Copy, Phone as PhoneIcon, Mail, CheckCircle, XCircle, ExternalLink, Zap, Play, Square, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { StoreAbandonedCartDetail } from "./StoreAbandonedCartDetail";
import { StoreAbandonedCartOutreachDetail } from "./StoreAbandonedCartOutreachDetail";
import { StoreRecoverySettings } from "./StoreRecoverySettings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const sb = supabase as any;

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const deviceIcon = (type: string) => {
  if (type === "mobile") return <Smartphone className="h-4 w-4" />;
  if (type === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
};

const recoveryStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  abandoned: { label: "Abandonado", variant: "destructive" },
  contacted: { label: "Contactado", variant: "secondary" },
  recovered: { label: "Recuperado", variant: "default" },
  expired: { label: "Expirado", variant: "outline" },
};

const outreachStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Sem outreach", variant: "outline" },
  enrolled: { label: "Inscrito", variant: "secondary" },
  in_progress: { label: "Em progresso", variant: "default" },
  contacted: { label: "Contactado", variant: "secondary" },
  recovered: { label: "Recuperado", variant: "default" },
  exited: { label: "Saiu", variant: "destructive" },
  failed: { label: "Falhado", variant: "destructive" },
};

type OutreachFilter = "all" | "pending" | "enrolled" | "in_progress" | "recovered" | "exited";

export function StoreCartsTab() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const [detailCart, setDetailCart] = useState<any>(null);
  const [outreachDetailCart, setOutreachDetailCart] = useState<any>(null);
  const [outreachFilter, setOutreachFilter] = useState<OutreachFilter>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sequences = useEmailSequences();

  const storeSlug = useQuery({
    queryKey: ["store-slug", workspaceId],
    queryFn: async () => {
      const { data } = await sb.from("store_settings").select("store_slug").eq("workspace_id", workspaceId!).maybeSingle();
      return data?.store_slug || workspaceId;
    },
    enabled: !!workspaceId,
  });

  const recoverySettings = useQuery({
    queryKey: ["store-recovery-settings", workspaceId],
    queryFn: async () => {
      const { data } = await sb.from("store_recovery_settings").select("*").eq("workspace_id", workspaceId!).maybeSingle();
      return data;
    },
    enabled: !!workspaceId,
  });

  const activeCarts = useQuery({
    queryKey: ["store-active-carts", workspaceId],
    queryFn: async () => {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data, error } = await sb.from("store_visitor_sessions").select("*").eq("workspace_id", workspaceId!).not("cart_items", "is", null).gt("last_activity_at", thirtyMinAgo).order("cart_updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!workspaceId,
    refetchInterval: 15_000,
  });

  const abandonedCarts = useQuery({
    queryKey: ["store-abandoned-carts", workspaceId],
    queryFn: async () => {
      const { data, error } = await sb.from("store_abandoned_carts").select("*").eq("workspace_id", workspaceId!).order("abandoned_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!workspaceId,
  });

  const getRecoveryUrl = useCallback((cart: any) => {
    if (!cart.recovery_token || !storeSlug.data) return null;
    return `${window.location.origin}/store/${storeSlug.data}/recover/${cart.recovery_token}`;
  }, [storeSlug.data]);

  const generateToken = useCallback(async (cart: any) => {
    if (cart.recovery_token) {
      const url = getRecoveryUrl(cart);
      if (url) { navigator.clipboard.writeText(url); toast.success("Link copiado!"); }
      return;
    }
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await sb.from("store_abandoned_carts").update({ recovery_token: token, recovery_token_expires_at: expiresAt, updated_at: new Date().toISOString() }).eq("id", cart.id);
    if (error) { toast.error("Erro ao gerar link"); return; }
    const url = `${window.location.origin}/store/${storeSlug.data}/recover/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link gerado e copiado!");
    queryClient.invalidateQueries({ queryKey: ["store-abandoned-carts"] });
  }, [storeSlug.data, queryClient, getRecoveryUrl]);

  const updateCartStatus = useCallback(async (cart: any, status: string, extra: Record<string, any> = {}) => {
    const { error } = await sb.from("store_abandoned_carts").update({ recovery_status: status, updated_at: new Date().toISOString(), ...extra }).eq("id", cart.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Estado atualizado");
    queryClient.invalidateQueries({ queryKey: ["store-abandoned-carts"] });
  }, [queryClient]);

  const enrollInSequence = useMutation({
    mutationFn: async ({ cartId, sequenceId }: { cartId: string; sequenceId: string }) => {
      const cart = abandonedCarts.data?.find((c: any) => c.id === cartId);
      if (!cart || !cart.customer_email) throw new Error("Carrinho sem email");

      // Find or create contact
      let contactId = cart.contact_id;
      if (!contactId) {
        const { data: existing } = await sb.from("contacts").select("id").eq("workspace_id", workspaceId).eq("email", cart.customer_email).maybeSingle();
        if (existing) {
          contactId = existing.id;
        } else {
          const { data: newC } = await sb.from("contacts").insert({ workspace_id: workspaceId, email: cart.customer_email, first_name: cart.customer_name || null, phone: cart.customer_phone || null, source: "store_abandoned_cart" }).select("id").single();
          contactId = newC?.id;
        }
      }
      if (!contactId) throw new Error("Erro ao criar contacto");

      // Create enrollment
      const { data: enrollment, error: enrollErr } = await sb.from("email_sequence_enrollments").insert({
        workspace_id: workspaceId,
        sequence_id: sequenceId,
        contact_id: contactId,
        enrolled_by: "00000000-0000-0000-0000-000000000000",
        status: "active",
        current_step: 0,
      }).select("id").single();
      if (enrollErr) throw enrollErr;

      await sb.from("store_abandoned_carts").update({
        contact_id: contactId,
        sequence_id: sequenceId,
        sequence_enrollment_id: enrollment.id,
        outreach_status: "enrolled",
        outreach_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", cartId);

      await sb.from("store_automation_events").insert({
        workspace_id: workspaceId,
        event_type: "abandoned_cart_manual_enrolled",
        entity_type: "abandoned_cart",
        entity_id: cartId,
        payload: { sequence_id: sequenceId, enrollment_id: enrollment.id, contact_id: contactId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-abandoned-carts"] });
      toast.success("Inscrito na sequência");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao inscrever"),
  });

  const stopSequence = useMutation({
    mutationFn: async (cart: any) => {
      if (cart.sequence_enrollment_id) {
        await sb.from("email_sequence_enrollments").update({ status: "exited", exit_reason: "manual_stop", updated_at: new Date().toISOString() }).eq("id", cart.sequence_enrollment_id);
      }
      await sb.from("store_abandoned_carts").update({ outreach_status: "exited", exit_reason: "manual_stop", updated_at: new Date().toISOString() }).eq("id", cart.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-abandoned-carts"] });
      toast.success("Sequência parada");
    },
  });

  // Filter abandoned carts
  const filteredCarts = (abandonedCarts.data || []).filter((c: any) => {
    if (outreachFilter === "all") return true;
    return (c.outreach_status || "pending") === outreachFilter;
  });

  // KPIs
  const totalAbandoned = abandonedCarts.data?.length || 0;
  const lostValue = abandonedCarts.data?.reduce((sum: number, c: any) => sum + (c.subtotal || 0), 0) || 0;
  const recovered = abandonedCarts.data?.filter((c: any) => c.recovery_status === "recovered").length || 0;
  const recoveryRate = totalAbandoned > 0 ? (recovered / totalAbandoned) * 100 : 0;
  const activeCount = activeCarts.data?.length || 0;
  const activeValue = activeCarts.data?.reduce((sum: number, c: any) => sum + (c.cart_subtotal || 0), 0) || 0;
  const enrolledCount = abandonedCarts.data?.filter((c: any) => ["enrolled", "in_progress"].includes(c.outreach_status)).length || 0;

  const activeSequences = (sequences.data || []).filter((s) => s.isActive);

  return (
    <div className="space-y-6 mt-6">
      {/* KPIs */}
      <motion.div {...fadeIn} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Carrinhos Ativos</p>
              <div className="relative">
                <ShoppingCart className="h-4 w-4 text-primary" />
                {activeCount > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />}
              </div>
            </div>
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">€{activeValue.toFixed(2)} em valor</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Abandonados</p>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold">{totalAbandoned}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Valor Perdido</p>
              <DollarSign className="h-4 w-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-destructive">€{lostValue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Taxa Recuperação</p>
              <Eye className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-success">{recoveryRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Em Outreach</p>
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{enrolledCount}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recovery Settings (collapsible) */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Zap className="h-4 w-4" />
            Configuração de recuperação
            {recoverySettings.data?.is_enabled && <Badge variant="default" className="text-xs ml-1">Ativa</Badge>}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <StoreRecoverySettings />
        </CollapsibleContent>
      </Collapsible>

      {/* Active Carts */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Carrinhos Ativos
              {activeCount > 0 && (
                <Badge variant="default" className="ml-2 gap-1">
                  <span className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" />
                  Ao vivo
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCarts.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : activeCount === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum carrinho ativo neste momento</p>
            ) : (
              <div className="space-y-3">
                {(activeCarts.data || []).map((session: any) => {
                  const cartItems = (session.cart_items || []) as any[];
                  const timeAgo = session.cart_updated_at ? formatDistanceToNow(new Date(session.cart_updated_at), { addSuffix: true, locale: pt }) : "—";
                  return (
                    <div key={session.id} className="border rounded-xl p-4 flex items-start gap-4">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">{deviceIcon(session.device_type || "desktop")}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{cartItems.length} {cartItems.length === 1 ? "artigo" : "artigos"}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cartItems.slice(0, 3).map((item: any, i: number) => <Badge key={i} variant="outline" className="text-xs">{item.name} ×{item.quantity}</Badge>)}
                          {cartItems.length > 3 && <Badge variant="secondary" className="text-xs">+{cartItems.length - 3}</Badge>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">€{(session.cart_subtotal || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{session.device_type || "desktop"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Abandoned Carts */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Carrinhos Abandonados
              </CardTitle>
              <Select value={outreachFilter} onValueChange={(v) => setOutreachFilter(v as OutreachFilter)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Sem outreach</SelectItem>
                  <SelectItem value="enrolled">Inscritos</SelectItem>
                  <SelectItem value="in_progress">Em progresso</SelectItem>
                  <SelectItem value="recovered">Recuperados</SelectItem>
                  <SelectItem value="exited">Saídos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {abandonedCarts.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filteredCarts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum carrinho abandonado</p>
            ) : (
              <div className="space-y-3">
                {filteredCarts.map((cart: any) => {
                  const items = (cart.items || []) as any[];
                  const status = recoveryStatusLabels[cart.recovery_status] || recoveryStatusLabels.abandoned;
                  const outreach = outreachStatusLabels[cart.outreach_status || "pending"] || outreachStatusLabels.pending;
                  const timeAgo = cart.abandoned_at ? formatDistanceToNow(new Date(cart.abandoned_at), { addSuffix: true, locale: pt }) : "—";

                  return (
                    <div key={cart.id} className="border rounded-xl p-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium">{cart.customer_name || cart.customer_email || "Visitante anónimo"}</span>
                          <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                          {cart.outreach_status && cart.outreach_status !== "pending" && (
                            <Badge variant={outreach.variant} className="text-xs gap-1">
                              <Zap className="h-3 w-3" />
                              {outreach.label}
                              {cart.outreach_step > 0 && <span>· Step {cart.outreach_step}</span>}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          {cart.customer_email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {cart.customer_email}</span>}
                          {cart.customer_phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><PhoneIcon className="h-3 w-3" /> {cart.customer_phone}</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {items.slice(0, 3).map((item: any, i: number) => <Badge key={i} variant="outline" className="text-xs">{item.name} ×{item.quantity}</Badge>)}
                          {items.length > 3 && <Badge variant="secondary" className="text-xs">+{items.length - 3}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-destructive">€{(cart.subtotal || 0).toFixed(2)}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => generateToken(cart)}>
                              <Copy className="h-4 w-4 mr-2" />
                              {cart.recovery_token ? "Copiar link" : "Gerar link de recuperação"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDetailCart(cart)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver detalhe
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setOutreachDetailCart(cart)}>
                              <Zap className="h-4 w-4 mr-2" />
                              Ver outreach
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />

                            {/* Sequence enrollment */}
                            {(!cart.outreach_status || cart.outreach_status === "pending") && cart.customer_email && activeSequences.length > 0 && (
                              <>
                                {activeSequences.length === 1 ? (
                                  <DropdownMenuItem onClick={() => enrollInSequence.mutate({ cartId: cart.id, sequenceId: activeSequences[0].id })}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Inscrever em "{activeSequences[0].name}"
                                  </DropdownMenuItem>
                                ) : (
                                  activeSequences.slice(0, 5).map((seq) => (
                                    <DropdownMenuItem key={seq.id} onClick={() => enrollInSequence.mutate({ cartId: cart.id, sequenceId: seq.id })}>
                                      <Play className="h-4 w-4 mr-2" />
                                      Inscrever: {seq.name}
                                    </DropdownMenuItem>
                                  ))
                                )}
                                <DropdownMenuSeparator />
                              </>
                            )}

                            {/* Stop sequence */}
                            {["enrolled", "in_progress"].includes(cart.outreach_status) && (
                              <DropdownMenuItem onClick={() => stopSequence.mutate(cart)}>
                                <Square className="h-4 w-4 mr-2" />
                                Parar sequência
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            {cart.recovery_status !== "contacted" && (
                              <DropdownMenuItem onClick={() => updateCartStatus(cart, "contacted", { contacted_at: new Date().toISOString(), contact_channel: "manual" })}>
                                <PhoneIcon className="h-4 w-4 mr-2" />
                                Marcar contactado
                              </DropdownMenuItem>
                            )}
                            {cart.recovery_status !== "recovered" && (
                              <DropdownMenuItem onClick={() => updateCartStatus(cart, "recovered", { recovered_at: new Date().toISOString() })}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar recuperado
                              </DropdownMenuItem>
                            )}
                            {cart.recovery_status !== "expired" && (
                              <DropdownMenuItem onClick={() => updateCartStatus(cart, "expired")}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Marcar expirado
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail dialogs */}
      <StoreAbandonedCartDetail cart={detailCart} open={!!detailCart} onOpenChange={(open) => { if (!open) setDetailCart(null); }} workspaceSlug={storeSlug.data} />
      <StoreAbandonedCartOutreachDetail cart={outreachDetailCart} open={!!outreachDetailCart} onOpenChange={(open) => { if (!open) setOutreachDetailCart(null); }} />
    </div>
  );
}
