import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  X, Edit3, Archive, Share2, Loader2, Package, ImageOff, ExternalLink,
  Tag, CircleDollarSign, Boxes, Layers, FileText, History, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProduct } from "@/hooks/useProducts";
import { haptics } from "@/hooks/useHaptics";
import { ProductDetailDialog } from "../ProductDetailDialog";
import { useCanViewCostMargin } from "@/hooks/useCanViewCostMargin";

interface MobileProductDetailSheetProps {
  productId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  formatCurrency: (n: number) => string;
}

type MobileTab = "overview" | "pricing" | "stock" | "variants" | "images" | "more";

const TABS: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Visão", icon: <Tag className="h-3.5 w-3.5" /> },
  { id: "pricing", label: "Preço", icon: <CircleDollarSign className="h-3.5 w-3.5" /> },
  { id: "stock", label: "Stock", icon: <Boxes className="h-3.5 w-3.5" /> },
  { id: "variants", label: "Variantes", icon: <Layers className="h-3.5 w-3.5" /> },
  { id: "images", label: "Imagens", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "more", label: "Mais", icon: <Settings2 className="h-3.5 w-3.5" /> },
];

export function MobileProductDetailSheet({
  productId, open, onClose, onEdit, onArchive, formatCurrency,
}: MobileProductDetailSheetProps) {
  const [tab, setTab] = useState<MobileTab>("overview");
  const [fullDialogOpen, setFullDialogOpen] = useState(false);
  const { data: product, isLoading } = useProduct(productId ?? undefined);
  const canViewCostMargin = useCanViewCostMargin();

  const handleShare = async () => {
    if (!product) return;
    haptics.tap();
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name} — ${formatCurrency((product as any).base_price ?? 0)}`,
        });
      } catch { /* user cancel */ }
    }
  };

  const images = ((product as any)?.images as string[] | undefined) ?? [];
  const primaryIdx = (product as any)?.primary_image_index ?? 0;
  const heroImg = images[primaryIdx] ?? images[0] ?? null;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="h-[100dvh] w-full p-0 border-0 rounded-none safe-area-pt"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{product?.name ?? "Produto"}</SheetTitle>
          </SheetHeader>

          {/* Sticky top bar */}
          <div className="flex items-center gap-1 h-14 px-2 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar" className="h-10 w-10">
              <X className="h-5 w-5" />
            </Button>
            <h2 className="flex-1 text-base font-semibold truncate px-1">
              {product?.name ?? "…"}
            </h2>
            <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Partilhar" className="h-10 w-10">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar" className="h-10 w-10">
              <Edit3 className="h-5 w-5" />
            </Button>
          </div>

          <div className="overflow-auto h-[calc(100dvh-3.5rem)] pb-24">
            {isLoading || !product ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Hero */}
                <div className="relative aspect-square bg-muted w-full max-h-[50vh] flex items-center justify-center overflow-hidden">
                  {heroImg ? (
                    <img src={heroImg} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-12 w-12 text-muted-foreground" />
                  )}
                  {(product as any).status === "archived" && (
                    <Badge variant="outline" className="absolute top-3 left-3 bg-background/90">
                      Arquivado
                    </Badge>
                  )}
                </div>

                {/* Title + Price */}
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-lg font-bold leading-tight">{product.name}</h1>
                      {(product as any).sku && (
                        <p className="text-xs text-muted-foreground mt-0.5">SKU: {(product as any).sku}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold tabular-nums">
                        {formatCurrency((product as any).base_price ?? 0)}
                      </div>
                      {canViewCostMargin && (product as any).direct_cost != null && (
                        <div className="text-[11px] text-muted-foreground">
                          Custo: {formatCurrency((product as any).direct_cost)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[11px]">
                      <Package className="h-3 w-3 mr-1" />
                      {(product as any).product_type ?? "—"}
                    </Badge>
                    {(product as any).category && (
                      <Badge variant="outline" className="text-[11px]">
                        {(product as any).category}
                      </Badge>
                    )}
                    {(product as any).store_published && (
                      <Badge variant="outline" className="text-[11px] border-green-500/40 text-green-600">
                        Loja
                      </Badge>
                    )}
                    {(product as any).b2b_published && (
                      <Badge variant="outline" className="text-[11px] border-blue-500/40 text-blue-600">
                        B2B
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Sticky tabs */}
                <ScrollArea className="w-full sticky top-14 z-10 border-y border-border bg-background">
                  <div className="flex gap-1 px-2 py-1">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { haptics.tap(); setTab(t.id); }}
                        className={cn(
                          "shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          tab === t.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {t.icon}{t.label}
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>

                {/* Tab content */}
                <div className="px-4 py-4 space-y-4">
                  {tab === "overview" && (
                    <>
                      {(product as any).description && (
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descrição</h3>
                          <p className="text-sm whitespace-pre-wrap">{(product as any).description}</p>
                        </div>
                      )}
                      <KVRow label="Tipo" value={(product as any).product_type} />
                      <KVRow label="Estado" value={(product as any).status} />
                      <KVRow label="Cobrança" value={(product as any).billing_type} />
                      <KVRow label="Categoria" value={(product as any).category} />
                    </>
                  )}

                  {tab === "pricing" && (
                    <>
                      <KVRow label="Preço base" value={formatCurrency((product as any).base_price ?? 0)} />
                      <KVRow label="Custo direto" value={(product as any).direct_cost != null ? formatCurrency((product as any).direct_cost) : "—"} />
                      <KVRow label="Custo operacional" value={(product as any).operational_cost != null ? formatCurrency((product as any).operational_cost) : "—"} />
                      <KVRow label="IVA estimado" value={(product as any).tax_rate_estimate_pct != null ? `${(product as any).tax_rate_estimate_pct}%` : "—"} />
                      <KVRow label="Comissão" value={(product as any).commission_default != null ? `${(product as any).commission_default}%` : "—"} />
                    </>
                  )}

                  {tab === "stock" && (
                    <>
                      <KVRow label="Stock total" value={(product as any).total_units ?? "—"} />
                      <KVRow label="Modo de entrega" value={(product as any).delivery_mode ?? "—"} />
                      <KVRow label="Validade" value={(product as any).validity_days ? `${(product as any).validity_days} dias` : "—"} />
                    </>
                  )}

                  {tab === "variants" && (
                    <EmptyTabHint
                      icon={<Layers className="h-7 w-7" />}
                      title="Gestão de variantes"
                      hint="Abra a ficha completa para gerir variantes, atributos e SKUs derivados."
                      onOpenFull={() => setFullDialogOpen(true)}
                    />
                  )}

                  {tab === "images" && (
                    <>
                      {images.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          <ImageOff className="h-8 w-8 mx-auto mb-2" />
                          Sem imagens
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {images.map((src, i) => (
                            <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                              <img src={src} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {tab === "more" && (
                    <EmptyTabHint
                      icon={<History className="h-7 w-7" />}
                      title="Histórico, documentos, relações…"
                      hint="Estas secções avançadas estão disponíveis na ficha completa."
                      onOpenFull={() => setFullDialogOpen(true)}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom action bar */}
          {product && (
            <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur px-3 py-2 safe-area-pb flex gap-2 z-20">
              <Button
                variant="outline"
                onClick={() => { haptics.tap(); onArchive(); }}
                className="flex-1"
              >
                <Archive className="h-4 w-4 mr-1.5" />
                {(product as any).status === "archived" ? "Repor" : "Arquivar"}
              </Button>
              <Button onClick={() => { haptics.tap(); setFullDialogOpen(true); }} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-1.5" />Ficha completa
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Lazy: ficha completa com todas as funcionalidades */}
      {fullDialogOpen && productId && (
        <ProductDetailDialog
          open={fullDialogOpen}
          onOpenChange={(o) => setFullDialogOpen(o)}
          productId={productId}
        />
      )}
    </>
  );
}

function KVRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] truncate">{value || "—"}</span>
    </div>
  );
}

function EmptyTabHint({
  icon, title, hint, onOpenFull,
}: { icon: React.ReactNode; title: string; hint: string; onOpenFull: () => void }) {
  return (
    <div className="text-center py-8 px-4">
      <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">{hint}</p>
      <Button variant="outline" size="sm" onClick={onOpenFull}>
        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Abrir ficha completa
      </Button>
    </div>
  );
}
