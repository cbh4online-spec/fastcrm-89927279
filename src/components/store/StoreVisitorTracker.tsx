import { useStoreVisitorTracking } from "@/hooks/useStoreVisitorTracking";

interface StoreVisitorTrackerProps {
  workspaceId: string | undefined;
  currentPage: string;
  productId?: string;
}

export function StoreVisitorTracker({ workspaceId, currentPage, productId }: StoreVisitorTrackerProps) {
  useStoreVisitorTracking({ workspaceId, currentPage, productId });
  return null;
}
