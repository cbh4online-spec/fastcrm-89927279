import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { useStoreProduct } from "@/hooks/useStoreProducts";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { useStoreTierPricing, getStorePrice } from "@/hooks/useStoreTierPricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBag,
  ArrowLeft,
  Check,
  Package,
  Minus,
  Plus,
  Truck,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function StoreProductPage() {
  const { workspaceSlug, productId } = useParams<{
    workspaceSlug: string;
    productId: string;
  }>();
  const { data: product, isLoading } = useStoreProduct(productId);
  const { addItem } = useStoreCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const wsSlug = workspaceSlug || "";
  const { data: tierPricing } = useStoreTierPricing(wsSlug);
  const isOutOfStock = product?.stock_status === "out_of_stock";
  const pricing = product ? getStorePrice(product.base_price, product.id, tierPricing) : null;

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    const primaryIndex = product.primary_image_index ?? 0;
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: pricing?.price ?? product.base_price,
        currency: product.currency,
        image: product.images?.[primaryIndex] || product.images?.[0],
        sku: product.sku || undefined,
      },
      quantity
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-20 text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Produto não encontrado</h2>
          <Link to={`/store/${wsSlug}`}>
            <Button variant="outline" className="mt-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar à Loja
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const specs = product.specifications || {};

  return (
    <>
      <Helmet>
        <title>{product.name} | Loja</title>
        <meta name="description" content={product.short_description || product.name} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <StoreCartDrawer workspaceSlug={wsSlug} />

        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to={`/store/${wsSlug}`} className="hover:text-foreground transition-colors">
              Loja
            </Link>
            <span>/</span>
            {product.category && (
              <>
                <Link
                  to={`/store/${wsSlug}?category=${product.category}`}
                  className="hover:text-foreground transition-colors"
                >
                  {product.category}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground font-medium truncate">{product.name}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square overflow-hidden rounded-2xl bg-muted border">
                {images.length > 0 ? (
                  <img
                    src={images[selectedImage]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-24 w-24 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={cn(
                        "h-20 w-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all",
                        selectedImage === i
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-muted-foreground/30"
                      )}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                {product.category && (
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {product.category}
                  </p>
                )}
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  {product.name}
                </h1>
                {product.sku && (
                  <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  €{(pricing?.price ?? product.base_price).toFixed(2)}
                </span>
                {pricing?.isDiscounted && (
                  <span className="text-lg text-muted-foreground line-through">€{product.base_price.toFixed(2)}</span>
                )}
                {product.billing_type === "recurring" && (
                  <span className="text-muted-foreground">/mês</span>
                )}
              </div>
              {pricing?.discountLabel && (
                <Badge variant="outline" className="mt-1" style={{ borderColor: tierPricing?.tier?.color || undefined, color: tierPricing?.tier?.color || undefined }}>
                  {pricing.discountLabel}
                </Badge>
              )}

              {product.short_description && (
                <p className="text-muted-foreground leading-relaxed">
                  {product.short_description}
                </p>
              )}

              {/* Stock status */}
              {isOutOfStock ? (
                <Badge variant="secondary">Esgotado</Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <Check className="h-3 w-3 mr-1" />
                  Em stock
                </Badge>
              )}

              <Separator />

              {/* Quantity + Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Quantidade:</span>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full gap-2 text-base h-12"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <ShoppingBag className="h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
              </div>

              {/* Trust signals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  Envio rápido
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  Pagamento seguro
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            {/* Description */}
            {product.commercial_description && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Descrição</h2>
                <div className="prose prose-sm text-muted-foreground max-w-none">
                  <p className="whitespace-pre-wrap">{product.commercial_description}</p>
                </div>
              </div>
            )}

            {/* Benefits */}
            {product.benefits && product.benefits.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Benefícios</h2>
                <ul className="space-y-2">
                  {product.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Specifications */}
          {Object.keys(specs).length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold mb-4">Especificações</h2>
              <div className="border rounded-lg overflow-hidden">
                {Object.entries(specs).map(([key, value], i) => (
                  <div
                    key={key}
                    className={cn(
                      "flex justify-between px-4 py-3 text-sm",
                      i % 2 === 0 ? "bg-muted/30" : "bg-background"
                    )}
                  >
                    <span className="font-medium">{key}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="border-t bg-muted/30 mt-16">
          <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
