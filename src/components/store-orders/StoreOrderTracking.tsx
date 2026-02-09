import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, ExternalLink, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

const CARRIERS = [
  { value: "ctt", label: "CTT", urlTemplate: "https://www.ctt.pt/feapl_2/app/open/cttexpresso/objectSearch/objectSearch.jspx?objects={tracking}" },
  { value: "dpd", label: "DPD", urlTemplate: "https://tracking.dpd.de/status/pt_PT/parcel/{tracking}" },
  { value: "gls", label: "GLS", urlTemplate: "https://gls-group.com/PT/pt/rastreio-de-envios?match={tracking}" },
  { value: "ups", label: "UPS", urlTemplate: "https://www.ups.com/track?tracknum={tracking}" },
  { value: "fedex", label: "FedEx", urlTemplate: "https://www.fedex.com/fedextrack/?trknbr={tracking}" },
  { value: "dhl", label: "DHL", urlTemplate: "https://www.dhl.com/pt-pt/home/rastreio.html?tracking-id={tracking}" },
  { value: "other", label: "Outro", urlTemplate: "" },
];

interface StoreOrderTrackingProps {
  orderId: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  trackingAddedAt: string | null;
  customerEmail: string;
  customerName: string;
  orderNumber: string | null;
}

export function StoreOrderTracking({
  orderId,
  trackingNumber,
  trackingCarrier,
  trackingUrl,
  trackingAddedAt,
  customerEmail,
  customerName,
  orderNumber,
}: StoreOrderTrackingProps) {
  const queryClient = useQueryClient();
  const [carrier, setCarrier] = useState(trackingCarrier || "");
  const [number, setNumber] = useState(trackingNumber || "");
  const [url, setUrl] = useState(trackingUrl || "");
  const [isEditing, setIsEditing] = useState(!trackingNumber);

  const saveTracking = useMutation({
    mutationFn: async () => {
      const carrierConfig = CARRIERS.find((c) => c.value === carrier);
      const finalUrl = url || (carrierConfig?.urlTemplate ? carrierConfig.urlTemplate.replace("{tracking}", number) : "");

      const { error } = await supabase
        .from("store_orders")
        .update({
          tracking_number: number || null,
          tracking_carrier: carrier || null,
          tracking_url: finalUrl || null,
          tracking_added_at: new Date().toISOString(),
          shipped_at: new Date().toISOString(),
          status: "shipped",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      // Send tracking notification email
      if (number) {
        try {
          await supabase.functions.invoke("send-tracking-notification", {
            body: {
              orderId,
              customerEmail,
              customerName,
              orderNumber,
              trackingNumber: number,
              trackingCarrier: carrierConfig?.label || carrier,
              trackingUrl: finalUrl,
            },
          });
        } catch (emailErr) {
          console.error("Email notification failed:", emailErr);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["store-order-events", orderId] });
      toast.success("Tracking atualizado e cliente notificado");
      setIsEditing(false);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  // Auto-fill URL when carrier/number change
  const handleCarrierChange = (value: string) => {
    setCarrier(value);
    const carrierConfig = CARRIERS.find((c) => c.value === value);
    if (carrierConfig?.urlTemplate && number) {
      setUrl(carrierConfig.urlTemplate.replace("{tracking}", number));
    }
  };

  const handleNumberChange = (value: string) => {
    setNumber(value);
    const carrierConfig = CARRIERS.find((c) => c.value === carrier);
    if (carrierConfig?.urlTemplate && value) {
      setUrl(carrierConfig.urlTemplate.replace("{tracking}", value));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Tracking
          {trackingNumber && !isEditing && (
            <Badge variant="outline" className="ml-auto text-green-600">Adicionado</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Transportadora</Label>
              <Select value={carrier} onValueChange={handleCarrierChange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nº de Tracking</Label>
              <Input value={number} onChange={(e) => handleNumberChange(e.target.value)} placeholder="Ex: CT123456789PT" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL de rastreio (auto-preenchido)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="text-xs" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveTracking.mutate()} disabled={saveTracking.isPending || !number.trim()} className="gap-1.5">
                {saveTracking.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Guardar e Notificar
              </Button>
              {trackingNumber && (
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Transportadora</span>
              <span className="font-medium">{CARRIERS.find((c) => c.value === trackingCarrier)?.label || trackingCarrier}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nº Tracking</span>
              <span className="font-mono text-xs">{trackingNumber}</span>
            </div>
            {trackingUrl && (
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-xs">
                <ExternalLink className="h-3 w-3" /> Rastrear encomenda
              </a>
            )}
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="mt-2 w-full">
              Editar Tracking
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
