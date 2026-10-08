import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateSessionId, safeStorageGet, safeStorageSet } from "@/lib/browser/safeBrowser";

const SESSION_KEY = "store_view_session_id";

function getSessionId(): string {
  return getOrCreateSessionId(SESSION_KEY);
}

interface StoreProductViewTrackerProps {
  productId: string;
  workspaceId: string;
}

export function StoreProductViewTracker({ productId, workspaceId }: StoreProductViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || !productId || !workspaceId) return;
    tracked.current = true;

    const sessionId = getSessionId();
    const viewKey = `store_view_${sessionId}_${productId}`;
    
    // Debounce: only track once per session per product
    if (safeStorageGet("session", viewKey)) return;
    safeStorageSet("session", viewKey, "1");

    supabase
      .from("store_page_views" as any)
      .insert({
        workspace_id: workspaceId,
        product_id: productId,
        session_id: sessionId,
      })
      .then(() => {});
  }, [productId, workspaceId]);

  return null;
}
