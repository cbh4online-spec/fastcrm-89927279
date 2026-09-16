export const MAX_STOREFRONT_SEARCH_LENGTH = 100;

export function normalizeStorefrontSearchTerm(value?: string): string {
  return (value || "")
    .trim()
    .slice(0, MAX_STOREFRONT_SEARCH_LENGTH)
    .replace(/[,()%_'"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type SearchableProductReference = {
  sku?: string | null;
  barcode?: string | null;
  saft_product_code?: string | null;
};

export function getMatchingProductReference(
  product: SearchableProductReference,
  searchTerm: string,
  variantReference?: string | null,
): string | null {
  const normalizedSearch = normalizeStorefrontSearchTerm(searchTerm).toLocaleLowerCase("pt-PT");
  if (!normalizedSearch) return null;

  const references = [product.sku, product.barcode, product.saft_product_code, variantReference];
  return references.find((reference) => reference?.toLocaleLowerCase("pt-PT").includes(normalizedSearch)) || null;
}

export function buildStorefrontProductSearchFilter(searchTerm: string, productIds: string[] = []): string {
  const normalizedSearch = normalizeStorefrontSearchTerm(searchTerm);
  const textFilters = [
    `name.ilike.%${normalizedSearch}%`,
    `short_description.ilike.%${normalizedSearch}%`,
    `sku.ilike.%${normalizedSearch}%`,
    `barcode.ilike.%${normalizedSearch}%`,
    `saft_product_code.ilike.%${normalizedSearch}%`,
  ];

  if (productIds.length > 0) {
    textFilters.push(`id.in.(${productIds.join(",")})`);
  }

  return textFilters.join(",");
}