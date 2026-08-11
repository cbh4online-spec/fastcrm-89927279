type StorefrontNavigableItem = {
  id: string;
  store_slug?: string | null;
  _isC2C?: boolean | null;
};

export function getStorefrontItemPath(workspaceSlug: string, item: StorefrontNavigableItem) {
  if (item._isC2C) {
    return `/marketplace/${workspaceSlug}/listing/${item.id}`;
  }

  // Prefere o slug público (SEO); recorre ao ID quando ainda não existe.
  return `/store/${workspaceSlug}/product/${item.store_slug || item.id}`;
}
