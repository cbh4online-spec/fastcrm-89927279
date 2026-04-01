import { Helmet } from "react-helmet-async";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";

interface ProductSeoHeadProps {
  product: {
    id: string;
    name: string;
    short_description: string | null;
    sku: string | null;
    currency: string;
    base_price: number;
    category?: string | null;
  };
  storeName: string;
  wsSlug: string;
  pricing: { price: number; isDiscounted?: boolean } | null;
  reviewAvg: number;
  reviewCount: number;
  images: string[];
  primaryIndex: number;
  isOutOfStock: boolean;
}

export function ProductSeoHead({ product, storeName, wsSlug, pricing, reviewAvg, reviewCount, images, primaryIndex, isOutOfStock }: ProductSeoHeadProps) {
  const canonical = `${getPublicBaseUrl()}/store/${wsSlug}/product/${product.id}`;
  const price = (pricing?.price ?? product.base_price).toFixed(2);
  const currency = product.currency || "EUR";
  const description = product.short_description || product.name;
  const image = images[primaryIndex] || images[0];

  const productJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    ...(image ? { image } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
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

  return (
    <Helmet>
      <title>{product.name} | {storeName}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={product.name} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="product" />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={storeName} />
      {image && <meta property="og:image" content={image} />}
      <meta property="product:price:amount" content={price} />
      <meta property="product:price:currency" content={currency} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={product.name} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
    </Helmet>
  );
}
