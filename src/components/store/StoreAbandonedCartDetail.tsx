import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Mail, Phone, User, Clock, Monitor, Smartphone, Tablet, Globe, ShoppingCart, ExternalLink } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const recoveryStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  abandoned: { label: "Abandonado", variant: "destructive" },
  contacted: { label: "Contactado", variant: "secondary" },
  recovered: { label: "Recuperado", variant: "default" },
  expired: { label: "Expirado", variant: "outline" },
};

const deviceIcon = (type: string) => {
  if (type === "mobile") return <Smartphone className="h-4 w-4" />;
  if (type === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
};

interface Props {
  cart: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug?: string;
}

export function StoreAbandonedCartDetail({ cart, open, onOpenChange, workspaceSlug }: Props) {
  if (!cart) return null;

  const items = (cart.items || []) as any[];
  const status = recoveryStatusLabels[cart.recovery_status] || recoveryStatusLabels.abandoned;

  const recoveryUrl = cart.recovery_token && workspaceSlug
    ? `${window.location.origin}/store/${workspaceSlug}/recover/${cart.recovery_token}`
    : null;

  const copyRecoveryLink = () => {
    if (recoveryUrl) {
      navigator.clipboard.writeText(recoveryUrl);
      toast.success("Link copiado!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Detalhe do Carrinho Abandonado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {cart.recovery_attempts > 0 && (
              <Badge variant="outline" className="text-xs">{cart.recovery_attempts} tentativa(s)</Badge>
            )}
          </div>

          {/* Visitor info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Visitante</h4>
            <div className="space-y-1.5">
              {cart.customer_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {cart.customer_name}
                </div>
              )}
              {cart.customer_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {cart.customer_email}
                </div>
              )}
              {cart.customer_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {cart.customer_phone}
                </div>
              )}
              {cart.device_type && (
                <div className="flex items-center gap-2 text-sm">
                  {deviceIcon(cart.device_type)}
                  <span className="capitalize">{cart.device_type}</span>
                </div>
              )}
              {cart.referrer && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[280px]">{cart.referrer}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Itens ({items.length})</h4>
            <div className="space-y-1.5">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between border rounded-lg p-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} × €{(item.price || 0).toFixed(2)}</p>
                  </div>
                  <p className="text-sm font-semibold">€{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-base font-bold">€{(cart.subtotal || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Timeline</h4>
            <div className="space-y-1.5 text-sm">
              {cart.abandoned_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Abandonado {formatDistanceToNow(new Date(cart.abandoned_at), { addSuffix: true, locale: pt })}
                  <span className="text-xs text-muted-foreground">({format(new Date(cart.abandoned_at), "dd/MM/yyyy HH:mm")})</span>
                </div>
              )}
              {cart.contacted_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Contactado {formatDistanceToNow(new Date(cart.contacted_at), { addSuffix: true, locale: pt })}
                  {cart.contact_channel && <Badge variant="outline" className="text-xs">{cart.contact_channel}</Badge>}
                </div>
              )}
              {cart.recovered_at && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Recuperado {formatDistanceToNow(new Date(cart.recovered_at), { addSuffix: true, locale: pt })}
                  {cart.recovered_value && <span>— €{cart.recovered_value.toFixed(2)}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Recovery link */}
          {recoveryUrl && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Link de Recuperação</h4>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded break-all">{recoveryUrl}</code>
                <Button variant="outline" size="icon" onClick={copyRecoveryLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {cart.recovery_token_expires_at && (
                <p className="text-xs text-muted-foreground">
                  Expira: {format(new Date(cart.recovery_token_expires_at), "dd/MM/yyyy HH:mm")}
                </p>
              )}
            </div>
          )}

          {/* Recovered order */}
          {cart.recovered_order_id && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Encomenda Recuperada</h4>
              <p className="text-sm flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                ID: {cart.recovered_order_id}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
