import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Search, Loader2, Package, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface InsertPaymentLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
  recipientName?: string;
  onSubjectSuggestion?: (subject: string) => void;
}

function formatCurrency(amount: number | null, currency?: string | null): string {
  if (amount == null) return "N/A";
  const cur = (currency || "EUR").toUpperCase();
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: cur }).format(amount);
}

export function InsertPaymentLinkDialog({ open, onOpenChange, onInsert, recipientName, onSubjectSuggestion }: InsertPaymentLinkDialogProps) {
  const [search, setSearch] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [contextText, setContextText] = useState("");
  const [suggestedSubject, setSuggestedSubject] = useState("");
  const [paymentData, setPaymentData] = useState<{ url: string; name: string; price: string } | null>(null);
  const { currentWorkspace } = useWorkspace();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-for-payment", currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from("products")
        .select("id, name, base_price, currency, status, images, primary_image_index, sku")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .order("name");

      if (search.trim()) {
        query = query.ilike("name", `%${search.trim()}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!currentWorkspace?.id,
  });

  const resetState = () => {
    setSelectedProduct(null);
    setContextText("");
    setPaymentData(null);
    setGeneratingId(null);
    setSuggestedSubject("");
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const handleSelect = async (product: any) => {
    if (!currentWorkspace?.id) return;
    setGeneratingId(product.id);
    setSelectedProduct(product);

    try {
      const { data, error } = await supabase.functions.invoke("create-payment-link", {
        body: { productId: product.id, workspaceId: currentWorkspace.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const name = data.productName || product.name;
      const price = formatCurrency(data.price ?? product.base_price, data.currency ?? product.currency);

      setPaymentData({ url: data.url, name, price });
      const greeting = recipientName ? `Caro(a) ${recipientName},\n\n` : "";
      setContextText(`${greeting}Segue o link para efetuar o pagamento de ${name}:`);
      setSuggestedSubject(`Link de Pagamento - ${name}`);
    } catch (err: any) {
      console.error("Error creating payment link:", err);
      toast.error(`Erro ao gerar link: ${err.message}`);
      resetState();
    } finally {
      setGeneratingId(null);
    }
  };

  const handleInsert = () => {
    if (!paymentData) return;

    const textLines = contextText.trim().split("\n").filter(Boolean);
    const textHtml = textLines.length
      ? textLines.map(line => `<p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">${line}</p>`).join("")
      : "";

    const html = `${textHtml}<div style="margin: 1em 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; max-width: 400px; font-family: sans-serif;">
  <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">💳 Link de Pagamento</div>
  <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 4px;">${paymentData.name}</div>
  <div style="font-size: 18px; font-weight: 700; color: #059669; margin-bottom: 12px;">${paymentData.price}</div>
  <a href="${paymentData.url}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">Pagar Agora →</a>
</div>`;

    if (suggestedSubject.trim() && onSubjectSuggestion) {
      onSubjectSuggestion(suggestedSubject.trim());
    }

    onInsert(html);
    handleOpenChange(false);
    toast.success("Link de pagamento inserido no email");
  };

  const showConfirmStep = !!paymentData && !!selectedProduct;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showConfirmStep && (
              <button onClick={resetState} className="hover:bg-muted rounded p-1 -ml-1 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <CreditCard className="w-5 h-5 text-primary" />
            {showConfirmStep ? "Personalizar Mensagem" : "Inserir Link de Pagamento"}
          </DialogTitle>
          <DialogDescription>
            {showConfirmStep
              ? "Adicione um texto introdutório ao link de pagamento"
              : "Selecione um produto para gerar um link de pagamento"}
          </DialogDescription>
        </DialogHeader>

        {showConfirmStep ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Assunto sugerido</label>
              <Input
                value={suggestedSubject}
                onChange={(e) => setSuggestedSubject(e.target.value)}
                placeholder="Ex: Link de Pagamento - Produto"
              />
              <p className="text-xs text-muted-foreground mt-1">Só será aplicado se o assunto do email estiver vazio</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Texto introdutório</label>
              <Textarea
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                placeholder="Ex: Segue o link para efetuar o pagamento..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">Pré-visualização do card:</div>
              <div className="text-sm font-semibold">{paymentData.name}</div>
              <div className="text-base font-bold text-emerald-600">{paymentData.price}</div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetState}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleInsert}>
                Inserir no Email
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar produtos..."
                className="pl-9"
              />
            </div>

            <ScrollArea className="max-h-[320px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !products?.length ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Nenhum produto encontrado
                </div>
              ) : (
                <div className="space-y-1">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelect(product)}
                      disabled={generatingId !== null}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {product.images?.[product.primary_image_index ?? 0] ? (
                          <img
                            src={product.images[product.primary_image_index ?? 0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{product.name}</div>
                        {product.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold text-primary">
                          {formatCurrency(product.base_price, product.currency)}
                        </div>
                        {generatingId === product.id && (
                          <Loader2 className="w-4 h-4 animate-spin ml-auto mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}