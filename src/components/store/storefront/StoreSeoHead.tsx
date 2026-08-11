import { Helmet } from "react-helmet-async";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import type { StoreSettings } from "@/hooks/useStoreSettings";

interface StoreSeoHeadProps {
  storeName: string;
  wsSlug: string;
  storeSettings: StoreSettings | null | undefined;
  /** Pass all products for ItemList JSON-LD */
  products?: Array<{ id: string; name: string; base_price: number; images?: string[]; primary_image_index?: number | null }>;
}

export function StoreSeoHead({ storeName, wsSlug, storeSettings, products }: StoreSeoHeadProps) {
  const canonical = `${getPublicBaseUrl()}/store/${wsSlug}`;
  const description = storeSettings?.store_description || "Explore os nossos produtos e serviços";
  const ogImage = storeSettings?.banner_url || storeSettings?.logo_url;
  const isBanner = !!storeSettings?.banner_url;
  const ogWidth = isBanner ? "1200" : "800";
  const ogHeight = isBanner ? "630" : "800";

  // Organization JSON-LD
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: storeName,
    description: storeSettings?.store_description || "",
    url: canonical,
    ...(storeSettings?.logo_url ? { logo: storeSettings.logo_url } : {}),
  };

  // ItemList JSON-LD for product listing (max 30 for SEO)
  const itemListJsonLd = products?.length ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.slice(0, 30).map((p, i) => {
      const img = p.images?.[p.primary_image_index ?? 0] || p.images?.[0];
      return {
        "@type": "ListItem",
        position: i + 1,
        url: `${canonical}/product/${(p as any).store_slug || p.id}`,
        name: p.name,
        ...(img ? { image: img } : {}),
      };
    }),
  } : null;

  return (
    <Helmet>
      <title>{storeName} | FastCRM</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {/* Preconnect for Supabase storage images */}
      <link rel="preconnect" href="https://eumnfkccyvlyoyjchiwe.supabase.co" />
      <link rel="dns-prefetch" href="https://eumnfkccyvlyoyjchiwe.supabase.co" />
      <meta property="og:title" content={`${storeName} | FastCRM`} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="FastCRM" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta property="og:image:width" content={ogWidth} />}
      {ogImage && <meta property="og:image:height" content={ogHeight} />}
      {ogImage && <meta property="og:image:type" content={ogImage.endsWith(".png") ? "image/png" : "image/jpeg"} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${storeName} | FastCRM`} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <script type="application/ld+json">{JSON.stringify(organizationJsonLd)}</script>
      {itemListJsonLd && (
        <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
      )}
    </Helmet>
  );
}
