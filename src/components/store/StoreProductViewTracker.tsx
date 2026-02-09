import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "store_view_session_id";

function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
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
    if (sessionStorage.getItem(viewKey)) return;
    sessionStorage.setItem(viewKey, "1");

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
