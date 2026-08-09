import { Helmet } from "react-helmet-async";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";

interface ProductSeoImage {
  url: string;
  alt_text?: string | null;
  seo_filename?: string | null;
  title?: string | null;
  caption?: string | null;
}

interface ProductSeoHeadProps {
  product: {
    id: string;
    name: string;
    short_description: string | null;
    sku: string | null;
    currency: string;
    base_price: number;
    category?: string | null;
    brand?: string | null;
  };
  storeName: string;
  wsSlug: string;
  pricing: { price: number; isDiscounted?: boolean } | null;
  reviewAvg: number;
  reviewCount: number;
  images: string[];
  primaryIndex: number;
  isOutOfStock: boolean;
  /** Rich image metadata for SEO */
  productImages?: ProductSeoImage[];
}

export function ProductSeoHead({ product, storeName, wsSlug, pricing, reviewAvg, reviewCount, images, primaryIndex, isOutOfStock, productImages }: ProductSeoHeadProps) {
  const canonical = `${getPublicBaseUrl()}/store/${wsSlug}/product/${product.id}`;
  const price = (pricing?.price ?? product.base_price).toFixed(2);
  const currency = product.currency || "EUR";
  const description = product.short_description || product.name;
  const primaryImage = images[primaryIndex] || images[0];

  // Fichas incompletas (sem descrição própria ou sem imagem) não devem ser
  // indexadas nem emitir dados estruturados de produto — evita thin content.
  const hasDescription = !!product.short_description && product.short_description.trim().length >= 40;
  const isComplete = hasDescription && !!primaryImage;


  // Build rich image array for JSON-LD
  const imageJsonLd = productImages?.length
    ? productImages.map((img) => ({
        "@type": "ImageObject" as const,
        contentUrl: img.url,
        ...(img.seo_filename ? { name: img.seo_filename } : {}),
        ...(img.caption ? { caption: img.caption } : {}),
        ...(img.alt_text ? { description: img.alt_text } : {}),
      }))
    : images.length
      ? images
      : undefined;

  const productJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    ...(imageJsonLd ? { image: imageJsonLd } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.category ? { category: product.category } : {}),
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: canonical,
    },
    ...(reviewCount > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: reviewAvg.toFixed(1),
        reviewCount,
      },
    } : {}),
  };

  const breadcrumbItems: any[] = [
    { "@type": "ListItem", position: 1, name: storeName, item: `${getPublicBaseUrl()}/store/${wsSlug}` },
  ];
  if (product.category) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: product.category,
      item: `${getPublicBaseUrl()}/store/${wsSlug}?category=${encodeURIComponent(product.category)}`,
    });
  }
  breadcrumbItems.push({
    "@type": "ListItem",
    position: breadcrumbItems.length + 1,
    name: product.name,
    item: canonical,
  });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  // Primary image alt for og:image:alt
  const primaryAlt = productImages?.[primaryIndex]?.alt_text || description;

  return (
    <Helmet>
      <title>{product.name} | {storeName}</title>
      <meta name="description" content={description} />
      {!isComplete && <meta name="robots" content="noindex,follow" />}
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={product.name} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="product" />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={storeName} />
      {primaryImage && <meta property="og:image" content={primaryImage} />}
      {primaryImage && <meta property="og:image:alt" content={primaryAlt} />}
      {primaryImage && <meta property="og:image:width" content="800" />}
      {primaryImage && <meta property="og:image:height" content="800" />}
      {primaryImage && <meta property="og:image:type" content={primaryImage.endsWith(".png") ? "image/png" : "image/jpeg"} />}
      <meta property="product:price:amount" content={price} />
      <meta property="product:price:currency" content={currency} />
      {product.brand && <meta property="product:brand" content={product.brand} />}
      {product.category && <meta property="product:category" content={product.category} />}
      {product.sku && <meta property="product:retailer_item_id" content={product.sku} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={product.name} />
      <meta name="twitter:description" content={description} />
      {primaryImage && <meta name="twitter:image" content={primaryImage} />}
      {primaryImage && <meta name="twitter:image:alt" content={primaryAlt} />}
      {isComplete && <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>}
      <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
    </Helmet>
  );
}
