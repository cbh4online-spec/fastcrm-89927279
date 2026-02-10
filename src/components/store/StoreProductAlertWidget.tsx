import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, TrendingDown, Package, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProductAlerts, useCreateProductAlert, useCancelProductAlert, type AlertType } from "@/hooks/useProductAlerts";
import { cn } from "@/lib/utils";

interface StoreProductAlertWidgetProps {
  productId: string;
  workspaceId: string;
  productName: string;
  currentPrice: number;
  isOutOfStock: boolean;
}

export function StoreProductAlertWidget({
  productId,
  workspaceId,
  productName,
  currentPrice,
  isOutOfStock,
}: StoreProductAlertWidgetProps) {
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<AlertType>(isOutOfStock ? "back_in_stock" : "price_drop");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const { data: alerts = [] } = useProductAlerts(productId, submittedEmail || undefined);
  const createAlert = useCreateProductAlert();
  const cancelAlert = useCancelProductAlert();

  const hasPriceAlert = alerts.some((a) => a.alert_type === "price_drop");
  const hasStockAlert = alerts.some((a) => a.alert_type === "back_in_stock");
  const priceAlertObj = alerts.find((a) => a.alert_type === "price_drop");
  const stockAlertObj = alerts.find((a) => a.alert_type === "back_in_stock");

  const handleSubmit = () => {
    if (!email.trim()) return;
    const tp = activeTab === "price_drop" && targetPrice ? Number(targetPrice) : null;

    createAlert.mutate(
      {
        workspace_id: workspaceId,
        product_id: productId,
        email: email.trim(),
        alert_type: activeTab,
        target_price: tp,
      },
      {
        onSuccess: () => {
          setSubmittedEmail(email.trim().toLowerCase());
          setExpanded(false);
          setTargetPrice("");
        },
      }
    );
  };

  // Compact trigger button
  if (!expanded) {
    const hasAnyAlert = hasPriceAlert || hasStockAlert;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {isOutOfStock && !hasStockAlert ? (
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={() => {
              setActiveTab("back_in_stock");
              setExpanded(true);
            }}
          >
            <Bell className="h-4 w-4" />
            Avisar quando voltar ao stock
          </Button>
        ) : !isOutOfStock && !hasPriceAlert ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setActiveTab("price_drop");
              setExpanded(true);
            }}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            Alerta de descida de preço
          </Button>
        ) : null}

        {/* Show active alerts */}
        {hasAnyAlert && (
          <div className="space-y-1.5 mt-2">
            {hasPriceAlert && priceAlertObj && (
              <div className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">
                    Alerta de preço ativo
                    {priceAlertObj.target_price ? ` (≤ €${priceAlertObj.target_price.toFixed(2)})` : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground"
                  onClick={() => cancelAlert.mutate({ alertId: priceAlertObj.id, productId })}
                >
                  <BellOff className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
            {hasStockAlert && stockAlertObj && (
              <div className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Alerta de stock ativo</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground"
                  onClick={() => cancelAlert.mutate({ alertId: stockAlertObj.id, productId })}
                >
                  <BellOff className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // Expanded form
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="border rounded-xl p-4 space-y-3 bg-muted/20"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-primary" />
            Criar Alerta
          </h4>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(false)}>
            Cancelar
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AlertType)}>
          <TabsList className="w-full">
            <TabsTrigger value="price_drop" className="flex-1 gap-1 text-xs" disabled={isOutOfStock}>
              <TrendingDown className="h-3.5 w-3.5" />
              Preço
            </TabsTrigger>
            <TabsTrigger value="back_in_stock" className="flex-1 gap-1 text-xs">
              <Package className="h-3.5 w-3.5" />
              Stock
            </TabsTrigger>
          </TabsList>

          <TabsContent value="price_drop" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Preço alvo (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={`Atual: €${currentPrice.toFixed(2)}`}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Será notificado quando o preço baixar{targetPrice ? ` para €${Number(targetPrice).toFixed(2)} ou menos` : ""}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="back_in_stock" className="mt-3">
            <p className="text-xs text-muted-foreground">
              Receberá um email assim que <strong>{productName}</strong> voltar a estar disponível.
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-1.5">
          <Label className="text-xs">O seu email</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
            />
            <Button
              size="sm"
              className="h-9 gap-1.5 flex-shrink-0"
              onClick={handleSubmit}
              disabled={!email.trim() || createAlert.isPending}
            >
              <Mail className="h-3.5 w-3.5" />
              Ativar
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
