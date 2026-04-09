import { useStoreVisitorTracking } from "@/hooks/useStoreVisitorTracking";

interface StoreVisitorTrackerProps {
  workspaceId: string | undefined;
  currentPage: string;
  productId?: string;
}

export function StoreVisitorTracker({ workspaceId, currentPage, productId }: StoreVisitorTrackerProps) {
  const { trackEvent, getScore } = useStoreVisitorTracking({ workspaceId, currentPage, productId });

  // Expose trackEvent and getScore on window for cross-component access (e.g. ChatWidget proactive triggers)
  if (typeof window !== "undefined") {
    window.__fastcrm_visitor = { trackEvent, getScore };
  }

  return null;
}
