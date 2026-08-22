import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronRight } from "lucide-react";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";

interface StoreCatalogBreadcrumbsProps {
  wsSlug: string;
  storeName?: string;
  categoryName?: string | null;
  search?: string;
}

export function StoreCatalogBreadcrumbs({
  wsSlug,
  storeName = "Loja",
  categoryName,
  search,
}: StoreCatalogBreadcrumbsProps) {
  const base = `${getPublicBaseUrl()}/store/${wsSlug}`;
  const current = search ? `Pesquisa: ${search}` : categoryName || null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: storeName, item: base },
      ...(current ? [{ "@type": "ListItem", position: 2, name: current, item: base }] : []),
    ],
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav aria-label="Navegação estrutural" className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <Link to={`/store/${wsSlug}`} className="hover:text-foreground transition-colors">
          {storeName}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{current || "Catálogo"}</span>
      </nav>
    </>
  );
}
