import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useC2CBuyerOrders, useC2CSellerOrders, useUpdateOrderShipping, useConfirmDelivery } from "@/hooks/useC2COrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, ShoppingBag, Store, Package, Truck, CheckCircle2, Clock,
  XCircle, MapPin, Loader2, ExternalLink
} from "lucide-react";

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-500", label: "orderStatusPending" },
  paid: { icon: ShoppingBag, color: "text-blue-500", label: "orderStatusPaid" },
  shipped: { icon: Truck, color: "text-primary", label: "orderStatusShipped" },
  delivered: { icon: CheckCircle2, color: "text-green-500", label: "orderStatusDelivered" },
  cancelled: { icon: XCircle, color: "text-destructive", label: "orderStatusCancelled" },
};

function OrderCard({ order, role, t, onShip, onConfirm, navigate }: any) {
  const listing = order.c2c_listings;
  const photos = listing?.photos as string[] | null;
  const cfg = statusConfig[order.status] || statusConfig.pending;
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
          {photos?.[0] ? <img src={photos[0]} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{listing?.title || t('orderUnknownProduct')}</h3>
          <p className="text-lg font-bold">{order.total_price?.toFixed(2)} {order.currency}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
            <span className={`text-xs font-medium ${cfg.color}`}>{t(cfg.label)}</span>
          </div>
        </div>
      </div>

      {/* Shipping info */}
      {order.shipping_method && order.shipping_method !== 'in_person' && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p><Truck className="h-3 w-3 inline mr-1" />{order.shipping_carrier || order.shipping_method} — {order.shipping_price?.toFixed(2)} €</p>
          {order.tracking_code && (
            <p className="flex items-center gap-1">
              {t('orderTrackingCode')}: <span className="font-mono font-medium text-foreground">{order.tracking_code}</span>
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noopener" className="text-primary"><ExternalLink className="h-3 w-3" /></a>
              )}
            </p>
          )}
        </div>
      )}
      {order.delivery_mode === 'in_person' && (
        <p className="text-xs text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{t('orderMeetup')}: {order.meetup_location || '—'}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {role === 'seller' && order.status === 'paid' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Truck className="h-3.5 w-3.5" />{t('orderMarkShipped')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('orderAddTracking')}</DialogTitle></DialogHeader>
              <ShipForm onSubmit={(data) => onShip({ orderId: order.id, ...data })} t={t} />
            </DialogContent>
          </Dialog>
        )}
        {role === 'buyer' && order.status === 'shipped' && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onConfirm(order.id)}>
            <CheckCircle2 className="h-3.5 w-3.5" />{t('orderConfirmDelivery')}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/c2c/${order.listing_id}`)}>
          {t('orderViewListing')}
        </Button>
      </div>
    </div>
  );
}

function ShipForm({ onSubmit, t }: { onSubmit: (d: { trackingCode: string; trackingUrl?: string; shippingCarrier?: string }) => void; t: any }) {
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [carrier, setCarrier] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">{t('orderTrackingCode')}</label>
        <Input value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="CTT12345678PT" />
      </div>
      <div>
        <label className="text-sm font-medium">{t('orderCarrier')}</label>
        <Input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="CTT / DPD / GLS" />
      </div>
      <div>
        <label className="text-sm font-medium">{t('orderTrackingUrl')}</label>
        <Input value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} placeholder="https://..." />
      </div>
      <Button className="w-full" disabled={!trackingCode.trim()} onClick={() => onSubmit({ trackingCode, trackingUrl: trackingUrl || undefined, shippingCarrier: carrier || undefined })}>
        {t('orderMarkShipped')}
      </Button>
    </div>
  );
}

export default function C2COrders() {
  const { t } = useTranslation('marketplace');
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: buyerOrders = [], isLoading: loadingBuyer } = useC2CBuyerOrders(wid);
  const { data: sellerOrders = [], isLoading: loadingSeller } = useC2CSellerOrders(wid);
  const updateShipping = useUpdateOrderShipping(wid);
  const confirmDelivery = useConfirmDelivery();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><Store className="w-5 h-5 text-primary" /></div>
            <h1 className="text-lg font-bold">{t('ordersTitle')}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Tabs defaultValue="purchases">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="purchases" className="gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" /> {t('ordersPurchases')} {buyerOrders.length > 0 && `(${buyerOrders.length})`}
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-1.5">
              <Package className="h-3.5 w-3.5" /> {t('ordersSales')} {sellerOrders.length > 0 && `(${sellerOrders.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4">
            {loadingBuyer ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : buyerOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{t('ordersNoPurchases')}</p>
              </div>
            ) : (
              buyerOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} role="buyer" t={t} onConfirm={(id: string) => confirmDelivery.mutate(id)} navigate={navigate} />
              ))
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            {loadingSeller ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : sellerOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{t('ordersNoSales')}</p>
              </div>
            ) : (
              sellerOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} role="seller" t={t} onShip={(d: any) => updateShipping.mutate(d)} navigate={navigate} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
