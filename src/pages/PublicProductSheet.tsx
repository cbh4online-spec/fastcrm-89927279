import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Check,
  Mail,
  Calendar,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useProductPdfExport } from "@/hooks/useProductPdfExport";

export default function PublicProductSheet() {
  const { slug } = useParams<{ slug: string }>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { generatePdf, isGenerating } = useProductPdfExport();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["public-product", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug não fornecido");

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          workspace:workspaces(id, name)
        `)
        .eq("sheet_slug", slug)
        .eq("sheet_published", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: images = [] } = useQuery({
    queryKey: ["public-product-images", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];

      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", product.id)
        .order("position");

      if (error) throw error;
      return data;
    },
    enabled: !!product?.id,
  });

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDownloadPdf = async () => {
    if (!product) return;
    
    const workspace = product.workspace as any;
    await generatePdf(product as any, images as any, {
      id: workspace?.id || "",
      name: workspace?.name || "Empresa",
      email: null,
      phone: null,
      website: null,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Produto não encontrado</h1>
        <p className="text-muted-foreground text-center">
          Este produto não está disponível ou foi desativado.
        </p>
      </div>
    );
  }

  const benefits = product.benefits || [];
  const workspaceName = (product.workspace as any)?.name || "Empresa";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-semibold">{workspaceName}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleDownloadPdf}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descarregar PDF
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {images.length > 0 ? (
              <>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                  <img
                    src={images[currentImageIndex]?.url}
                    alt={images[currentImageIndex]?.alt_text || product.name}
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                        onClick={handlePrevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentImageIndex
                            ? "border-primary"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.alt_text || `Imagem ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[4/3] rounded-xl bg-muted flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            <div>
              {product.category && (
                <Badge variant="secondary" className="mb-2">
                  {product.category}
                </Badge>
              )}
              <h1 className="text-3xl font-bold">{product.name}</h1>
              
              {product.base_price > 0 && (
                <p className="text-3xl font-bold text-primary mt-2">
                  {formatCurrency(product.base_price, product.currency)}
                </p>
              )}
            </div>

            {product.short_description && (
              <p className="text-muted-foreground text-lg">
                {product.short_description}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 gap-2">
                <Mail className="h-5 w-5" />
                Pedir Proposta
              </Button>
              <Button size="lg" variant="outline" className="flex-1 gap-2">
                <Calendar className="h-5 w-5" />
                Marcar Reunião
              </Button>
            </div>

            <Separator />

            {/* Commercial Description */}
            {product.commercial_description && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Descrição</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap">{product.commercial_description}</p>
                </div>
              </div>
            )}

            {/* Benefits */}
            {benefits.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Benefícios</h2>
                <ul className="space-y-2">
                  {benefits.map((benefit: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conditions */}
            {product.conditions && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Condições</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {product.conditions}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {workspaceName}. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
