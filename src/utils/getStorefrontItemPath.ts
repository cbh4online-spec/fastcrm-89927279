type StorefrontNavigableItem = {
  id: string;
  _isC2C?: boolean | null;
};

export function getStorefrontItemPath(workspaceSlug: string, item: StorefrontNavigableItem) {
  if (item._isC2C) {
    return `/marketplace/${workspaceSlug}/listing/${item.id}`;
  }

  return `/store/${workspaceSlug}/product/${item.id}`;
}