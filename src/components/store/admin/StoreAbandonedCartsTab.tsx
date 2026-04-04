import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Mail, Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

interface StoreAbandonedCartsTabProps {
  workspaceId: string;
  workspaceSlug: string;
}

export function StoreAbandonedCartsTab({ workspaceId, workspaceSlug }: StoreAbandonedCartsTabProps) {
  const { data: carts, isLoading } = useQuery({
    queryKey: ["admin-abandoned-carts", workspaceId],
    queryFn: async () => {
      const { data } = await (supabase.from("checkout_abandoned_carts") as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as any[]) || [];
    },
    enabled: !!workspaceId,
  });

  const handleResendRecovery = async (cartId: string, email: string) => {
    try {
      await supabase.functions.invoke("store-send-recovery-email", {
        body: { cartId, workspaceId },
      });
      toast.success(`Email de recuperação enviado para ${email}`);
    } catch {
      toast.error("Erro ao enviar email de recuperação");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  if (!carts?.length) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">Sem carrinhos abandonados</p>
      </div>
    );
  }

  const totalValue = carts.reduce((sum: number, c: any) => sum + (c.cart_total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{carts.length}</p>
            <p className="text-xs text-muted-foreground">Carrinhos Abandonados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-destructive">€{totalValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Receita Potencial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">€{carts.length > 0 ? (totalValue / carts.length).toFixed(2) : "0.00"}</p>
            <p className="text-xs text-muted-foreground">Valor Médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contacto</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Quando</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carts.map((cart: any) => {
              const items = Array.isArray(cart.cart_items) ? cart.cart_items : [];
              const itemCount = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
              const isRecovered = cart.recovered_at != null;
              const hasEmail = !!cart.customer_email;

              return (
                <TableRow key={cart.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{cart.customer_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{cart.customer_email || cart.customer_phone || "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    €{(cart.cart_total || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(cart.created_at), { locale: pt, addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isRecovered ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200">Recuperado</Badge>
                    ) : cart.recovery_email_sent_at ? (
                      <Badge variant="secondary">Email enviado</Badge>
                    ) : (
                      <Badge variant="outline">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {hasEmail && !isRecovered && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => handleResendRecovery(cart.id, cart.customer_email)}
                        >
                          <Mail className="h-3 w-3" />
                          Recuperar
                        </Button>
                      )}
                      {cart.recovery_token && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            const url = `${window.location.origin}/store/${workspaceSlug}/recover/${cart.recovery_token}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link copiado!");
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
