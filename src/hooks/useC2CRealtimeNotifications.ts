import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const notifTypeLabels: Record<string, string> = {
  order_paid: "💰 Pagamento recebido",
  order_shipped: "📦 Encomenda enviada",
  order_delivered: "✅ Entrega confirmada",
  new_offer: "🤝 Nova oferta",
  offer_accepted: "🎉 Oferta aceite",
  new_review: "⭐ Nova avaliação",
  loyalty_points: "🎖️ Pontos ganhos",
};

export function useC2CRealtimeNotifications(workspaceId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!workspaceId || !user) return;

    const channel = supabase
      .channel(`c2c-notifs-${workspaceId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "c2c_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as any;
          const label = notifTypeLabels[notif.type] || "🔔 Notificação";
          toast(label, { description: notif.title || notif.body });
          qc.invalidateQueries({ queryKey: ["c2c-notifications"] });
          qc.invalidateQueries({ queryKey: ["c2c-notifications-unread"] });
        }
      )
      .subscribe();

    // Also listen for order status changes
    const orderChannel = supabase
      .channel(`c2c-orders-${workspaceId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "c2c_orders",
        },
        (payload) => {
          const order = payload.new as any;
          const old = payload.old as any;
          if (order.buyer_id === user.id || order.seller_id === user.id) {
            if (old.status !== order.status) {
              const statusLabel = notifTypeLabels[`order_${order.status}`] || `📋 Estado: ${order.status}`;
              toast(statusLabel);
              qc.invalidateQueries({ queryKey: ["c2c-buyer-orders"] });
              qc.invalidateQueries({ queryKey: ["c2c-seller-orders"] });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(orderChannel);
    };
  }, [workspaceId, user?.id, qc]);
}
