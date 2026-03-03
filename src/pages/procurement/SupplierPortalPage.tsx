import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CheckCircle2, Building2, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface QuoteEntry {
  rfq_item_id: string;
  unit_price: string;
  discount_percent: string;
  vat_percent: string;
  lead_time_days: string;
  min_order_qty: string;
  pack_size: string;
  notes: string;
}

export default function SupplierPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [quoteEntries, setQuoteEntries] = useState<Record<string, QuoteEntry>>({});

  useEffect(() => {
    if (!token) return;
    loadPortalData();
  }, [token]);

  const loadPortalData = async () => {
    try {
      const { data: result, error: err } = await supabase.functions.invoke("rfq-supplier-portal-token", {
        body: { action: "validate", token },
      });
      if (err) throw err;
      if (result?.error) throw new Error(result.error);

      setData(result);

      // Pre-fill with existing quotes
      const entries: Record<string, QuoteEntry> = {};
      (result.items || []).forEach((item: any) => {
        const existing = (result.existing_quotes || []).find((q: any) => q.rfq_item_id === item.id);
        entries[item.id] = {
          rfq_item_id: item.id,
          unit_price: existing ? String(existing.unit_price) : "",
          discount_percent: existing ? String(existing.discount_percent || 0) : "0",
          vat_percent: existing ? String(existing.vat_percent || 23) : "23",
          lead_time_days: existing?.lead_time_days ? String(existing.lead_time_days) : "",
          min_order_qty: existing?.min_order_qty ? String(existing.min_order_qty) : "",
          pack_size: existing?.pack_size ? String(existing.pack_size) : "",
          notes: existing?.notes || "",
        };
      });
      setQuoteEntries(entries);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const quotesToSubmit = Object.values(quoteEntries)
      .filter(q => q.unit_price && Number(q.unit_price) > 0)
      .map(q => ({
        rfq_item_id: q.rfq_item_id,
        unit_price: Number(q.unit_price),
        discount_percent: Number(q.discount_percent) || 0,
        vat_percent: Number(q.vat_percent) || 23,
        lead_time_days: q.lead_time_days ? Number(q.lead_time_days) : null,
        min_order_qty: q.min_order_qty ? Number(q.min_order_qty) : null,
        pack_size: q.pack_size ? Number(q.pack_size) : null,
        notes: q.notes || null,
      }));

    if (!quotesToSubmit.length) {
      toast.error("Preencha pelo menos um preço unitário.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: result, error: err } = await supabase.functions.invoke("rfq-submit-quote", {
        body: { token, quotes: quotesToSubmit },
      });
      if (err) throw err;
      if (result?.error) throw new Error(result.error);
      setSubmitted(true);
      toast.success("Cotação enviada com sucesso!");
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const updateEntry = (itemId: string, field: keyof QuoteEntry, value: string) => {
    setQuoteEntries(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Erro</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Cotação Enviada!</h2>
            <p className="text-muted-foreground">
              A sua proposta foi registada com sucesso. Será contactado após a análise das cotações.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rfq = data?.rfq;
  const items = data?.items || [];
  const ws = data?.workspace;
  const supplier = data?.rfq_supplier?.suppliers;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Pedido de Cotação</h1>
              <p className="text-muted-foreground mt-1">{rfq?.title}</p>
            </div>
            <Badge variant="secondary" className="text-sm">{rfq?.status}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Buyer info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Dados do Comprador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {ws?.company_name && (
                <div><span className="text-muted-foreground">Empresa:</span> <span className="font-medium">{ws.company_name}</span></div>
              )}
              {ws?.tax_id && (
                <div><span className="text-muted-foreground">NIF:</span> <span className="font-medium">{ws.tax_id}</span></div>
              )}
              {rfq?.payment_terms && (
                <div><span className="text-muted-foreground">Cond. Pagamento:</span> <span className="font-medium">{rfq.payment_terms}</span></div>
              )}
              {rfq?.delivery_location && (
                <div><span className="text-muted-foreground">Local Entrega:</span> <span className="font-medium">{rfq.delivery_location}</span></div>
              )}
              {rfq?.currency && (
                <div><span className="text-muted-foreground">Moeda:</span> <span className="font-medium">{rfq.currency}</span></div>
              )}
              {rfq?.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Prazo:</span> <span className="font-medium">{rfq.due_date}</span>
                </div>
              )}
              {rfq?.incoterm && (
                <div><span className="text-muted-foreground">Incoterm:</span> <span className="font-medium">{rfq.incoterm}</span></div>
              )}
              {rfq?.quote_validity_days && (
                <div><span className="text-muted-foreground">Validade:</span> <span className="font-medium">{rfq.quote_validity_days} dias</span></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supplier welcome */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm">
            Estimado(a) <strong>{supplier?.name || "Fornecedor"}</strong>, preencha os campos abaixo com a sua proposta para cada item.
          </p>
        </div>

        {/* Items + Quote form */}
        <Card>
          <CardHeader>
            <CardTitle>Itens — Preencha a sua Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item: any, idx: number) => {
              const entry = quoteEntries[item.id];
              if (!entry) return null;
              return (
                <div key={item.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground mr-2">#{item.line_number || idx + 1}</span>
                      <span className="font-medium">{item.products?.name || "Produto"}</span>
                      {item.products?.sku && <span className="text-muted-foreground text-sm ml-2">({item.products.sku})</span>}
                    </div>
                    <Badge variant="outline">Qtd: {item.qty} {item.unit || "un"}</Badge>
                  </div>
                  {item.spec_notes && (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{item.spec_notes}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Preço Unitário *</Label>
                      <Input
                        type="number" step="0.01" placeholder="0.00"
                        value={entry.unit_price}
                        onChange={e => updateEntry(item.id, "unit_price", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Desconto %</Label>
                      <Input
                        type="number" step="0.1" placeholder="0"
                        value={entry.discount_percent}
                        onChange={e => updateEntry(item.id, "discount_percent", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">IVA %</Label>
                      <Input
                        type="number" step="1" placeholder="23"
                        value={entry.vat_percent}
                        onChange={e => updateEntry(item.id, "vat_percent", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Lead Time (dias)</Label>
                      <Input
                        type="number" placeholder="—"
                        value={entry.lead_time_days}
                        onChange={e => updateEntry(item.id, "lead_time_days", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">MOQ</Label>
                      <Input
                        type="number" placeholder="—"
                        value={entry.min_order_qty}
                        onChange={e => updateEntry(item.id, "min_order_qty", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pack Size</Label>
                      <Input
                        type="number" placeholder="—"
                        value={entry.pack_size}
                        onChange={e => updateEntry(item.id, "pack_size", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Notas</Label>
                      <Textarea
                        placeholder="Observações..."
                        value={entry.notes}
                        onChange={e => updateEntry(item.id, "notes", e.target.value)}
                        className="h-9 min-h-[36px]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar Cotação
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16">
        <Separator className="mb-0" />
        <div className="bg-muted/30 py-8">
          <div className="max-w-5xl mx-auto px-4 text-center space-y-3">
            <a
              href="https://fastcrm.lovable.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              ⚡ FastCRM OS
            </a>
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
              AI Revenue Operating System
            </p>
            <p className="text-[10px] text-muted-foreground/70 pt-2">
              Este link é pessoal e não deve ser partilhado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
