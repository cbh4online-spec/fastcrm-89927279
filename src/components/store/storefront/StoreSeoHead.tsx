import { Helmet } from "react-helmet-async";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import type { StoreSettings } from "@/hooks/useStoreSettings";

interface StoreSeoHeadProps {
  storeName: string;
  wsSlug: string;
  storeSettings: StoreSettings | null | undefined;
}

export function StoreSeoHead({ storeName, wsSlug, storeSettings }: StoreSeoHeadProps) {
  const canonical = `${getPublicBaseUrl()}/store/${wsSlug}`;
  const description = storeSettings?.store_description || "Explore os nossos produtos e serviços";

  return (
    <Helmet>
      <title>{storeName} | FastCRM</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={`${storeName} | FastCRM`} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="FastCRM" />
      {(storeSettings?.banner_url || storeSettings?.logo_url) && (
        <meta property="og:image" content={storeSettings.banner_url || storeSettings.logo_url!} />
      )}
      <meta name="twitter:card" content="summary_large_image" />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Store",
          "name": storeName,
          "description": storeSettings?.store_description || "",
          "url": canonical,
          ...(storeSettings?.logo_url ? { "logo": storeSettings.logo_url } : {}),
        })}
      </script>
    </Helmet>
  );
}
