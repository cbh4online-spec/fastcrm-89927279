import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Clock, User, ShoppingCart, Zap } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const sb = supabase as any;

const outreachStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  enrolled: { label: "Inscrito", variant: "secondary" },
  in_progress: { label: "Em progresso", variant: "default" },
  contacted: { label: "Contactado", variant: "secondary" },
  recovered: { label: "Recuperado", variant: "default" },
  exited: { label: "Saiu", variant: "destructive" },
  failed: { label: "Falhado", variant: "destructive" },
};

interface Props {
  cart: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoreAbandonedCartOutreachDetail({ cart, open, onOpenChange }: Props) {
  if (!cart) return null;

  // Fetch enrollment details if exists
  const enrollment = useQuery({
    queryKey: ["enrollment-detail", cart.sequence_enrollment_id],
    queryFn: async () => {
      if (!cart.sequence_enrollment_id) return null;
      const { data } = await sb
        .from("email_sequence_enrollments")
        .select("*, email_sequences(name)")
        .eq("id", cart.sequence_enrollment_id)
        .maybeSingle();
      return data;
    },
    enabled: !!cart.sequence_enrollment_id && open,
  });

  // Fetch sequence steps
  const steps = useQuery({
    queryKey: ["sequence-steps-outreach", cart.sequence_id],
    queryFn: async () => {
      if (!cart.sequence_id) return [];
      const { data } = await sb
        .from("email_sequence_steps")
        .select("*")
        .eq("sequence_id", cart.sequence_id)
        .order("step_order", { ascending: true });
      return data || [];
    },
    enabled: !!cart.sequence_id && open,
  });

  const items = (cart.items || []) as any[];
  const status = outreachStatusLabels[cart.outreach_status] || outreachStatusLabels.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Outreach — Carrinho Abandonado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={status.variant}>{status.label}</Badge>
            {cart.outreach_step > 0 && (
              <Badge variant="outline" className="text-xs">Step {cart.outreach_step}</Badge>
            )}
            {cart.exit_reason && (
              <Badge variant="destructive" className="text-xs">{cart.exit_reason}</Badge>
            )}
          </div>

          {/* Cart summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
              <ShoppingCart className="h-3.5 w-3.5" /> Carrinho
            </h4>
            <div className="space-y-1">
              {items.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.name} ×{item.quantity}</span>
                  <span className="font-medium">€{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
              {items.length > 5 && <p className="text-xs text-muted-foreground">+{items.length - 5} mais</p>}
              <div className="flex justify-between border-t pt-1 text-sm font-bold">
                <span>Total</span>
                <span>€{(cart.subtotal || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Visitor */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Contacto
            </h4>
            <div className="space-y-1 text-sm">
              {cart.customer_name && <p>{cart.customer_name}</p>}
              {cart.customer_email && (
                <p className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3 w-3" /> {cart.customer_email}
                </p>
              )}
            </div>
          </div>

          {/* Sequence info */}
          {enrollment.data && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" /> Sequência
              </h4>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{enrollment.data.email_sequences?.name || "—"}</p>
                <p className="text-muted-foreground">
                  Status: <Badge variant="outline" className="text-xs ml-1">{enrollment.data.status}</Badge>
                </p>
                <p className="text-muted-foreground">
                  Step atual: {enrollment.data.current_step || 0}
                </p>
                {enrollment.data.next_send_at && (
                  <p className="text-muted-foreground">
                    Próximo envio: {format(new Date(enrollment.data.next_send_at), "dd/MM/yyyy HH:mm")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Steps timeline */}
          {(steps.data || []).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Steps da sequência</h4>
              <div className="space-y-1.5">
                {(steps.data || []).map((step: any, i: number) => {
                  const currentStep = enrollment.data?.current_step || 0;
                  const isDone = i < currentStep;
                  const isCurrent = i === currentStep;

                  return (
                    <div key={step.id} className={`flex items-center gap-2 text-sm border rounded-lg p-2 ${isCurrent ? "border-primary bg-primary/5" : isDone ? "opacity-60" : ""}`}>
                      <span className="text-xs text-muted-foreground w-6">#{step.step_order}</span>
                      <span className="flex-1 truncate">{step.subject || step.channel || "Step"}</span>
                      <span className="text-xs text-muted-foreground">
                        {step.delay_days > 0 ? `${step.delay_days}d` : ""}{step.delay_hours > 0 ? `${step.delay_hours}h` : ""}
                      </span>
                      {isDone && <Badge variant="default" className="text-xs">✓</Badge>}
                      {isCurrent && <Badge variant="secondary" className="text-xs">Atual</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Timeline
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {cart.abandoned_at && (
                <p>Abandonado: {format(new Date(cart.abandoned_at), "dd/MM/yyyy HH:mm")} ({formatDistanceToNow(new Date(cart.abandoned_at), { addSuffix: true, locale: pt })})</p>
              )}
              {cart.outreach_started_at && (
                <p>Outreach iniciado: {format(new Date(cart.outreach_started_at), "dd/MM/yyyy HH:mm")}</p>
              )}
              {cart.last_outreach_at && (
                <p>Último outreach: {format(new Date(cart.last_outreach_at), "dd/MM/yyyy HH:mm")}</p>
              )}
              {cart.recovered_at && (
                <p className="text-green-600 font-medium">Recuperado: {format(new Date(cart.recovered_at), "dd/MM/yyyy HH:mm")}</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
