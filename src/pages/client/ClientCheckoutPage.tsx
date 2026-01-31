import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientOrders } from "@/hooks/client-portal/useClientOrders";
import { useCart } from "@/contexts/CartContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  CreditCard,
  AlertCircle,
  Loader2,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

export default function ClientCheckoutPage() {
  const navigate = useNavigate();
  const { clientUser } = useClientAuth();
  const { createOrder, addItemToOrder, submitOrder } = useClientOrders(clientUser?.id);
  const { cart, clearCart, itemCount } = useCart();

  const [clientNotes, setClientNotes] = useState("");
  const [installmentRequested, setInstallmentRequested] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installmentNotes, setInstallmentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  if (itemCount === 0 && !isComplete) {
    return (
      <ClientLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Carrinho Vazio</h1>
          <p className="text-muted-foreground mb-6">
            Adicione produtos ao carrinho antes de finalizar.
          </p>
          <Link to="/client/catalog">
            <Button size="lg">Ver Catálogo</Button>
          </Link>
        </div>
      </ClientLayout>
    );
  }

  if (isComplete && orderNumber) {
    return (
      <ClientLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="h-16 w-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Encomenda Enviada!</h1>
          <p className="text-muted-foreground mb-2">
            A sua encomenda <strong>{orderNumber}</strong> foi enviada com sucesso.
          </p>
          {installmentRequested ? (
            <p className="text-muted-foreground mb-6">
              O seu pedido de pagamento em prestações será analisado pela nossa equipa.
            </p>
          ) : (
            <p className="text-muted-foreground mb-6">
              Receberá um email de confirmação em breve.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/client/orders">
              <Button>Ver Minhas Encomendas</Button>
            </Link>
            <Link to="/client/catalog">
              <Button variant="outline">Continuar a Comprar</Button>
            </Link>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const handleSubmit = async () => {
    if (!clientUser) return;

    setIsSubmitting(true);

    try {
      // 1. Create the order
      const order = await createOrder({
        workspace_id: clientUser.workspace_id,
        client_user_id: clientUser.id,
        client_notes: clientNotes || undefined,
        billing_address: clientUser.billing_address,
        shipping_address: clientUser.shipping_address,
      });

      if (!order) {
        throw new Error("Erro ao criar encomenda");
      }

      // 2. Add items to the order
      for (let i = 0; i < cart.items.length; i++) {
        const item = cart.items[i];
        await addItemToOrder({
          order_note_id: order.id,
          workspace_id: clientUser.workspace_id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku || undefined,
          product_image_url: item.product_image_url || undefined,
          quantity: item.quantity,
          unit_price_net: item.unit_price_net,
          vat_rate: item.vat_rate,
          position: i,
        });
      }

      // 3. Submit the order
      const submitted = await submitOrder(order.id, installmentRequested ? {
        requested: true,
        count: installmentCount,
        notes: installmentNotes,
      } : undefined);

      if (submitted) {
        setOrderNumber(order.order_number);
        setIsComplete(true);
        clearCart();
      }
    } catch (error) {
      console.error("Error submitting order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/client/cart">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Finalizar Encomenda</h1>
            <p className="text-muted-foreground">
              Reveja os detalhes e envie o seu pedido
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.product_name}
                    </span>
                    <span>{item.line_total_gross.toFixed(2)}€</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{cart.total_gross.toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>

            {/* Client Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
                <CardDescription>
                  Adicione notas ou instruções especiais para o seu pedido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ex: Entrega urgente, contactar antes de entregar..."
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Installment Request */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pagamento em Prestações
                </CardTitle>
                <CardDescription>
                  Solicite pagamento faseado (sujeito a aprovação)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="installment-switch">
                    Solicitar pagamento em prestações
                  </Label>
                  <Switch
                    id="installment-switch"
                    checked={installmentRequested}
                    onCheckedChange={setInstallmentRequested}
                  />
                </div>

                {installmentRequested && (
                  <div className="space-y-4 pt-4 border-t">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        O pedido de pagamento em prestações está sujeito a aprovação pela nossa equipa comercial.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="installment-count">Número de prestações</Label>
                      <Input
                        id="installment-count"
                        type="number"
                        min={2}
                        max={12}
                        value={installmentCount}
                        onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 3)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor por prestação: {(cart.total_gross / installmentCount).toFixed(2)}€
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="installment-notes">Justificação / Observações</Label>
                      <Textarea
                        id="installment-notes"
                        placeholder="Indique o motivo do pedido de prestações..."
                        value={installmentNotes}
                        onChange={(e) => setInstallmentNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Dados de Faturação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{clientUser?.name}</p>
                  <p className="text-sm text-muted-foreground">{clientUser?.email}</p>
                  {clientUser?.tax_id && (
                    <p className="text-sm text-muted-foreground">NIF: {clientUser.tax_id}</p>
                  )}
                </div>

                {clientUser?.billing_address && Object.keys(clientUser.billing_address).length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Morada de faturação:</p>
                    <p className="text-muted-foreground">
                      {clientUser.billing_address.street}<br />
                      {clientUser.billing_address.postal_code} {clientUser.billing_address.city}<br />
                      {clientUser.billing_address.country}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (s/ IVA)</span>
                    <span>{cart.total_net.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA</span>
                    <span>{cart.total_vat.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">{cart.total_gross.toFixed(2)}€</span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A enviar...
                    </>
                  ) : (
                    "Enviar Encomenda"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Ao enviar, concorda com os termos e condições de venda.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
